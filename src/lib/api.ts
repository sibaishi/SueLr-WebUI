function extractFromText(text: string, imgs: string[]) {
  const r1 = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = r1.exec(text)) !== null) { if (!imgs.includes(m[2])) imgs.push(m[2]); }
  const r2 = /(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/g;
  while ((m = r2.exec(text)) !== null) { if (!imgs.includes(m[1])) imgs.push(m[1]); }
}

import type { ChatCompletionResponse, ContentPart } from './types';

function rmMdImgs(t: string): string {
  return t.replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, '[图片]').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[图片]');
}

export function extractImages(data: ChatCompletionResponse): string[] {
  const imgs: string[] = [];
  try {
    if (data?.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.url?.startsWith('http')) imgs.push(item.url);
        if (item.b64_json) imgs.push('data:image/png;base64,' + item.b64_json);
      }
    }
    const c = data?.choices?.[0]?.message?.content;
    if (Array.isArray(c)) {
      for (const p of c) {
        if (p.type === 'image_url' && p.image_url?.url) imgs.push(p.image_url.url);
        if (p.type === 'text' && p.text) extractFromText(p.text, imgs);
      }
    } else if (typeof c === 'string') { extractFromText(c, imgs); }
  } catch (e) { console.warn('[API] extractImages failed:', e); }
  return imgs;
}

export function extractText(data: ChatCompletionResponse): string {
  try {
    const c = data?.choices?.[0]?.message?.content;
    if (typeof c === 'string') return rmMdImgs(c);
    if (Array.isArray(c)) return (c as ContentPart[]).filter(p => p.type === 'text' && p.text).map(p => rmMdImgs(p.text!)).join('\n');
  } catch (e) { console.warn('[API] extractText failed:', e); }
  return '';
}

// ====== Streaming image fetch — prevents proxy timeout for slow image models ======
export async function streamImageFetch(url: string, opts: RequestInit): Promise<{ content: string; rawData: ChatCompletionResponse }> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(e.error?.message || e.message || `HTTP ${res.status}`);
  }
  // If no streaming body, parse as normal JSON
  if (!res.body) {
    const data = await res.json();
    return { content: '', rawData: data };
  }
  // Read SSE stream — keeps connection alive through proxy
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let lastData: any = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        lastData = parsed;
        const choice = parsed.choices?.[0];
        if (choice?.delta?.content) {
          fullContent += choice.delta.content;
        }
        // Some models return full message in the last chunk
        if (choice?.message?.content && !choice.delta) {
          fullContent = choice.message.content;
        }
      } catch {}
    }
  }
  // Build synthetic response for extractImages/extractText compatibility
  const synthetic = lastData ? { ...lastData, choices: [{ ...lastData.choices?.[0], message: { ...lastData.choices?.[0]?.message, content: fullContent } }] } : { choices: [{ message: { content: fullContent } }] };
  return { content: fullContent, rawData: synthetic };
}
