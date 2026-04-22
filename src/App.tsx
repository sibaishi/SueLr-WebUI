import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Tab, ThemeMode, ModelInfo, LogEntry, BridgeRef, AgentRole, ApiConfig } from './lib/types';
import { DARK, LIGHT, PRESET_ROLES } from './lib/constants';
import { ftime, loadJSON, debouncedSaveJSON, gid } from './lib/utils';
import { checkServer, serverLoadSettings, serverSaveSettings } from './lib/serverStorage';
import type { ProviderConfig } from './lib/providers';
import { createProvider } from './lib/providers';
import { useIsMobile } from './hooks';
import { useMemory } from './hooks/useMemory';
import { TCtx } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/ios';
import { DesktopSidebar, MobileBottomNav } from './components/Navigation';
import { ChatPanel } from './components/ChatPanel';
import { ImagePanel } from './components/ImagePanel';
import { VideoPanel } from './components/VideoPanel';
import { SettingsPanel } from './components/SettingsPanel';

type StreamMode = 'stream' | 'non-stream';
const mapLegacyStreamingMode = (value: unknown): StreamMode => value === 'real' || value === 'stream' ? 'stream' : 'non-stream';

// ==================== 主应用 ====================
export default function App() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>(loadJSON('ai_tab', 'settings'));
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>(loadJSON('ai_configs', []));
  const [activeConfigId, setActiveConfigId] = useState(loadJSON('ai_active_config', ''));
  const [base, setBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadJSON('ai_theme', 'dark'));
  const [defaultImageModel, setDefaultImageModel] = useState('');
  const [defaultVideoModel, setDefaultVideoModel] = useState('');
  const [customRoles, setCustomRoles] = useState<AgentRole[]>(loadJSON('ai_custom_roles', []));
  const [tavilyApiKey, setTavilyApiKey] = useState(loadJSON('ai_tavily_key', ''));
  const memory = useMemory();
  const roles = useMemo(() => [...PRESET_ROLES, ...customRoles], [customRoles]);
  const [splashFading, setSplashFading] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  const bridgeRef = useRef<BridgeRef>({ addToImageGallery: () => {}, addToVideoGallery: () => {}, addToChatPending: () => {} });
  const providerConfig = useMemo<ProviderConfig | undefined>(() => {
    const config = apiConfigs.find(c => c.id === activeConfigId);
    return config?.providerConfig;
  }, [apiConfigs, activeConfigId]);
  const [chatStreamingMode, setChatStreamingMode] = useState<StreamMode>(() => mapLegacyStreamingMode(loadJSON('ai_chat_streaming_mode', loadJSON('ai_streaming_mode', 'non-stream'))));
  const [imageStreamingMode, setImageStreamingMode] = useState<StreamMode>(() => mapLegacyStreamingMode(loadJSON('ai_image_streaming_mode', 'stream')));
  const [videoStreamingMode, setVideoStreamingMode] = useState<StreamMode>(() => mapLegacyStreamingMode(loadJSON('ai_video_streaming_mode', 'stream')));

  const applyConfig = useCallback((id: string) => {
    const config = apiConfigs.find(c => c.id === id);
    if (!config) return;
    if (activeConfigId && activeConfigId !== id) {
      setApiConfigs(prev => prev.map(c => c.id === activeConfigId ? { ...c, defaultImageModel, defaultVideoModel } : c));
    }
    setBase(config.base); setApiKey(config.apiKey); setModels(config.models);
    setDefaultImageModel(config.defaultImageModel); setDefaultVideoModel(config.defaultVideoModel);
    setActiveConfigId(id); debouncedSaveJSON('ai_active_config', id);
  }, [apiConfigs, activeConfigId, defaultImageModel, defaultVideoModel]);

  const addNewConfig = useCallback(() => {
    const id = gid();
    setApiConfigs(prev => [...prev, { id, name: '', base: '', apiKey: '', models: [], defaultImageModel: '', defaultVideoModel: '' }]);
    return id;
  }, []);

  const deleteConfig = useCallback((id: string) => {
    setApiConfigs(prev => { const next = prev.filter(c => c.id !== id); if (id === activeConfigId && next.length > 0) setTimeout(() => applyConfig(next[0].id), 0); return next; });
  }, [activeConfigId, applyConfig]);

  const [systemDark, setSystemDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { const m = window.matchMedia('(prefers-color-scheme: dark)'); const h = (e: MediaQueryListEvent) => setSystemDark(e.matches); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);
  const colors = themeMode === 'system' ? (systemDark ? DARK : LIGHT) : themeMode === 'dark' ? DARK : LIGHT;

  useEffect(() => { const theme = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode; document.documentElement.setAttribute('data-theme', theme); }, [themeMode, systemDark]);

  useEffect(() => {
    debouncedSaveJSON('ai_configs', apiConfigs); debouncedSaveJSON('ai_active_config', activeConfigId);
    debouncedSaveJSON('ai_theme', themeMode); debouncedSaveJSON('ai_custom_roles', customRoles);
    debouncedSaveJSON('ai_tavily_key', tavilyApiKey); debouncedSaveJSON('ai_tab', tab);
    debouncedSaveJSON('ai_chat_streaming_mode', chatStreamingMode);
    debouncedSaveJSON('ai_image_streaming_mode', imageStreamingMode);
    debouncedSaveJSON('ai_video_streaming_mode', videoStreamingMode);
    serverSaveSettings({ ai_configs: apiConfigs, ai_active_config: activeConfigId, ai_theme: themeMode, ai_custom_roles: customRoles, ai_tavily_key: tavilyApiKey, ai_tab: tab, ai_chat_streaming_mode: chatStreamingMode, ai_image_streaming_mode: imageStreamingMode, ai_video_streaming_mode: videoStreamingMode });
  }, [apiConfigs, activeConfigId, themeMode, customRoles, tavilyApiKey, tab, chatStreamingMode, imageStreamingMode, videoStreamingMode]);

  const addLog = useCallback((level: string, msg: string) => { const time = ftime(Date.now()); setLogs(prev => [{ time, level, msg }, ...prev].slice(0, 500)); }, []);

  useEffect(() => {
    const init = async () => {
      let cfgs = apiConfigs; let activeId = activeConfigId;
      const serverOk = await checkServer().catch(() => false);
      if (serverOk) {
        addLog('success', '本地存储服务已连接');
        const ss = await serverLoadSettings().catch(() => null as any);
        if (ss) {
          if (ss.ai_configs?.length) { cfgs = ss.ai_configs; setApiConfigs(cfgs); }
          if (ss.ai_active_config) { activeId = ss.ai_active_config; setActiveConfigId(activeId); }
          if (ss.ai_theme) setThemeMode(ss.ai_theme);
          if (ss.ai_custom_roles?.length) setCustomRoles(ss.ai_custom_roles);
          if (ss.ai_tavily_key) setTavilyApiKey(ss.ai_tavily_key);
          if (ss.ai_tab) setTab(ss.ai_tab);
          if (ss.ai_chat_streaming_mode || ss.ai_streaming_mode) setChatStreamingMode(mapLegacyStreamingMode(ss.ai_chat_streaming_mode ?? ss.ai_streaming_mode));
          if (ss.ai_image_streaming_mode) setImageStreamingMode(mapLegacyStreamingMode(ss.ai_image_streaming_mode));
          if (ss.ai_video_streaming_mode) setVideoStreamingMode(mapLegacyStreamingMode(ss.ai_video_streaming_mode));
          addLog('success', '已从本地存储恢复设置');
        }
      } else { addLog('info', '本地存储服务未启动，数据仅保存在浏览器中'); }
      const config = cfgs.find((c: ApiConfig) => c.id === activeId);
      if (config) {
        setBase(config.base); setApiKey(config.apiKey); setModels(config.models);
        setDefaultImageModel(config.defaultImageModel); setDefaultVideoModel(config.defaultVideoModel);
        if (config.models.length === 0 && config.base && config.apiKey) {
          try {
            const provider = createProvider(config.base, config.apiKey, config.providerConfig);
            const ms = await provider.listModels();
            setModels(ms); setApiConfigs(prev => prev.map(c => c.id === config.id ? { ...c, models: ms } : c));
            addLog('success', `启动时自动加载 ${ms.length} 个模型`);
          } catch {}
        } else if (config.models.length > 0) { addLog('success', `已加载 ${config.models.length} 个缓存模型`); }
      }
      setSplashFading(true); setTimeout(() => setSplashHidden(true), 500);
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (isMobile) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const tabs: Tab[] = ['chat', 'image', 'video', 'settings'];
        setTab(tabs[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile]);

  return (
    <TCtx.Provider value={colors}>
      <ToastProvider>
      {!splashHidden && <SplashScreen fading={splashFading} />}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif', background: 'transparent', color: colors.text }}>
        {!isMobile && <DesktopSidebar tab={tab} setTab={setTab} modelCount={models.length} themeMode={themeMode} setThemeMode={setThemeMode} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', display: tab === 'chat' ? 'flex' : 'none' }}><ErrorBoundary><ChatPanel base={base} apiKey={apiKey} models={models} addLog={addLog} isMobile={isMobile} bridgeRef={bridgeRef} defaultImageModel={defaultImageModel} defaultVideoModel={defaultVideoModel} roles={roles} getMemoryContext={memory.getMemoryContext} scheduleExtraction={memory.scheduleExtraction} tavilyApiKey={tavilyApiKey} providerConfig={providerConfig} chatStreamingMode={chatStreamingMode} imageStreamingMode={imageStreamingMode} videoStreamingMode={videoStreamingMode} activeTab={tab} searchMemories={memory.searchMemories} /></ErrorBoundary></div>
          <div style={{ flex: 1, overflow: 'hidden', display: tab === 'image' ? 'flex' : 'none' }}><ErrorBoundary><ImagePanel base={base} apiKey={apiKey} models={models} addLog={addLog} isMobile={isMobile} bridgeRef={bridgeRef} onAddToChat={(urls: string[]) => { bridgeRef.current.addToChatPending(urls); setTab('chat'); }} providerConfig={providerConfig} imageStreamingMode={imageStreamingMode} /></ErrorBoundary></div>
          <div style={{ flex: 1, overflow: 'hidden', display: tab === 'video' ? 'flex' : 'none' }}><ErrorBoundary><VideoPanel base={base} apiKey={apiKey} models={models} addLog={addLog} isMobile={isMobile} bridgeRef={bridgeRef} onAddToChat={(_prompt: string, videoUrl?: string) => { if (videoUrl) bridgeRef.current.addToChatPending([videoUrl]); setTab('chat'); }} providerConfig={providerConfig} videoStreamingMode={videoStreamingMode} /></ErrorBoundary></div>
          <div style={{ flex: 1, overflow: 'hidden', display: tab === 'settings' ? 'flex' : 'none' }}><ErrorBoundary><SettingsPanel apiConfigs={apiConfigs} setApiConfigs={setApiConfigs} activeConfigId={activeConfigId} setActiveConfigId={setActiveConfigId} applyConfig={applyConfig} addNewConfig={addNewConfig} deleteConfig={deleteConfig} base={base} apiKey={apiKey} setBase={setBase} setApiKey={setApiKey} models={models} setModels={setModels} addLog={addLog} logs={logs} onClearLogs={() => setLogs([])} themeMode={themeMode} setThemeMode={setThemeMode} isMobile={isMobile} defaultImageModel={defaultImageModel} setDefaultImageModel={setDefaultImageModel} defaultVideoModel={defaultVideoModel} setDefaultVideoModel={setDefaultVideoModel} roles={roles} customRoles={customRoles} setCustomRoles={setCustomRoles} memories={memory.memories} onDeleteMemory={memory.deleteMemory} onClearMemories={memory.clearMemories} exportMemories={memory.exportMemories} tavilyApiKey={tavilyApiKey} setTavilyApiKey={setTavilyApiKey} chatStreamingMode={chatStreamingMode} setChatStreamingMode={setChatStreamingMode} imageStreamingMode={imageStreamingMode} setImageStreamingMode={setImageStreamingMode} videoStreamingMode={videoStreamingMode} setVideoStreamingMode={setVideoStreamingMode} /></ErrorBoundary></div>
        </div>
        {isMobile && <MobileBottomNav tab={tab} setTab={setTab} />}
      </div>
    </ToastProvider>
  </TCtx.Provider>
  );
}
