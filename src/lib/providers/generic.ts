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
    const endpoint = cfg.chatEndpoint || '/v1/chat/completions';
    const body = {
      model: params.model,
      messages: [{ role: 'user', content: params.content }],
      stream: params.stream ?? true,
    };
    if (params.stream ?? true) {
      const { streamImageFetch } = await import('../api');
      return streamImageFetch(`${base}${endpoint}`, {
        method: 'POST',
        signal: params.signal,
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });
    }
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      signal: params.signal,
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      throw new Error(e.error?.message || e.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { content: '', rawData: data };
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
          // Fallback: no streaming body, parse as normal JSON
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
        // Read SSE stream
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
                // Streaming delta tokens
                if (choice.delta?.content) {
                  fullContent += choice.delta.content;
                  if (!aborted) callbacks.onToken(choice.delta.content);
                }
                // Some providers return tool_calls in deltas
                if (choice.delta?.tool_calls) {
                  toolCalls = choice.delta.tool_calls;
                }
                // Non-streaming fallback: full message in single chunk
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

    // Return an abort mechanism (not used currently, but for future use)
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
