import { useState, useEffect, useRef, useCallback, useMemo, type MutableRefObject } from 'react';
import type { ModelInfo, ImgTask, GalleryItem, BridgeRef } from '../lib/types';
import type { ProviderConfig } from '../lib/providers';
import { gid } from '../lib/utils';
import { extractImages, extractText } from '../lib/api';
import { compressImage } from '../lib/image';
import { useProvider } from '.';
import { processImages } from '../lib/store';
import { serverLoadGallery, serverClearGallery } from '../lib/serverStorage';
import { useToast } from '../contexts/ToastContext';

export function useImageGen(
  base: string,
  apiKey: string,
  models: ModelInfo[],
  addLog: (l: string, m: string) => void,
  bridgeRef: MutableRefObject<BridgeRef>,
  providerConfig?: ProviderConfig,
  imageStreamingMode: 'stream' | 'non-stream' = 'stream',
) {
  const toast = useToast();
  const [tasks, setTasks] = useState<ImgTask[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('auto');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [refImages, setRefImages] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const processingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const addLogR = useRef(addLog);
  useEffect(() => { addLogR.current = addLog; }, [addLog]);

  const abortMap = useRef<Record<string, AbortController>>({});
  const { getProvider } = useProvider(base, apiKey, providerConfig);

  const imgModels = useMemo(() => models.filter(m => m.cat === 'image'), [models]);
  const activeCount = useMemo(() => tasks.filter(t => t.status === 'queued' || t.status === 'processing').length, [tasks]);

  const addToGallery = useCallback((items: GalleryItem[]) => {
    setGallery(prev => [...items, ...prev]);
  }, []);

  // Register bridge callback
  useEffect(() => { bridgeRef.current.addToImageGallery = addToGallery; }, [addToGallery]);

  // Load gallery from server on mount
  useEffect(() => {
    serverLoadGallery().then(items => {
      if (items.length > 0) setGallery(items);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { Object.values(abortMap.current).forEach(ac => ac.abort()); };
  }, []);

  const processNext = useCallback(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) return;

    const taskId = queueRef.current.shift()!;
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task || task.status === 'cancelled') {
      setTimeout(() => processNext(), 10);
      return;
    }

    processingRef.current = true;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'processing' as const } : t));

    const ac = new AbortController();
    abortMap.current[taskId] = ac;

    addLogR.current('info', `[Image] 开始生成: ${task.prompt.slice(0, 30)}... (${task.model})`);

    const ratioText = task.ratio === 'auto' ? '' : `(图片比例: ${task.ratio})`;
    const content: any[] = [{ type: 'text', text: `${task.prompt} ${ratioText}`.trim() }];
    task.refImages.forEach(img => content.push({ type: 'image_url', image_url: { url: img } }));

    getProvider().generateImage({ model: task.model, content, signal: ac.signal, stream: imageStreamingMode === 'stream' })
      .then(async ({ rawData: data }) => {
        const rawImgs = extractImages(data);
        if (rawImgs.length === 0) {
          const txt = extractText(data);
          throw new Error(txt ? `模型返回文本而非图片: ${txt.slice(0, 100)}` : '模型未返回图片');
        }
        const { urls: imgs } = await processImages(rawImgs, taskId, task.prompt, task.model);
        return imgs;
      })
      .then(imgs => {
        addLogR.current('success', `[Image] 生成完成！获得 ${imgs.length} 张图片`);
        toast(`图片生成完成！获得 ${imgs.length} 张图片`, 'success');
        const newItems: GalleryItem[] = imgs.map((url, i) => ({
          id: `${taskId}_${i}`, url, prompt: task.prompt, model: task.model, ts: Date.now(),
        }));
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' as const, images: imgs } : t));
        setGallery(prev => [...newItems, ...prev]);
      })
      .catch(err => {
        if (ac.signal.aborted) {
          addLogR.current('warn', `[Image] 任务已取消`);
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' as const } : t));
        } else {
          addLogR.current('error', `[Image] 生成失败: ${err.message}`);
          toast(`图片生成失败: ${err.message.slice(0, 60)}`, 'error');
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed' as const, error: err.message } : t));
        }
      })
      .finally(() => {
        processingRef.current = false;
        delete abortMap.current[taskId];
        setTimeout(() => processNext(), 100);
      });
  }, [getProvider, imageStreamingMode]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || !model) return;
    const task: ImgTask = {
      id: gid(), prompt: prompt.trim(), model, ratio,
      refImages: mode === 'image' ? refImages : [],
      status: 'queued', images: [], ts: Date.now(),
    };
    setTasks(prev => [task, ...prev]);
    queueRef.current.push(task.id);
    addLog('info', `[Image] 任务已提交: ${task.prompt.slice(0, 30)}...`);
    setTimeout(() => processNext(), 0);
  }, [prompt, model, ratio, mode, refImages, addLog, processNext]);

  const cancelTask = useCallback((id: string) => {
    queueRef.current = queueRef.current.filter(qid => qid !== id);
    if (abortMap.current[id]) { abortMap.current[id].abort(); delete abortMap.current[id]; }
    setTasks(prev => prev.map(t =>
      t.id === id && (t.status === 'queued' || t.status === 'processing')
        ? { ...t, status: 'cancelled' as const } : t
    ));
  }, []);

  const cancelAll = useCallback(() => {
    queueRef.current = [];
    Object.values(abortMap.current).forEach(ac => ac.abort());
  }, []);

  const downloadImg = useCallback((url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = name;
    if (!url.startsWith('data:')) a.target = '_blank';
    a.click();
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        const b64 = await compressImage(f);
        setRefImages(prev => [...prev, b64]);
      }
    }
  }, []);

  const clearGallery = useCallback(() => {
    setGallery([]);
    serverClearGallery();
  }, []);

  return {
    tasks, gallery, model, prompt, ratio, mode, refImages, previewUrl, drawerOpen, imgModels, activeCount,
    setModel, setPrompt, setRatio, setMode, setRefImages, setPreviewUrl, setDrawerOpen,
    handleGenerate, cancelTask, cancelAll, downloadImg, handleFileUpload, clearGallery,
  };
}
