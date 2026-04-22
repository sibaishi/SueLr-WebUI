import { isServerAvailable, serverSaveImage } from './serverStorage';

const DB_NAME = 'ai_gallery';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dataURLtoBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function isDataURL(s: string): boolean { return s.startsWith('data:'); }

/** Resolve any URL to a form the API can access:
 * - data: URLs → use as-is
 * - http(s): URLs → use as-is (API server can access)
 * - blob: URLs → fetch blob → convert back to data: URL
 */
export async function resolveToDataURL(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  // localhost / 127.0.0.1 URLs are not accessible by external APIs — convert to base64
  const isLocalhost = url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
  if (url.startsWith('http') && !isLocalhost) return url;
  if (url.startsWith('blob:') || isLocalhost) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch { return url; }
  }
  return url;
}

async function storeInIndexedDB(id: string, data: string | Blob): Promise<string> {
  const blob = typeof data === 'string' ? dataURLtoBlob(data) : data;
  const url = URL.createObjectURL(blob);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, blob });
    tx.oncomplete = () => { db.close(); resolve(url); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Process a list of image URLs:
 * - Server available: base64 → save to server → get persistent local URL
 * - Server unavailable: base64 → save to IndexedDB → get blob URL
 * - HTTP URLs pass through unchanged
 */
export async function processImages(urls: string[], prefix: string, prompt = '', model = ''): Promise<{ urls: string[]; storedIds: string[] }> {
  const result: string[] = [];
  const storedIds: string[] = [];
  const useServer = isServerAvailable();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (isDataURL(url)) {
      const id = `${prefix}_${i}`;
      if (useServer) {
        const localUrl = await serverSaveImage({ id, data: url, prompt, model, ts: Date.now() });
        if (localUrl) {
          result.push(localUrl);
        } else {
          result.push(await storeInIndexedDB(id, url));
        }
      } else {
        result.push(await storeInIndexedDB(id, url));
      }
      storedIds.push(id);
    } else {
      result.push(url);
    }
  }
  return { urls: result, storedIds };
}
