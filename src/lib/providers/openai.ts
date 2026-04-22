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
