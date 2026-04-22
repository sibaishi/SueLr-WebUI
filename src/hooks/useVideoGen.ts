import { useState, useEffect, useRef, useCallback, useMemo, type MutableRefObject } from 'react';
import type { ModelInfo, GalleryItem, VTask, BridgeRef } from '../lib/types';
import type { ProviderConfig } from '../lib/providers';
import { gid } from '../lib/utils';
import { fileToB64, compressImage } from '../lib/image';
import { useProvider } from '.';
import { useToast } from '../contexts/ToastContext';
import { serverLoadVideos, serverSaveVideo, serverClearVideos } from '../lib/serverStorage';
import { startVideoPoll, waitForVideoCompletion } from '../lib/videoPoll';

export function useVideoGen(
  base: string,
  apiKey: string,
  models: ModelInfo[],
  addLog: (l: string, m: string) => void,
  bridgeRef: MutableRefObject<BridgeRef>,
  providerConfig?: ProviderConfig,
  videoStreamingMode: 'stream' | 'non-stream' = 'stream',
) {
  const toast = useToast();
  const [tasks, setTasks] = useState<VTask[]>([]);
  const [completedVideos, setCompletedVideos] = useState<GalleryItem[]>([]);
  const [model, setModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720p');
  const [vidRatio, setVidRatio] = useState('16:9');
  const [refImages, setRefImages] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const abortMap = useRef<Record<string, AbortController>>({});
  const { baseR, keyR, getProvider } = useProvider(base, apiKey, providerConfig);

  const vidModels = useMemo(() => models.filter(m => m.cat === 'video'), [models]);
  const activeCount = useMemo(() => tasks.filter(t => t.status === '鎻愪氦涓?' || t.status === '澶勭悊涓?').length, [tasks]);
  const vlog = useCallback((msg: string) => addLog('info', `[Video] ${msg}`), [addLog]);

  const addToCompleted = useCallback((item: GalleryItem) => {
    setCompletedVideos(prev => [item, ...prev]);
  }, []);

  useEffect(() => { bridgeRef.current.addToVideoGallery = addToCompleted; }, [addToCompleted, bridgeRef]);

  useEffect(() => {
    serverLoadVideos().then(items => {
      if (items.length > 0) setCompletedVideos(items);
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(abortMap.current).forEach(ac => ac.abort());
      Object.values(pollRefs.current).forEach(id => clearInterval(id));
    };
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        const b64 = await compressImage(f);
        setRefImages(prev => [...prev, b64]);
      }
      if (f.type.startsWith('audio/')) {
        const b64 = await fileToB64(f);
        setAudioFile({ name: f.name, type: f.type, data: b64 });
      }
    }
  }, []);

  const submit = useCallback(async () => {
    if (!prompt.trim() || !model) return;
    const id = gid();
    const task: VTask = { id, taskId: '', status: '鎻愪氦涓?', prompt: prompt.trim(), model, params: `${resolution} ${vidRatio} ${duration}s` };
    setTasks(prev => [task, ...prev]);
    vlog(`鎻愪氦浠诲姟: ${prompt.slice(0, 30)}...`);

    const ac = new AbortController();
    abortMap.current[id] = ac;

    try {
      const { taskId: tid } = await getProvider().submitVideoGeneration({
        model,
        prompt: prompt.trim(),
        duration,
        aspect_ratio: vidRatio,
        resolution,
        signal: ac.signal,
      });

      vlog(`浠诲姟宸叉彁浜わ紒ID: ${tid}`);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, taskId: tid, status: '澶勭悊涓?' } : t));

      const onSuccess = (url: string) => {
        vlog('瑙嗛鐢熸垚瀹屾垚锛?');
        toast('瑙嗛鐢熸垚瀹屾垚锛?', 'success');
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: '宸插畬鎴?', videoUrl: url } : t));
        const vidItem = { id, url, prompt: task.prompt, model, ts: Date.now() };
        setCompletedVideos(prev => [vidItem, ...prev]);
        serverSaveVideo(vidItem);
      };
      const onNoUrl = () => {
        vlog('瀹屾垚浣嗘湭鑾峰緱瑙嗛URL');
        toast('瑙嗛鐢熸垚瀹屾垚浣嗘湭鑾峰緱URL', 'error');
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: '澶辫触', error: '鏈幏寰楄棰慤RL' } : t));
      };
      const onFailure = (err: string) => {
        vlog(`澶辫触: ${err}`);
        toast(`瑙嗛鐢熸垚澶辫触: ${err.slice(0, 60)}`, 'error');
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: '澶辫触', error: err } : t));
      };
      const onPollError = (errMsg: string) => {
        vlog(`杞閿欒: ${errMsg}`);
      };

      if (videoStreamingMode === 'stream') {
        startVideoPoll({ taskId: tid, pollKey: id, pollRefs, baseR, keyR, onSuccess, onNoUrl, onFailure, onPollError });
      } else {
        await waitForVideoCompletion({ taskId: tid, baseR, keyR, onSuccess, onNoUrl, onFailure, onPollError });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        vlog(`鎻愪氦澶辫触: ${err.message}`);
        addLog('error', `[Video] 鎻愪氦澶辫触: ${err.message}`);
      }
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: '澶辫触', error: err.message } : t));
    } finally {
      delete abortMap.current[id];
    }
  }, [prompt, model, resolution, vidRatio, duration, vlog, toast, addLog, baseR, keyR, getProvider, videoStreamingMode]);

  const cancelTask = useCallback((tid: string) => {
    if (abortMap.current[tid]) { abortMap.current[tid].abort(); delete abortMap.current[tid]; }
    if (pollRefs.current[tid]) { clearInterval(pollRefs.current[tid]); delete pollRefs.current[tid]; }
    setTasks(prev => prev.map(t =>
      t.id === tid && (t.status === '鎻愪氦涓?' || t.status === '澶勭悊涓?')
        ? { ...t, status: '宸插彇娑?' } : t
    ));
  }, []);

  const cancelAll = useCallback(() => {
    Object.values(abortMap.current).forEach(ac => ac.abort());
    Object.values(pollRefs.current).forEach(id => clearInterval(id));
  }, []);

  const clearCompleted = useCallback(() => {
    setCompletedVideos([]);
    serverClearVideos();
  }, []);

  return {
    tasks, completedVideos, model, setModel, prompt, setPrompt, mode, setMode,
    duration, setDuration, resolution, setResolution, vidRatio, setVidRatio,
    refImages, setRefImages, audioFile, setAudioFile, previewUrl, setPreviewUrl,
    drawerOpen, setDrawerOpen, vidModels, activeCount,
    handleFileUpload, submit, cancelTask, cancelAll, clearCompleted,
  };
}
