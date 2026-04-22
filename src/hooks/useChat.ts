import { useState, useEffect, useRef, useCallback, useMemo, type DragEvent, type MutableRefObject } from 'react';
import type { ModelInfo, ChatMsg, Conv, BridgeRef, AgentRole, ContentPart, ToolCallDef } from '../lib/types';
import { gid, catModel, loadJSON, debouncedSaveJSON } from '../lib/utils';
import { extractImages, extractText } from '../lib/api';
import { compressImage } from '../lib/image';
import { buildTools } from '../lib/constants';
import { processImages, resolveToDataURL } from '../lib/store';
import { isServerAvailable, serverLoadConversations, serverSaveConversations, serverDeleteConversation } from '../lib/serverStorage';
import { startVideoPoll, waitForVideoCompletion } from '../lib/videoPoll';
import { useProvider } from './index';
import type { ProviderConfig, AIProvider } from '../lib/providers';
import { tavilySearch } from '../lib/providers';
import { useToast } from '../contexts/ToastContext';

function chatStartVideoPoll(
  pollRefKey: string, tid: string, cid: string, convId: string,
  pollRefs: React.MutableRefObject<Record<string, ReturnType<typeof setInterval>>>,
  baseR: React.MutableRefObject<string>, keyR: React.MutableRefObject<string>,
  updateMsg: (convId: string, msgId: string, updates: Partial<ChatMsg>) => void,
  setSendings: React.Dispatch<React.SetStateAction<Set<string>>>,
  addLog: (l: string, m: string) => void,
  toast: (msg: string, type: 'success' | 'error' | 'info') => void,
  bridgeRef: React.MutableRefObject<BridgeRef>,
  userInput: string, modelName: string,
) {
  startVideoPoll({
    taskId: tid, pollKey: pollRefKey, pollRefs, baseR, keyR,
    onSuccess: (url) => {
      setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
      updateMsg(convId, pollRefKey, { content: '视频已生成', videoUrl: url, toolCall: undefined });
      addLog('success', `[Chat-Video] 视频生成完成`);
      toast('视频生成完成！', 'success');
      bridgeRef.current.addToVideoGallery?.({ id: pollRefKey, url, prompt: userInput, model: modelName, ts: Date.now() });
    },
    onNoUrl: () => {
      setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
      updateMsg(convId, pollRefKey, { content: '视频完成但未获得URL', toolCall: { type: 'video', status: 'failed', label: '未获得视频URL', error: '完成但未返回视频地址' } });
      toast('视频生成完成但未获得URL', 'error');
    },
    onFailure: (err) => {
      setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
      updateMsg(convId, pollRefKey, { content: `视频生成失败: ${err.slice(0, 80)}`, toolCall: { type: 'video', status: 'failed', label: '生成失败', error: err } });
      addLog('error', `[Chat-Video] 失败: ${err}`);
      toast('视频生成失败', 'error');
    },
    onPollError: (errMsg) => { addLog('error', `[Chat-Video] 轮询错误: ${errMsg}`); },
  });
}

async function executeToolCall(
  tc: ToolCallDef, cid: string, convId: string, userInput: string,
  ac: AbortController, lastImagesRef: { current: string[] },
  defaultImageModel: string, defaultVideoModel: string, tavilyApiKey: string,
  imageStreamingMode: 'stream' | 'non-stream',
  videoStreamingMode: 'stream' | 'non-stream',
  getProvider: () => AIProvider,
  baseR: React.MutableRefObject<string>, keyR: React.MutableRefObject<string>,
  setConvs: React.Dispatch<React.SetStateAction<Conv[]>>,
  updateMsg: (convId: string, msgId: string, updates: Partial<ChatMsg>) => void,
  addLog: (l: string, m: string) => void,
  toast: (msg: string, type: 'success' | 'error' | 'info') => void,
  bridgeRef: React.MutableRefObject<BridgeRef>,
  pollRefs: React.MutableRefObject<Record<string, ReturnType<typeof setInterval>>>,
  setSendings: React.Dispatch<React.SetStateAction<Set<string>>>,
  searchMemoriesFn: (query: string) => string,
  convMessages: { role: string; content: string }[],
  chatModel: string,
): Promise<{ tool_call_id: string; content: string }> {
  const toolName = tc.function?.name;
  let toolArgs: Record<string, string> = {};
  try { toolArgs = JSON.parse(tc.function?.arguments || '{}'); } catch {}

  if (toolName === 'generate_image' && defaultImageModel) {
    const toolMsgId = gid();
    const prompt = toolArgs.prompt || userInput;
    const refImg = toolArgs.reference_image_url || (lastImagesRef.current.length > 0 ? lastImagesRef.current[0] : undefined);
    setConvs(p => p.map(c => c.id === convId ? { ...c, msgs: [...c.msgs, { id: toolMsgId, role: 'assistant' as const, content: '', images: [], toolCall: { type: 'image' as const, status: 'processing' as const, label: `图像生成中: ${prompt.slice(0, 30)}...` }, ts: Date.now() }] } : c));
    try {
      addLog('info', `[Chat-FC] generate_image: ${prompt.slice(0, 30)}...`);
      const resolvedRefImg = refImg ? await resolveToDataURL(refImg) : undefined;
      const imgContent: ContentPart[] = [{ type: 'text', text: prompt }];
      if (resolvedRefImg) imgContent.push({ type: 'image_url', image_url: { url: resolvedRefImg } });
      const { rawData: imgData } = await getProvider().generateImage({ model: defaultImageModel, content: imgContent, signal: ac.signal, stream: imageStreamingMode === 'stream' });
      const rawImgs = extractImages(imgData);
      if (rawImgs.length === 0) throw new Error('未生成图片');
      const { urls: imgs } = await processImages(rawImgs, toolMsgId, prompt, defaultImageModel);
      lastImagesRef.current = imgs;
      updateMsg(convId, toolMsgId, { images: imgs, toolCall: { type: 'image', status: 'done', label: `已生成 ${imgs.length} 张图片` } });
      addLog('success', `[Chat-FC] 图片完成，${imgs.length} 张`);
      toast(`图片生成完成！(${imgs.length}张)`, 'success');
      bridgeRef.current.addToImageGallery?.(imgs.map((url, i) => ({ id: `${toolMsgId}_${i}`, url, prompt, model: defaultImageModel, ts: Date.now() })));
      return { tool_call_id: tc.id, content: `成功生成 ${imgs.length} 张图片。图片URL: ${imgs.join(', ')}` };
    } catch (err: any) {
      updateMsg(convId, toolMsgId, { content: `图片生成失败: ${err.message}`, toolCall: { type: 'image', status: 'failed', label: '生成失败', error: err.message } });
      addLog('error', `[Chat-FC] 图片失败: ${err.message}`);
      toast('图片生成失败', 'error');
      return { tool_call_id: tc.id, content: `图片生成失败: ${err.message}` };
    }
  }

  if (toolName === 'generate_video' && defaultVideoModel) {
    const toolMsgId = gid();
    const prompt = toolArgs.prompt || userInput;
    const imageUrl = toolArgs.image_url || (lastImagesRef.current.length > 0 ? lastImagesRef.current[0] : undefined);
    const duration = Number(toolArgs.duration) || 5;
    const aspectRatio = toolArgs.aspect_ratio || '16:9';
    setConvs(p => p.map(c => c.id === convId ? { ...c, msgs: [...c.msgs, { id: toolMsgId, role: 'assistant' as const, content: '', images: [], toolCall: { type: 'video' as const, status: 'processing' as const, label: '正在提交视频生成任务...' }, ts: Date.now() }] } : c));
    try {
      addLog('info', `[Chat-FC] generate_video: ${prompt.slice(0, 30)}...${imageUrl ? ' (带参考图)' : ''}`);
      const resolvedImageUrl = imageUrl ? await resolveToDataURL(imageUrl) : undefined;
      const { taskId: tid } = await getProvider().submitVideoGeneration({
        model: defaultVideoModel, prompt, duration, aspect_ratio: aspectRatio, resolution: '720p', image_url: resolvedImageUrl, signal: ac.signal,
      });
      addLog('success', `[Chat-FC] 视频已提交，ID: ${tid}`);
      toast('视频任务已提交，生成中...', 'info');
      updateMsg(convId, toolMsgId, { toolCall: { type: 'video', status: 'processing', label: `视频生成中... (ID: ${String(tid).slice(0, 8)})` } });
      if (videoStreamingMode === 'stream') {
        chatStartVideoPoll(toolMsgId, tid, cid, convId, pollRefs, baseR, keyR, updateMsg, setSendings, addLog, toast, bridgeRef, prompt, defaultVideoModel);
      } else {
        await waitForVideoCompletion({
          taskId: tid, baseR, keyR,
          onSuccess: (url) => {
            setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
            updateMsg(convId, toolMsgId, { content: '视频已生成', videoUrl: url, toolCall: undefined });
            bridgeRef.current.addToVideoGallery?.({ id: toolMsgId, url, prompt, model: defaultVideoModel, ts: Date.now() });
          },
          onNoUrl: () => {
            setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
            updateMsg(convId, toolMsgId, { content: '视频完成但未获得URL', toolCall: { type: 'video', status: 'failed', label: '未获得视频URL', error: '完成但未返回视频地址' } });
          },
          onFailure: (err) => {
            setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
            updateMsg(convId, toolMsgId, { content: `视频生成失败: ${err.slice(0, 80)}`, toolCall: { type: 'video', status: 'failed', label: '生成失败', error: err } });
          },
          onPollError: (errMsg) => { addLog('error', `[Chat-Video] 轮询错误: ${errMsg}`); },
        });
      }
      return { tool_call_id: tc.id, content: `视频生成任务已提交，任务ID: ${tid}，预计需要1-2分钟完成。` };
    } catch (err: any) {
      updateMsg(convId, toolMsgId, { content: `视频提交失败: ${err.message}`, toolCall: { type: 'video', status: 'failed', label: '提交失败', error: err.message } });
      addLog('error', `[Chat-FC] 视频提交失败: ${err.message}`);
      toast('视频任务提交失败', 'error');
      return { tool_call_id: tc.id, content: `视频任务提交失败: ${err.message}` };
    }
  }

  if (toolName === 'web_search' && tavilyApiKey) {
    const query = toolArgs.query || userInput;
    addLog('info', `[Chat-FC] web_search: ${query}`);
    try {
      const searchData = await tavilySearch(tavilyApiKey, query);
      const answer = searchData.answer || '';
      const results = (searchData.results || []).map((r: { title: string; content: string; url: string }) => `- ${r.title}\n  ${r.content}\n  来源: ${r.url}`).join('\n\n');
      const searchContent = answer ? `摘要: ${answer}\n\n搜索结果:\n${results}` : `搜索结果:\n${results}`;
      addLog('success', `[Chat-FC] 搜索完成，${searchData.results?.length || 0} 条结果`);
      return { tool_call_id: tc.id, content: searchContent || '未找到相关结果' };
    } catch (err: any) {
      addLog('error', `[Chat-FC] 搜索失败: ${err.message}`);
      return { tool_call_id: tc.id, content: `搜索失败: ${err.message}` };
    }
  }

  if (toolName === 'get_current_time') {
    const now = new Date();
    const tz = toolArgs.timezone || 'Asia/Shanghai';
    try {
      const formatted = now.toLocaleString('zh-CN', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        weekday: 'long',
        hour12: false,
      });
      addLog('info', `[Chat-FC] get_current_time: ${formatted}`);
      return { tool_call_id: tc.id, content: `当前时间: ${formatted} (时区: ${tz})` };
    } catch {
      const fallback = now.toLocaleString('zh-CN');
      return { tool_call_id: tc.id, content: `当前时间: ${fallback}` };
    }
  }

  if (toolName === 'search_memory') {
    const query = toolArgs.query || userInput;
    addLog('info', `[Chat-FC] search_memory: ${query}`);
    const result = searchMemoriesFn(query);
    addLog('success', `[Chat-FC] 记忆搜索完成`);
    return { tool_call_id: tc.id, content: result };
  }

  if (toolName === 'analyze_image') {
    const imageUrl = toolArgs.image_url || lastImagesRef.current[0];
    if (!imageUrl) return { tool_call_id: tc.id, content: '没有可分析的图片。请上传图片或先生成一张图片。' };
    const prompt = toolArgs.prompt || '请详细描述这张图片的内容，包括其中的物体、场景、文字、颜色、构图等信息。';
    addLog('info', `[Chat-FC] analyze_image: ${prompt.slice(0, 30)}...`);
    try {
      const resolvedUrl = await resolveToDataURL(imageUrl);
      const res = await fetch(`${baseR.current}/v1/chat/completions`, {
        method: 'POST', signal: ac.signal,
        headers: getProvider().buildHeaders(),
        body: JSON.stringify({
          model: chatModel,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: resolvedUrl } },
          ]}],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      const content = data.choices?.[0]?.message?.content || '无法分析图片';
      addLog('success', `[Chat-FC] 图片分析完成`);
      return { tool_call_id: tc.id, content };
    } catch (err: any) {
      addLog('error', `[Chat-FC] 图片分析失败: ${err.message}`);
      return { tool_call_id: tc.id, content: `图片分析失败: ${err.message}` };
    }
  }

  if (toolName === 'summarize_conversation') {
    if (!convMessages || convMessages.length < 2) {
      return { tool_call_id: tc.id, content: '对话内容太少，无需总结。' };
    }
    const focus = toolArgs.focus || '整体要点';
    addLog('info', `[Chat-FC] summarize_conversation: ${focus}`);
    try {
      const conversationText = convMessages
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');
      const summaryPrompt = `请总结以下对话的${focus}，要求简洁明了，突出关键信息：\n\n${conversationText}`;
      const res = await fetch(`${baseR.current}/v1/chat/completions`, {
        method: 'POST', signal: ac.signal,
        headers: getProvider().buildHeaders(),
        body: JSON.stringify({
          model: chatModel,
          messages: [{ role: 'user', content: summaryPrompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      const content = data.choices?.[0]?.message?.content || '无法总结对话';
      addLog('success', `[Chat-FC] 对话总结完成`);
      return { tool_call_id: tc.id, content };
    } catch (err: any) {
      addLog('error', `[Chat-FC] 对话总结失败: ${err.message}`);
      return { tool_call_id: tc.id, content: `对话总结失败: ${err.message}` };
    }
  }

  return { tool_call_id: tc.id, content: `未知工具: ${toolName}` };
}

export function useChat(
  base: string, apiKey: string, models: ModelInfo[], addLog: (l: string, m: string) => void,
  bridgeRef: MutableRefObject<BridgeRef>, defaultImageModel: string, defaultVideoModel: string,
  roles: AgentRole[], getMemoryContext: () => string, scheduleExtraction: (msgs: { role: string; content: string }[], cid: string, model: string, base: string, key: string) => void,
  tavilyApiKey: string,
  providerConfig?: ProviderConfig,
  chatStreamingMode: 'stream' | 'non-stream' = 'non-stream',
  imageStreamingMode: 'stream' | 'non-stream' = 'stream',
  videoStreamingMode: 'stream' | 'non-stream' = 'stream',
  activeTab?: string,
  searchMemories?: (query: string) => string,
) {
  const toast = useToast();
  const [convs, setConvs] = useState<Conv[]>(loadJSON('ai_convs', []));
  const [activeId, setActiveId] = useState<string | null>(convs[0]?.id || null);
  const [input, setInput] = useState('');
  const [sendings, setSendings] = useState<Set<string>>(new Set());
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [globalModel, setGlobalModel] = useState(convs[0]?.model || '');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const abortRef = useRef<Record<string, AbortController>>({});
  const videoPolls = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimers = useRef<Record<string, { timer: ReturnType<typeof setInterval>; fullText: string; convId: string }>>({});
  const tabRef = useRef(activeTab);
  useEffect(() => {
    tabRef.current = activeTab;
    // Interrupt fake typing when switching away from chat → show full text immediately
    if (activeTab !== 'chat') {
      const timers = typingTimers.current;
      Object.keys(timers).forEach(msgId => {
        const entry = timers[msgId];
        clearInterval(entry.timer);
        updateMsg(entry.convId, msgId, { content: entry.fullText });
        delete timers[msgId];
      });
    }
  }, [activeTab]);
  const convsRef = useRef(convs);
  useEffect(() => { convsRef.current = convs; }, [convs]);
  const { baseR, keyR, getProvider } = useProvider(base, apiKey, providerConfig);

  const chatModels = useMemo(() => models.filter(m => m.cat === 'chat'), [models]);
  const imgModels = useMemo(() => models.filter(m => m.cat === 'image'), [models]);
  const vidModels = useMemo(() => models.filter(m => m.cat === 'video'), [models]);
  const conv = useMemo(() => convs.find(c => c.id === activeId), [convs, activeId]);
  const currentModel = useMemo(() => conv?.model || globalModel || chatModels[0]?.id || '', [conv?.model, globalModel, chatModels]);
  const canSend = useMemo(() => (input.trim() || pendingImages.length > 0) && !!currentModel, [input, pendingImages, currentModel]);
  const currentModelCat = useMemo(() => catModel(currentModel), [currentModel]);
  const currentRole = useMemo(() => {
    const rid = conv?.roleId || 'default';
    return roles.find(r => r.id === rid) || roles[0] || { id: 'default', name: '通用助手', icon: 'bot', systemPrompt: '', tools: ['generate_image', 'generate_video'] as const };
  }, [conv?.roleId, roles]);

  const setRole = useCallback((roleId: string) => {
    if (conv) setConvs(p => p.map(c => c.id === conv.id ? { ...c, roleId } : c));
  }, [conv]);

  const lastExtractedLen = useRef(0);
  useEffect(() => {
    if (!conv) return;
    const len = conv.msgs.length;
    if (len >= 4 && len % 4 === 0 && len > lastExtractedLen.current) {
      lastExtractedLen.current = len;
      const msgs = conv.msgs.map(m => ({ role: m.role, content: m.content }));
      scheduleExtraction(msgs, conv.id, conv.model, base, apiKey);
    }
  }, [conv?.msgs.length]); // eslint-disable-line

  useEffect(() => {
    debouncedSaveJSON('ai_convs', convs.map(c => ({
      ...c,
      msgs: c.msgs.map(m => ({ ...m, images: [], videoUrl: undefined, toolCall: undefined }))
    })));
    if (isServerAvailable() && convs.length > 0) serverSaveConversations(convs);
  }, [convs]);

  const addPendingImages = useCallback((urls: string[]) => {
    setPendingImages(prev => [...prev, ...urls].slice(0, 9));
  }, []);

  useEffect(() => { bridgeRef.current.addToChatPending = addPendingImages; }, [addPendingImages]);

  useEffect(() => {
    return () => {
      Object.values(abortRef.current).forEach(ac => ac.abort());
      Object.values(videoPolls.current).forEach(id => clearInterval(id));
      Object.values(typingTimers.current).forEach(entry => clearInterval(entry.timer));
    };
  }, []);

  useEffect(() => {
    serverLoadConversations().then(serverConvs => {
      if (serverConvs.length > 0) {
        setConvs(serverConvs);
        setActiveId(serverConvs[0]?.id || null);
      }
    });
  }, []);

  const newConv = useCallback((m?: string) => {
    const model = m || currentModel;
    const c: Conv = { id: gid(), title: '新对话', model, roleId: currentRole.id, msgs: [], ts: Date.now() };
    setConvs(p => [c, ...p]); setActiveId(c.id); return c.id;
  }, [currentModel, currentRole.id]);

  const delConv = useCallback((id: string) => {
    setConvs(p => {
      const remaining = p.filter(c => c.id !== id);
      if (activeId === id) setActiveId(remaining[0]?.id || null);
      return remaining;
    });
    serverDeleteConversation(id);
  }, [activeId]);

  const setConvModel = useCallback((m: string) => {
    setGlobalModel(m);
    if (conv) setConvs(p => p.map(c => c.id === conv.id ? { ...c, model: m } : c));
  }, [conv]);

  const handleImageUpload = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const f of fileArr) {
      const b64 = await compressImage(f);
      setPendingImages(prev => [...prev, b64].slice(0, 9));
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleImageUpload(e.dataTransfer.files);
  }, [handleImageUpload]);

  const updateMsg = useCallback((convId: string, msgId: string, updates: Partial<ChatMsg>) => {
    setConvs(p => p.map(c => c.id === convId ? {
      ...c, msgs: c.msgs.map(m => m.id === msgId ? { ...m, ...updates } : m)
    } : c));
  }, []);

  const fakeType = useCallback((convId: string, msgId: string, fullText: string) => {
    const existing = typingTimers.current[msgId];
    if (existing) clearInterval(existing.timer);
    // Not on chat page → show full text immediately
    if (tabRef.current !== 'chat') {
      updateMsg(convId, msgId, { content: fullText });
      return;
    }
    let idx = 0;
    const timer = setInterval(() => {
      idx += Math.floor(Math.random() * 3) + 2;
      if (idx >= fullText.length) {
        idx = fullText.length;
        clearInterval(typingTimers.current[msgId].timer);
        delete typingTimers.current[msgId];
      }
      updateMsg(convId, msgId, { content: fullText.slice(0, idx) });
    }, 25);
    typingTimers.current[msgId] = { timer, fullText, convId };
  }, [updateMsg]);

  const sendVideo = useCallback(async (cid: string, ac: AbortController, userInput: string, convNow: Conv) => {
    const replyId = gid();
    const placeholder: ChatMsg = { id: replyId, role: 'assistant', content: '', images: [], toolCall: { type: 'video', status: 'processing', label: '正在提交视频生成任务...' }, ts: Date.now() };
    setConvs(p => p.map(c => c.id === cid ? { ...c, msgs: [...c.msgs, placeholder] } : c));
    addLog('info', `[Chat-Video] 提交任务: ${userInput.slice(0, 30)}...`);
    try {
      const { taskId: tid } = await getProvider().submitVideoGeneration({
        model: convNow.model, prompt: userInput, duration: 5, aspect_ratio: '16:9', resolution: '720p', signal: ac.signal,
      });
      addLog('success', `[Chat-Video] 任务已提交，ID: ${tid}`);
      toast('视频任务已提交，生成中...', 'info');
      updateMsg(cid, replyId, { toolCall: { type: 'video', status: 'processing', label: `视频生成中... (ID: ${String(tid).slice(0, 8)})` } });
      if (videoStreamingMode === 'stream') {
        chatStartVideoPoll(replyId, tid, cid, cid, videoPolls, baseR, keyR, updateMsg, setSendings, addLog, toast, bridgeRef, userInput, convNow.model);
      } else {
        await waitForVideoCompletion({
          taskId: tid, baseR, keyR,
          onSuccess: (url) => {
            setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
            updateMsg(cid, replyId, { content: '视频已生成', videoUrl: url, toolCall: undefined });
            bridgeRef.current.addToVideoGallery?.({ id: replyId, url, prompt: userInput, model: convNow.model, ts: Date.now() });
          },
          onNoUrl: () => {
            setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
            updateMsg(cid, replyId, { content: '视频完成但未获得URL', toolCall: { type: 'video', status: 'failed', label: '未获得视频URL', error: '完成但未返回视频地址' } });
          },
          onFailure: (err) => {
            setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
            updateMsg(cid, replyId, { content: `视频生成失败: ${err}`, toolCall: { type: 'video', status: 'failed', label: '生成失败', error: err } });
          },
          onPollError: (errMsg) => { addLog('error', `[Chat-Video] 轮询错误: ${errMsg}`); },
        });
      }
    } catch (err: any) {
      setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
      if (err.name !== 'AbortError') { addLog('error', `[Chat-Video] 提交失败: ${err.message}`); toast('视频任务提交失败', 'error'); }
      updateMsg(cid, replyId, { content: `错误: ${err.message}`, toolCall: { type: 'video', status: 'failed', label: '提交失败', error: err.message } });
    } finally { delete abortRef.current[cid]; }
  }, [addLog, baseR, keyR, updateMsg, toast, bridgeRef, setConvs, setSendings, videoStreamingMode]);

  const sendImage = useCallback(async (cid: string, ac: AbortController, userInput: string, userContent: ContentPart[], convNow: Conv) => {
    const replyId = gid();
    const placeholder: ChatMsg = { id: replyId, role: 'assistant', content: '', images: [], toolCall: { type: 'image', status: 'processing', label: '图像生成中...' }, ts: Date.now() };
    setConvs(p => p.map(c => c.id === cid ? { ...c, msgs: [...c.msgs, placeholder] } : c));
    addLog('info', `[Chat-Image] 生成图片 (${imageStreamingMode === 'stream' ? 'stream' : 'non-stream'}): ${userInput.slice(0, 30)}...`);
    try {
      const { rawData: data } = await getProvider().generateImage({ model: convNow.model, content: userContent, signal: ac.signal, stream: imageStreamingMode === 'stream' });
      const text = extractText(data);
      const rawImgs = extractImages(data);
      if (rawImgs.length === 0) throw new Error(text ? `模型返回文本而非图片: ${text.slice(0, 100)}` : '模型未返回图片');
      const { urls: imgs } = await processImages(rawImgs, replyId, userInput, convNow.model);
      updateMsg(cid, replyId, { content: text || '', images: imgs, toolCall: { type: 'image', status: 'done' as const, label: `已生成 ${imgs.length} 张图片` } });
      addLog('success', `[Chat-Image] 生成完成，${imgs.length} 张图片`);
      toast(`图片生成完成！(${imgs.length}张)`, 'success');
      bridgeRef.current.addToImageGallery?.(imgs.map((url, i) => ({ id: `${replyId}_${i}`, url, prompt: userInput, model: convNow.model, ts: Date.now() })));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateMsg(cid, replyId, { content: '[已取消]', toolCall: { type: 'image', status: 'failed' as const, label: '已取消', error: '用户取消' } });
      } else {
        addLog('error', `[Chat-Image] 失败: ${err.message}`);
        toast('图片生成失败', 'error');
        updateMsg(cid, replyId, { content: `错误: ${err.message}`, toolCall: { type: 'image', status: 'failed' as const, label: '生成失败', error: err.message } });
      }
    } finally { setSendings(p => { const n = new Set(p); n.delete(cid); return n; }); delete abortRef.current[cid]; }
  }, [addLog, baseR, keyR, updateMsg, toast, bridgeRef, setConvs, setSendings, imageStreamingMode]);

  const sendChat = useCallback(async (cid: string, ac: AbortController, userInput: string, userContent: ContentPart[], convNow: Conv) => {
    addLog('info', `[Chat] 发送消息到 ${convNow.model} (role: ${convNow.roleId || 'default'})`);

    const role = roles.find(r => r.id === (convNow.roleId || 'default')) || roles[0];
    const sysPrompt = ((role?.systemPrompt || '') + getMemoryContext()).trim();

    const replyId = gid();
    const placeholder: ChatMsg = { id: replyId, role: 'assistant', content: '...', images: [], ts: Date.now() };
    setConvs(p => p.map(c => c.id === cid ? { ...c, msgs: [...c.msgs, placeholder] } : c));

    const chatTools = buildTools(
      (role?.tools?.includes('generate_image') ?? true) && !!defaultImageModel,
      (role?.tools?.includes('generate_video') ?? true) && !!defaultVideoModel,
      !!tavilyApiKey,
    );
    const chatMsgs: { role: string; content: string | ContentPart[]; tool_calls?: any[] }[] = [];
    if (sysPrompt) chatMsgs.push({ role: 'system', content: sysPrompt });
    const windowMsgs = convNow.msgs.slice(-40);
    for (const m of windowMsgs) {
      if (m.role === 'user') {
        const parts: any[] = [];
        if (m.content && m.content !== '[图片]') parts.push({ type: 'text', text: m.content });
        if (m.images?.length) m.images.forEach(img => parts.push({ type: 'image_url', image_url: { url: img } }));
        chatMsgs.push({ role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts });
      } else {
        chatMsgs.push({ role: 'assistant', content: m.content });
      }
    }
    chatMsgs.push({ role: 'user', content: userContent });

    const ccOpts = { model: convNow.model, tools: chatTools.length > 0 ? chatTools : undefined, signal: ac.signal };

    try {
      // === 流式/假流式分支 ===
      let initContent = '';
      let initToolCalls: ToolCallDef[] | null = null;
      let initFR = 'stop';

      if (chatStreamingMode === 'stream') {
        // 真流式：通过回调实时更新消息
        const streamResult = await new Promise<{ content: string; toolCalls: ToolCallDef[] | null; finishReason: string }>((resolve, reject) => {
          getProvider().chatCompletionStream(
            { ...ccOpts, messages: chatMsgs },
            {
              onToken: (token) => {
                initContent += token;
                updateMsg(cid, replyId, { content: initContent });
              },
              onFinish: (result) => resolve(result),
              onError: (err) => reject(err),
            },
          );
        });
        initContent = streamResult.content;
        initToolCalls = streamResult.toolCalls;
        initFR = streamResult.finishReason;
      } else {
        // 假流式（默认）：等完整返回后打字机效果
        const result = await getProvider().chatCompletion({ ...ccOpts, messages: chatMsgs });
        initContent = result.content;
        initToolCalls = result.toolCalls;
        initFR = result.finishReason;
        if (initContent) updateMsg(cid, replyId, { content: initContent });
      }

      if (initFR === 'tool_calls' && initToolCalls && initToolCalls.length > 0) {
        const MAX_FC_ROUNDS = 5;
        let fcMsgs = [...chatMsgs];
        let curContent = initContent;
        let curToolCalls: any[] | null = initToolCalls;
        const lastImagesRef = { current: [] as string[] };
        let round = 0;

        while (curToolCalls && curToolCalls.length > 0 && round < MAX_FC_ROUNDS) {
          round++;
          addLog('info', `[Chat-FC] 第${round}轮工具调用: ${curToolCalls.map((tc: any) => tc.function?.name).join(', ')}`);
          fcMsgs.push({ role: 'assistant', content: curContent, tool_calls: curToolCalls });
          const toolResults: { tool_call_id: string; content: string }[] = [];

          for (const tc of curToolCalls) {
            const result = await executeToolCall(
              tc, cid, cid, userInput, ac, lastImagesRef,
              defaultImageModel, defaultVideoModel, tavilyApiKey, imageStreamingMode, videoStreamingMode,
              getProvider, baseR, keyR, setConvs, updateMsg, addLog, toast, bridgeRef, videoPolls, setSendings,
              searchMemories || (() => '暂无记忆数据'),
              windowMsgs.map(m => ({ role: m.role, content: m.content })),
              convNow.model,
            );
            toolResults.push(result);
          }

          fcMsgs.push(...toolResults.map(r => ({ role: 'tool', tool_call_id: r.tool_call_id, content: r.content })));

          const nextMsgId = gid();
          setConvs(p => p.map(c => c.id === cid ? { ...c, msgs: [...c.msgs, { id: nextMsgId, role: 'assistant' as const, content: '...', images: [], ts: Date.now() }] } : c));
          const nextResult = await getProvider().chatCompletion(
            { ...ccOpts, messages: fcMsgs }
          );
          if (nextResult.content) updateMsg(cid, nextMsgId, { content: nextResult.content });

          curContent = nextResult.content;
          curToolCalls = nextResult.finishReason === 'tool_calls' ? nextResult.toolCalls : null;
          if (!curToolCalls) addLog('success', `[Chat-FC] 工具链完成，共${round}轮`);
        }

        if (round >= MAX_FC_ROUNDS) addLog('warn', `[Chat-FC] 达到最大轮次限制 (${MAX_FC_ROUNDS})`);
        const hasActivePoll = Object.keys(videoPolls.current).length > 0;
        if (!hasActivePoll) setSendings(p => { const n = new Set(p); n.delete(cid); return n; });

      } else {
        addLog('success', `[Chat] 收到回复 (${initContent.length}字)`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateMsg(cid, replyId, { content: '[已取消]' });
      } else {
        addLog('error', `[Chat] 错误: ${err.message}`);
        updateMsg(cid, replyId, { content: `错误: ${err.message}` });
      }
    } finally {
      const hasActivePoll = Object.keys(videoPolls.current).length > 0;
      if (!hasActivePoll) setSendings(p => { const n = new Set(p); n.delete(cid); return n; });
      delete abortRef.current[cid];
    }
  }, [roles, getMemoryContext, defaultImageModel, defaultVideoModel, tavilyApiKey, chatStreamingMode, imageStreamingMode, videoStreamingMode, addLog, baseR, keyR, updateMsg, toast, bridgeRef, setConvs, setSendings]);

  const send = useCallback(async () => {
    if ((!input.trim() && pendingImages.length === 0) || !currentModel) return;
    let cid = activeId;
    if (!cid) { cid = newConv(currentModel); }
    const convNow = convsRef.current.find(c => c.id === cid) || { id: cid!, title: '新对话', model: currentModel, roleId: 'default' as const, msgs: [] as ChatMsg[], ts: Date.now() };
    const userContent: any[] = [];
    if (input.trim()) userContent.push({ type: 'text', text: input.trim() });
    for (const img of pendingImages) {
      const resolved = await resolveToDataURL(img);
      userContent.push({ type: 'image_url', image_url: { url: resolved } });
    }
    const userMsg: ChatMsg = { id: gid(), role: 'user', content: input.trim() || '[图片]', images: pendingImages, ts: Date.now() };
    const isFirstMsg = convNow.msgs.length === 0;
    const userInput = input.trim();

    setConvs(p => {
      const exists = p.find(c => c.id === cid);
      if (exists) return p.map(c => c.id === cid ? { ...c, msgs: [...c.msgs, userMsg], title: isFirstMsg ? (userInput.slice(0, 20) || '[图片]') : c.title } : c);
      return [{ ...convNow, msgs: [userMsg], title: userInput.slice(0, 20) || '[图片]' }, ...p];
    });
    setInput(''); setPendingImages([]);
    setSendings(p => new Set(p).add(cid!));
    const ac = new AbortController(); abortRef.current[cid!] = ac;

    const modelCat = catModel(convNow.model);
    if (modelCat === 'video') return sendVideo(cid!, ac, userInput, convNow);
    if (modelCat === 'image') return sendImage(cid!, ac, userInput, userContent, convNow);
    return sendChat(cid!, ac, userInput, userContent, convNow);
  }, [input, pendingImages, currentModel, activeId, newConv, sendVideo, sendImage, sendChat, setConvs, setSendings]);

  const cancel = useCallback((id: string) => {
    abortRef.current[id]?.abort(); delete abortRef.current[id];
    setConvs(prev => prev.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        msgs: c.msgs.map(m => {
          if (m.toolCall?.status === 'processing') {
            if (videoPolls.current[m.id]) { clearInterval(videoPolls.current[m.id]); delete videoPolls.current[m.id]; }
            return { ...m, content: m.content || '[已取消]', toolCall: { ...m.toolCall, status: 'failed' as const, label: '已取消', error: '用户取消' } };
          }
          return m;
        })
      };
    }));
    setSendings(p => { const n = new Set(p); n.delete(id); return n; });
  }, []);

  const removePendingImage = useCallback((i: number) => setPendingImages(prev => prev.filter((_, j) => j !== i)), []);

  const deleteMessage = useCallback((msgId: string) => {
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, msgs: c.msgs.filter(m => m.id !== msgId) } : c));
  }, [activeId]);

  const regenerate = useCallback(() => {
    if (!conv) return;
    const msgs = conv.msgs;
    if (msgs.length < 2) return;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const lastUserMsg = msgs[msgs.length - 2];
    if (lastUserMsg.role !== 'user') return;
    setInput(lastUserMsg.content === '[图片]' ? '' : lastUserMsg.content);
    if (lastUserMsg.images.length > 0) setPendingImages(lastUserMsg.images.slice(0, 9));
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, msgs: c.msgs.slice(0, -2) } : c));
  }, [conv, activeId]);

  return {
    convs, activeId, input, sendings, pendingImages, isDragging, previewUrl, drawerOpen,
    conv, chatModels, imgModels, vidModels, currentModel, currentModelCat, canSend,
    currentRole, fileInputRef,
    setInput, setActiveId, setPreviewUrl, setDrawerOpen, setPendingImages, setRole,
    newConv, delConv, setConvModel, handleImageUpload,
    handleDragOver, handleDragLeave, handleDrop,
    send, cancel, removePendingImage, addPendingImages, deleteMessage, regenerate,
  };
}
