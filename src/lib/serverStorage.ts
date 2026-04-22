// Server storage API client — communicates with the local backend for persistent storage
let _available = false;
const API = '/api';

export function isServerAvailable(): boolean { return _available; }

export async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/status`, { signal: AbortSignal.timeout(2000) } as RequestInit);
    const data = await res.json();
    _available = !!data.ok;
  } catch (e) {
    _available = false;
    console.warn('[ServerStorage] check failed:', e);
  }
  return _available;
}

// ---- Conversations ----
export async function serverLoadConversations(): Promise<any[]> {
  if (!_available) return [];
  try {
    const r = await fetch(`${API}/conversations`);
    return await r.json();
  } catch (e) { console.warn('[ServerStorage] load convs failed:', e); return []; }
}

import type { Conv } from './types';

export async function serverSaveConversations(convs: Conv[]): Promise<void> {
  if (!_available || convs.length === 0) return;
  try {
    await fetch(`${API}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convs),
    });
  } catch (e) { console.warn('[ServerStorage] save convs failed:', e); }
}

export async function serverDeleteConversation(id: string): Promise<void> {
  if (!_available) return;
  try {
    await fetch(`${API}/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) { console.warn('[ServerStorage] delete conv failed:', e); }
}

// ---- Images (Gallery) ----
export async function serverSaveImage(item: { id: string; data?: string; url?: string; prompt: string; model: string; ts: number }): Promise<string | null> {
  if (!_available) return null;
  try {
    const r = await fetch(`${API}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const d = await r.json();
    return d.localUrl || null;
  } catch (e) { console.warn('[ServerStorage] save image failed:', e); return null; }
}

export async function serverLoadGallery(): Promise<any[]> {
  if (!_available) return [];
  try {
    const r = await fetch(`${API}/images`);
    return await r.json();
  } catch (e) { console.warn('[ServerStorage] load gallery failed:', e); return []; }
}

export async function serverClearGallery(): Promise<void> {
  if (!_available) return;
  try { await fetch(`${API}/images`, { method: 'DELETE' }); }
  catch (e) { console.warn('[ServerStorage] clear gallery failed:', e); }
}

// ---- Videos ----
export async function serverSaveVideo(item: { id: string; url: string; prompt: string; model: string; ts: number }): Promise<void> {
  if (!_available) return;
  try {
    await fetch(`${API}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (e) { console.warn('[ServerStorage] save video failed:', e); }
}

export async function serverLoadVideos(): Promise<any[]> {
  if (!_available) return [];
  try {
    const r = await fetch(`${API}/videos`);
    return await r.json();
  } catch (e) { console.warn('[ServerStorage] load videos failed:', e); return []; }
}

export async function serverClearVideos(): Promise<void> {
  if (!_available) return;
  try { await fetch(`${API}/videos`, { method: 'DELETE' }); }
  catch (e) { console.warn('[ServerStorage] clear videos failed:', e); }
}

// ---- Settings ----
export async function serverLoadSettings(): Promise<Record<string, any> | null> {
  if (!_available) return null;
  try {
    const r = await fetch(`${API}/settings`);
    const d = await r.json();
    return Object.keys(d).length > 0 ? d : null;
  } catch (e) { console.warn('[ServerStorage] load settings failed:', e); return null; }
}

export async function serverSaveSettings(settings: Record<string, any>): Promise<void> {
  if (!_available) return;
  try {
    await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch (e) { console.warn('[ServerStorage] save settings failed:', e); }
}
