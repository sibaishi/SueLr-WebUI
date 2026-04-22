# Flow Studio — API 连接与模型选择 完整代码

> 本文档包含 ai-assistant 项目中所有与 API 连接、模型选择、Provider 体系相关的完整代码。
> 可直接复制到 flow-studio 项目中使用。

---

## 文件结构

```
src/lib/
├── types.ts              ← 类型定义（完整）
├── utils.ts              ← 工具函数（完整）
├── constants.ts          ← 常量 + 工具定义（完整）
├── api.ts                ← API 响应解析（完整）
├── image.ts              ← 图片压缩工具（完整）
├── store.ts              ← 图片存储（完整）
├── videoPoll.ts          ← 视频轮询（完整）
├── providers/
│   ├── types.ts          ← Provider 接口定义（核心）
│   ├── generic.ts        ← 通用 Provider 实现（核心）
│   ├── openai.ts         ← 原始 OpenAI 函数式调用（向后兼容）
│   └── index.ts          ← 统一导出
src/hooks/
└── index.ts              ← useProvider Hook
```

---

## 1. src/lib/types.ts

```typescript
export type Tab = 'chat' | 'image' | 'video' | 'settings';
export type ThemeMode = 'dark' | 'light' | 'system';
export type TaskStatus = 'queued' | 'processing' | 'done' | 'failed' | 'cancelled';
export type VideoStatus = '提交中' | '处理中' | '已完成' | '失败' | '已取消';

export interface ModelInfo { id: string; cat: 'chat' | 'image' | 'video'; }
export interface ToolCallState { type: 'image' | 'video'; status: 'processing' | 'done' | 'failed'; label: string; error?: string; }
export interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; images: string[]; videoUrl?: string; toolCall?: ToolCallState; ts: number; }
export interface AgentRole { id: string; name: string; icon: string; systemPrompt: string; tools: ('generate_image' | 'generate_video' | 'web_search')[]; isCustom?: boolean; }
export interface Memory { id: string; content: string; convId: string; ts: number; }
export interface Conv { id: string; title: string; model: string; roleId?: string; msgs: ChatMsg[]; ts: number; }
export interface ImgTask { id: string; prompt: string; model: string; ratio: string; refImages: string[]; status: TaskStatus; images: string[]; error?: string; ts: number; }
export interface GalleryItem { id: string; url: string; prompt: string; model: string; ts: number; }
export interface VTask { id: string; taskId: string; status: VideoStatus; prompt: string; model: string; params: string; videoUrl?: string; error?: string; }
export interface LogEntry { time: string; level: string; msg: string; }
export interface Colors { bg: string; card: string; card2: string; menuBg: string; border: string; text: string; text2: string; text3: string; blue: string; green: string; red: string; orange: string; purple: string; }
export interface ProviderConfig {
  authType: 'bearer' | 'api-key' | 'custom';
  customHeaderName?: string;
  customPrefix?: string;
  imageMode: 'chat' | 'standalone' | 'none';
  videoMode: 'poll' | 'none';
  videoEndpoint?: string;
  chatEndpoint?: string;
  modelsEndpoint?: string;
}
export interface ApiConfig { id: string; name: string; base: string; apiKey: string; models: ModelInfo[]; defaultImageModel: string; defaultVideoModel: string; providerConfig?: ProviderConfig; }

// ====== API Response Types ======
export interface ChatCompletionResponse {
  choices?: { message: ChatCompletionMessage; finish_reason?: string }[];
  data?: { url?: string; b64_json?: string }[];
}
export interface ChatCompletionMessage {
  content: string | ContentPart[];
  role?: string;
  tool_calls?: ToolCallDef[];
}
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}
export interface ToolCallDef {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}
export interface ModelsResponse { data: { id: string }[]; }
export interface TavilySearchResponse { results: { title: string; content: string; url: string }[]; answer?: string; }
```

---

## 2. src/lib/providers/types.ts（核心 — Provider 接口）

```typescript
import type { ContentPart, ToolCallDef, ToolDefinition, ModelInfo } from '../types';

// ====== Provider Configuration (stored in ApiConfig) ======

export interface ProviderConfig {
  /** 认证方式 */
  authType: 'bearer' | 'api-key' | 'custom';
  /** 自定义 Header 名（authType 为 custom 时使用） */
  customHeaderName?: string;
  /** 自定义前缀（authType 为 custom 时使用，如 'Key'、''） */
  customPrefix?: string;
  /** 图像生成方式 */
  imageMode: 'chat' | 'standalone' | 'none';
  /** 视频生成方式 */
  videoMode: 'poll' | 'none';
  /** 视频接口路径（默认 /v1/video/generations） */
  videoEndpoint?: string;
  /** 对话接口路径（默认 /v1/chat/completions） */
  chatEndpoint?: string;
  /** 模型列表接口路径（默认 /v1/models） */
  modelsEndpoint?: string;
}

/** 默认配置 = 当前 OpenAI 兼容行为，确保现有功能不受影响 */
export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  authType: 'bearer',
  imageMode: 'chat',
  videoMode: 'poll',
  chatEndpoint: '/v1/chat/completions',
  modelsEndpoint: '/v1/models',
  videoEndpoint: '/v1/video/generations',
};

// ====== API 参数和返回类型 ======

export interface ChatCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string | ContentPart[]; tool_calls?: any[] }>;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  content: string;
  toolCalls: ToolCallDef[] | null;
  finishReason: string;
}

export interface VideoSubmitParams {
  model: string;
  prompt: string;
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  image_url?: string;
  signal?: AbortSignal;
}

export interface VideoSubmitResult {
  taskId: string;
}

export interface SearchResult {
  answer?: string;
  results: Array<{ title: string; content: string; url: string }>;
}

export interface GenerateImageParams {
  model: string;
  content: ContentPart[];
  signal?: AbortSignal;
}

export interface GenerateImageResult {
  content: string;
  rawData: any; // ChatCompletionResponse
}

// ====== AIProvider 统一接口 ======

/** 流式输出回调 */
export interface StreamCallbacks {
  /** 收到新 token 时调用 */
  onToken: (token: string) => void;
  /** 流式结束时调用（成功或失败都会调用） */
  onFinish: (result: ChatCompletionResult) => void;
  /** 出错时调用 */
  onError: (error: Error) => void;
}

export interface AIProvider {
  /** 构建认证请求头 */
  buildHeaders(): Record<string, string>;
  /** 非流式对话（含 Function Calling） */
  chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>;
  /** 流式对话（SSE），通过回调实时推送 token */
  chatCompletionStream(params: ChatCompletionParams, callbacks: StreamCallbacks): void;
  /** 提交视频生成任务 */
  submitVideoGeneration(params: VideoSubmitParams): Promise<VideoSubmitResult>;
  /** 流式图像生成（SSE） */
  generateImage(params: GenerateImageParams): Promise<GenerateImageResult>;
  /** 获取模型列表 */
  listModels(): Promise<ModelInfo[]>;
  /** 当前配置（只读） */
  readonly config: ProviderConfig;
}
```

---

## 3. src/lib/providers/generic.ts（核心 — 通用 Provider 实现）

```typescript
/**
 * 通用 Provider：通过配置适配绝大多数 OpenAI 兼容 API
 * 默认行为与原 openai.ts 完全一致
 */
import type { AIProvider, ProviderConfig, ChatCompletionParams, ChatCompletionResult, VideoSubmitParams, VideoSubmitResult } from './types';
import type { ModelInfo } from '../types';
import { DEFAULT_PROVIDER_CONFIG } from './types';
import { cleanKey, catModel } from '../utils';

export function createProvider(base: string, apiKey: string, config?: Partial<ProviderConfig>): AIProvider {
  const cfg: ProviderConfig = { ...DEFAULT_PROVIDER_CONFIG, ...config };

  // ====== 构建认证请求头 ======
  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = cleanKey(apiKey);
    switch (cfg.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${key}`;
        break;
      case 'api-key':
        headers['X-API-Key'] = key;
        break;
      case 'custom':
        headers[cfg.customHeaderName || 'Authorization'] = `${cfg.customPrefix ?? 'Bearer '}${key}`;
        break;
    }
    return headers;
  }

  // ====== Chat Completion ======
  async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const endpoint = cfg.chatEndpoint || '/v1/chat/completions';
    const body: Record<string, any> = { model: params.model, messages: params.messages };
    if (params.tools && params.tools.length > 0) body.tools = params.tools;
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: params.signal,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      throw new Error(e.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    return {
      content: typeof msg?.content === 'string' ? msg.content : '',
      toolCalls: msg?.tool_calls || null,
      finishReason: data.choices?.[0]?.finish_reason || 'stop',
    };
  }

  // ====== Video Generation ======
  async function submitVideoGeneration(params: VideoSubmitParams): Promise<VideoSubmitResult> {
    const endpoint = cfg.videoEndpoint || '/v1/video/generations';
    const body: Record<string, unknown> = { model: params.model, prompt: params.prompt };
    if (params.duration) body.duration = params.duration;
    if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
    if (params.resolution) body.resolution = params.resolution;
    if (params.image_url) body.image_url = params.image_url;
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: params.signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
    const tid = data.id || data.task_id || data.data?.id;
    if (!tid) throw new Error('未获得任务ID: ' + JSON.stringify(data).slice(0, 200));
    return { taskId: tid };
  }

  // ====== Streaming Image Generation ======
  async function generateImage(params: import('./types').GenerateImageParams): Promise<import('./types').GenerateImageResult> {
    const { streamImageFetch } = await import('../api');
    const endpoint = cfg.chatEndpoint || '/v1/chat/completions';
    return streamImageFetch(`${base}${endpoint}`, {
      method: 'POST',
      signal: params.signal,
      headers: buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        messages: [{ role: 'user', content: params.content }],
        stream: true,
      }),
    });
  }

  // ====== Streaming Chat Completion (SSE) ======
  function chatCompletionStream(params: ChatCompletionParams, callbacks: import('./types').StreamCallbacks): void {
    const endpoint = cfg.chatEndpoint || '/v1/chat/completions';
    const body: Record<string, any> = { model: params.model, messages: params.messages, stream: true };
    if (params.tools && params.tools.length > 0) body.tools = params.tools;
    let aborted = false;

    (async () => {
      try {
        const res = await fetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(body),
          signal: params.signal,
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
          throw new Error(e.error?.message || `HTTP ${res.status}`);
        }
        if (!res.body) {
          const data = await res.json();
          const msg = data.choices?.[0]?.message;
          const result: ChatCompletionResult = {
            content: typeof msg?.content === 'string' ? msg.content : '',
            toolCalls: msg?.tool_calls || null,
            finishReason: data.choices?.[0]?.finish_reason || 'stop',
          };
          if (result.content) callbacks.onToken(result.content);
          if (!aborted) callbacks.onFinish(result);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let toolCalls: any[] | null = null;
        let finishReason = 'stop';

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
              const choice = parsed.choices?.[0];
              if (choice) {
                if (choice.delta?.content) {
                  fullContent += choice.delta.content;
                  if (!aborted) callbacks.onToken(choice.delta.content);
                }
                if (choice.delta?.tool_calls) {
                  toolCalls = choice.delta.tool_calls;
                }
                if (choice.message?.content && !choice.delta) {
                  fullContent = choice.message.content;
                  if (!aborted) callbacks.onToken(fullContent);
                }
                if (choice.message?.tool_calls && !choice.delta) {
                  toolCalls = choice.message.tool_calls;
                }
                if (choice.finish_reason) finishReason = choice.finish_reason;
              }
            } catch {}
          }
        }
        if (!aborted) {
          callbacks.onFinish({
            content: fullContent,
            toolCalls,
            finishReason,
          });
        }
      } catch (err: any) {
        if (!aborted) callbacks.onError(err);
      }
    })();

    return;
  }

  // ====== List Models ======
  async function listModels(): Promise<ModelInfo[]> {
    const endpoint = cfg.modelsEndpoint || '/v1/models';
    const res = await fetch(`${base}${endpoint}`, {
      headers: buildHeaders(),
    });
    const data = await res.json();
    return (data.data || []).map((m: any) => ({ id: m.id, cat: catModel(m.id) }));
  }

  return {
    buildHeaders,
    chatCompletion,
    chatCompletionStream,
    submitVideoGeneration,
    generateImage,
    listModels,
    get config() { return cfg; },
  };
}
```

---

## 4. src/lib/providers/openai.ts（原始函数式调用，向后兼容）

```typescript
/**
 * OpenAI-compatible API provider
 * Handles: /v1/chat/completions, /v1/video/generations, /v1/models, Tavily search
 */
import type { ChatCompletionParams, ChatCompletionResult, VideoSubmitParams, VideoSubmitResult, SearchResult } from './types';
import type { ModelInfo } from '../types';
import { cleanKey, catModel } from '../utils';

// ====== Chat Completion (non-streaming, with tool_calls support) ======
export async function chatCompletion(base: string, apiKey: string, params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const body: Record<string, any> = { model: params.model, messages: params.messages };
  if (params.tools && params.tools.length > 0) body.tools = params.tools;
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cleanKey(apiKey)}` },
    body: JSON.stringify(body),
    signal: params.signal,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  return {
    content: typeof msg?.content === 'string' ? msg.content : '',
    toolCalls: msg?.tool_calls || null,
    finishReason: data.choices?.[0]?.finish_reason || 'stop',
  };
}

// ====== Video Generation Task Submission ======
export async function submitVideoGeneration(base: string, apiKey: string, params: VideoSubmitParams): Promise<VideoSubmitResult> {
  const body: Record<string, unknown> = { model: params.model, prompt: params.prompt };
  if (params.duration) body.duration = params.duration;
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.resolution) body.resolution = params.resolution;
  if (params.image_url) body.image_url = params.image_url;
  const res = await fetch(`${base}/v1/video/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cleanKey(apiKey)}` },
    body: JSON.stringify(body),
    signal: params.signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
  const tid = data.id || data.task_id || data.data?.id;
  if (!tid) throw new Error('未获得任务ID: ' + JSON.stringify(data).slice(0, 200));
  return { taskId: tid };
}

// ====== List Models ======
export async function listModels(base: string, apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(`${base}/v1/models`, {
    headers: { 'Authorization': `Bearer ${cleanKey(apiKey)}` },
  });
  const data = await res.json();
  return (data.data || []).map((m: any) => ({ id: m.id, cat: catModel(m.id) }));
}

// ====== Tavily Web Search ======
export async function tavilySearch(apiKey: string, query: string, maxResults = 5): Promise<SearchResult> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, include_answer: true }),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  return await res.json();
}
```

---

## 5. src/lib/providers/index.ts（统一导出）

```typescript
// ====== 向后兼容：原有的函数式调用（内部使用默认配置） ======
export { chatCompletion, submitVideoGeneration, listModels, tavilySearch } from './openai';

// ====== 新增：Provider 接口和工厂函数 ======
export { createProvider } from './generic';
export { DEFAULT_PROVIDER_CONFIG } from './types';
export type { AIProvider, ProviderConfig, ChatCompletionParams, ChatCompletionResult, VideoSubmitParams, VideoSubmitResult, SearchResult, GenerateImageParams, GenerateImageResult } from './types';
```

---

## 6. src/lib/utils.ts（工具函数）

```typescript
import type { Colors } from './types';

export const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
export const ftime = (t: number) => new Date(t).toLocaleTimeString('zh-CN');
export const cleanKey = (s: string) => s.replace(/[^\x20-\x7E]/g, '').trim();
export const logLevelColor = (level: string, T: Colors) =>
  level === 'success' ? T.green : level === 'error' ? T.red : level === 'warn' ? T.orange : level === 'debug' ? T.text3 : T.blue;

// 模型分类逻辑（按模型名关键词判断）
export const catModel = (id: string): 'chat' | 'image' | 'video' => {
  if (id.includes('seedance')) return 'video';
  if (id.includes('seedream') || id.includes('image') || id.includes('banana')) return 'image';
  return 'chat';
};

export const taskStatusColor = (s: string, T: Colors) =>
  s === 'queued' || s === '提交中' ? T.orange : s === 'processing' || s === '处理中' ? T.blue : s === 'done' || s === '已完成' ? T.green : s === 'failed' || s === '失败' ? T.red : T.text3;
export const taskStatusLabel = (s: string) =>
  s === 'queued' ? '排队中' : s === 'processing' ? '生成中' : s === 'done' ? '已完成' : s === 'failed' ? '失败' : s === '已取消' ? '已取消' : s;

export function loadJSON<T>(k: string, fb: T): T {
  try {
    const d = localStorage.getItem(k);
    return d ? JSON.parse(d) : fb;
  } catch {
    return fb;
  }
}

export function saveJSON(k: string, v: any) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

const debounceTimers: Record<string, any> = {};
export function debouncedSaveJSON(k: string, v: any, ms = 300) {
  clearTimeout(debounceTimers[k]);
  debounceTimers[k] = setTimeout(() => saveJSON(k, v), ms);
}
```

---

## 7. src/lib/api.ts（API 响应解析）

```typescript
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
```

---

## 8. src/lib/image.ts（图片压缩）

```typescript
export function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export async function compressImage(file: File, maxDim = 2048): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        fileToB64(file).then(resolve);
        return;
      }
      const scale = maxDim / Math.max(width, height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = url;
  });
}
```

---

## 9. src/lib/store.ts（图片存储 + URL 解析）

```typescript
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
 * - localhost URLs → fetch → convert to base64 data URL
 * - blob: URLs → fetch blob → convert back to data: URL
 */
export async function resolveToDataURL(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
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
```

---

## 10. src/lib/videoPoll.ts（视频任务轮询）

```typescript
import { cleanKey } from './utils';

interface PollOptions {
  /** Platform task ID to poll */
  taskId: string;
  /** Key for managing the interval ref */
  pollKey: string;
  /** Ref holding active intervals */
  pollRefs: React.MutableRefObject<Record<string, ReturnType<typeof setInterval>>>;
  /** API base URL ref */
  baseR: React.MutableRefObject<string>;
  /** API key ref */
  keyR: React.MutableRefObject<string>;
  /** Called when video is ready */
  onSuccess: (url: string) => void;
  /** Called when task completes but no URL */
  onNoUrl: () => void;
  /** Called when task fails */
  onFailure: (error: string) => void;
  /** Called on poll fetch error */
  onPollError: (error: string) => void;
}

/** Start polling a video generation task. Returns a cancel function. */
export function startVideoPoll(opts: PollOptions): () => void {
  const { taskId, pollKey, pollRefs, baseR, keyR, onSuccess, onNoUrl, onFailure, onPollError } = opts;
  const cleanup = () => {
    if (pollRefs.current[pollKey]) {
      clearInterval(pollRefs.current[pollKey]);
      delete pollRefs.current[pollKey];
    }
  };

  pollRefs.current[pollKey] = setInterval(async () => {
    try {
      const pr = await fetch(`${baseR.current}/v1/video/generations/${taskId}`, {
        headers: { 'Authorization': `Bearer ${cleanKey(keyR.current)}` },
      });
      const pd = await pr.json();
      const st = pd.status || pd.data?.status;
      if (st === 'succeeded' || st === 'complete' || st === 'completed') {
        cleanup();
        const url = pd.video_url || pd.output?.video_url || pd.data?.video_url || pd.data?.output?.video_url;
        if (url) { onSuccess(url); } else { onNoUrl(); }
      } else if (st === 'failed' || st === 'error') {
        cleanup();
        const err = String(pd.error || pd.data?.error || '生成失败');
        onFailure(err);
      }
    } catch (err: any) {
      onPollError(err.message);
    }
  }, 5000);

  return cleanup;
}
```

---

## 11. src/hooks/index.ts（useProvider Hook）

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { createProvider } from '../lib/providers';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [breakpoint]);
  return isMobile;
}

export function useLiveRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

export function useApiRefs(base: string, apiKey: string) {
  return { baseR: useLiveRef(base), keyR: useLiveRef(apiKey) };
}

export function useProvider(base: string, apiKey: string, providerConfig?: any) {
  const { baseR, keyR } = useApiRefs(base, apiKey);
  const configR = useLiveRef(providerConfig);
  const getProvider = useCallback(
    () => createProvider(baseR.current, keyR.current, configR.current),
    [baseR, keyR, configR]
  );
  return { baseR, keyR, getProvider };
}
```

---

## 12. src/lib/constants.ts — buildTools() 函数（Function Calling 工具定义）

```typescript
// 这是 constants.ts 中与 API 工具定义相关的部分
// 完整文件还包含主题色、预设角色、快捷提示词等

import type { ToolDefinition } from './types';

export function buildTools(hasImage: boolean, hasVideo: boolean, hasSearch: boolean = false) {
  const tools: ToolDefinition[] = [];
  if (hasImage) {
    tools.push({
      type: 'function',
      function: {
        name: 'generate_image',
        description: '根据用户的文字描述生成图片。',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: '图片的详细描述' },
            reference_image_url: { type: 'string', description: '可选。参考图片URL。' },
          },
          required: ['prompt'],
        },
      },
    });
  }
  if (hasVideo) {
    tools.push({
      type: 'function',
      function: {
        name: 'generate_video',
        description: '根据文字描述或参考图片生成视频。',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: '视频内容的详细描述' },
            image_url: { type: 'string', description: '可选，参考图片URL。' },
            duration: { type: 'number', description: '视频时长（秒），可选值：5或10，默认5' },
            aspect_ratio: { type: 'string', description: '画面比例', enum: ['16:9', '9:16', '1:1'] },
          },
          required: ['prompt'],
        },
      },
    });
  }
  if (hasSearch) {
    tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: '搜索互联网获取实时信息。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
          },
          required: ['query'],
        },
      },
    });
  }
  // Always available tools (no external API needed)
  tools.push({
    type: 'function',
    function: {
      name: 'get_current_time',
      description: '获取当前的日期、时间和星期。',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: '可选，时区' },
        },
        required: [],
      },
    },
  });
  tools.push({
    type: 'function',
    function: {
      name: 'search_memory',
      description: '搜索关于用户的记忆和偏好。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '要搜索的记忆关键词' },
        },
        required: ['query'],
      },
    },
  });
  tools.push({
    type: 'function',
    function: {
      name: 'analyze_image',
      description: '分析图片内容。',
      parameters: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: '要分析的图片URL。' },
          prompt: { type: 'string', description: '对图片的分析要求。' },
        },
        required: [],
      },
    },
  });
  tools.push({
    type: 'function',
    function: {
      name: 'summarize_conversation',
      description: '总结当前对话的关键内容。',
      parameters: {
        type: 'object',
        properties: {
          focus: { type: 'string', description: '可选，总结的侧重点。' },
        },
        required: [],
      },
    },
  });
  return tools;
}
```

---

## 核心架构说明

### Provider 使用方式

```typescript
// 方式1：直接使用工厂函数（推荐）
import { createProvider } from './lib/providers';

const provider = createProvider('https://api.example.com', 'sk-xxx', {
  authType: 'bearer',           // 可选，默认 bearer
  chatEndpoint: '/v1/chat/completions',  // 可选
  imageMode: 'chat',            // 可选，'chat' | 'standalone' | 'none'
  videoMode: 'poll',            // 可选，'poll' | 'none'
});

// 对话
const result = await provider.chatCompletion({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '你好' }],
});

// 获取模型列表
const models = await provider.listModels();

// 流式对话
provider.chatCompletionStream(params, {
  onToken: (token) => { /* 实时输出 */ },
  onFinish: (result) => { /* 完成 */ },
  onError: (error) => { /* 出错 */ },
});

// 方式2：通过 React Hook
import { useProvider } from './hooks';

function MyComponent() {
  const { getProvider } = useProvider(base, apiKey, providerConfig);
  const handleClick = async () => {
    const provider = getProvider();
    const models = await provider.listModels();
  };
}
```

### 数据流

```
用户配置（SettingsPanel）
  ↓ providerConfig 保存到 ApiConfig
App.tsx（计算当前 providerConfig）
  ↓ 传递
各面板组件 → 各 Hook（useChat/useImageGen/useVideoGen）
  ↓ 调用
useProvider(base, apiKey, providerConfig)
  ↓ 返回
getProvider() → createProvider() → GenericProvider
  ↓ 调用
provider.chatCompletion() / .generateImage() / .submitVideoGeneration() / .listModels()
  ↓ 请求
API 服务器
```
