import { useState } from 'react';
import { useT } from '../contexts/ThemeContext';
import type { ModelInfo, LogEntry, ThemeMode, ApiConfig, AgentRole, Memory } from '../lib/types';
import { PRESET_ROLES, THEME_LABELS } from '../lib/constants';
import { gid, debouncedSaveJSON } from '../lib/utils';
import { checkPassword, getHiddenConfig } from '../lib/hidden';
import { createProvider, tavilySearch } from '../lib/providers';
import { IOSSegmentedControl, IOSCard, IOSButton, IOSSelect, IOSInput, IOSLabel, CollapsibleSection, ModelCategoryList, RoleIcon, RoleEditor, LogPanel, glass } from './ios';
import type { ProviderConfig } from '../lib/types';
import { DEFAULT_PROVIDER_CONFIG } from '../lib/providers';
import { Palette, Clapperboard, Zap, Search, X, Settings } from 'lucide-react';

export function SettingsPanel({ apiConfigs, setApiConfigs, activeConfigId, setActiveConfigId, applyConfig, addNewConfig, deleteConfig, base, apiKey, setBase, setApiKey, models, setModels, addLog, logs, onClearLogs, themeMode, setThemeMode, isMobile, defaultImageModel, setDefaultImageModel, defaultVideoModel, setDefaultVideoModel, roles, customRoles, setCustomRoles, memories, onDeleteMemory, onClearMemories, exportMemories, tavilyApiKey, setTavilyApiKey, chatStreamingMode, setChatStreamingMode, imageStreamingMode, setImageStreamingMode, videoStreamingMode, setVideoStreamingMode }: {
  apiConfigs: ApiConfig[]; setApiConfigs: React.Dispatch<React.SetStateAction<ApiConfig[]>>; activeConfigId: string; setActiveConfigId: (id: string) => void; applyConfig: (id: string) => void; addNewConfig: () => string; deleteConfig: (id: string) => void;
  base: string; apiKey: string; setBase: (v: string) => void; setApiKey: (v: string) => void;
  models: ModelInfo[]; setModels: (m: ModelInfo[]) => void; addLog: (l: string, m: string) => void; logs: LogEntry[]; onClearLogs: () => void;
  themeMode: ThemeMode; setThemeMode: (t: ThemeMode) => void; isMobile: boolean;
  defaultImageModel: string; setDefaultImageModel: (v: string) => void; defaultVideoModel: string; setDefaultVideoModel: (v: string) => void;
  roles: AgentRole[]; customRoles: AgentRole[]; setCustomRoles: React.Dispatch<React.SetStateAction<AgentRole[]>>;
  memories: Memory[]; onDeleteMemory: (id: string) => void; onClearMemories: () => void; exportMemories: () => string;
  tavilyApiKey: string; setTavilyApiKey: (v: string) => void;
  chatStreamingMode: 'stream' | 'non-stream'; setChatStreamingMode: (v: 'stream' | 'non-stream') => void;
  imageStreamingMode: 'stream' | 'non-stream'; setImageStreamingMode: (v: 'stream' | 'non-stream') => void;
  videoStreamingMode: 'stream' | 'non-stream'; setVideoStreamingMode: (v: 'stream' | 'non-stream') => void;
}) {
  const T = useT();
  const [editingRole, setEditingRole] = useState<AgentRole | null>(null);
  const [viewingRole, setViewingRole] = useState<AgentRole | null>(null);
  const updateConfig = (patch: Partial<ApiConfig>) => {
    if (!activeConfigId) return;
    setApiConfigs(prev => prev.map(c => c.id === activeConfigId ? { ...c, ...patch } : c));
  };
  const testConn = async () => {
    const pc = apiConfigs.find(c => c.id === activeConfigId)?.providerConfig;
    const endpoint = pc?.modelsEndpoint || '/v1/models';
    addLog('info', `测试连接: ${base}${endpoint} ...`);
    try {
      const provider = createProvider(base, apiKey, pc);
      const ms = await provider.listModels();
      setModels(ms); updateConfig({ models: ms });
      addLog('success', `连接成功！发现 ${ms.length} 个模型`);
    } catch (err: any) { addLog('error', `连接失败: ${err.message}`); }
  };
  const importRoles = () => { const s = prompt('粘贴角色 JSON'); if (!s) return; try { const r = JSON.parse(s); if (Array.isArray(r)) { setCustomRoles(r); addLog('success', `导入 ${r.length} 个角色`); } } catch { addLog('error', 'JSON 格式错误'); } };
  const exportRoles = () => { navigator.clipboard.writeText(JSON.stringify(customRoles)); addLog('success', '角色配置已复制到剪贴板'); };
  const saveCustomRole = (r: AgentRole) => { setCustomRoles(prev => { const exists = prev.find(x => x.id === r.id); return exists ? prev.map(x => x.id === r.id ? r : x) : [...prev, r]; }); setEditingRole(null); };
  const deleteCustomRole = (id: string) => { setCustomRoles(prev => prev.filter(r => r.id !== id)); };
  const exportMemoriesToFile = () => { const json = exportMemories(); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'memories.json'; a.click(); URL.revokeObjectURL(url); };

  const settingsForm = (
    <div className="flex-col" style={{ gap: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>API 配置</h2>
      {apiConfigs.length > 1 && (
        <div className="flex-center" style={{ gap: 6, flexWrap: 'wrap' }}>
          {apiConfigs.map(c => (
            <button key={c.id} onClick={() => applyConfig(c.id)} style={{
              padding: '7px 16px', borderRadius: 12, border: c.id === activeConfigId ? 'none' : `1px solid ${T.border}`, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: c.id === activeConfigId ? `linear-gradient(135deg, ${T.blue}, ${T.purple})` : 'transparent',
              color: c.id === activeConfigId ? '#fff' : T.text2, transition: 'all 0.25s',
              boxShadow: c.id === activeConfigId ? `0 4px 16px ${T.blue}40` : 'none',
            }}>{c.name || '未命名'} ({c.models.length})</button>
          ))}
        </div>
      )}
      <div><IOSLabel>配置名称</IOSLabel><IOSInput value={apiConfigs.find(c => c.id === activeConfigId)?.name || ''} onChange={v => updateConfig({ name: v })} placeholder="如：6789api" /></div>
      <div><IOSLabel>接口地址</IOSLabel><IOSInput value={base} onChange={v => { setBase(v); updateConfig({ base: v }); }} placeholder="https://..." /></div>
      <div><IOSLabel>API 密钥</IOSLabel><IOSInput value={apiKey} onChange={v => { setApiKey(v); updateConfig({ apiKey: v }); }} type="password" placeholder="sk-..." /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <IOSButton label="测试连接" onClick={testConn} />
        <IOSButton label="+ 添加配置" onClick={() => {
          if (checkPassword(apiKey)) {
            const hc = getHiddenConfig();
            const id = gid();
            const nc: ApiConfig = { id, name: hc.name, base: hc.base, apiKey: hc.apiKey, models: [], defaultImageModel: hc.defaultImageModel, defaultVideoModel: hc.defaultVideoModel };
            setApiConfigs(prev => [...prev, nc]);
            setBase(hc.base); setApiKey(hc.apiKey); setModels([]);
            setDefaultImageModel(hc.defaultImageModel); setDefaultVideoModel(hc.defaultVideoModel);
            setActiveConfigId(id); debouncedSaveJSON('ai_active_config', id);
            setTavilyApiKey(hc.tavilyKey);
            addLog('success', `配置「${hc.name}」已加载`);
          } else {
            const id = addNewConfig();
            applyConfig(id);
          }
        }} />
        {apiConfigs.length > 1 && activeConfigId && (
          <IOSButton label="删除当前" onClick={() => { deleteConfig(activeConfigId); }} color={T.red} />
        )}
      </div>
      <CollapsibleSection title="API 适配设置" defaultOpen={false} extra={<Settings size={12} color={T.text3} />}>
        <div className="flex-col" style={{ gap: 12 }}>
          <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>配置 API 的认证方式和接口行为。大多数情况下保持默认（OpenAI 兼容）即可。</div>
          <div><IOSLabel>认证方式</IOSLabel>
            <IOSSelect value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.authType || 'bearer'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, authType: v as ProviderConfig['authType'] } })}>
              <option value="bearer">Bearer Token（默认）</option>
              <option value="api-key">API Key（X-API-Key Header）</option>
              <option value="custom">自定义 Header</option>
            </IOSSelect>
          </div>
          {apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.authType === 'custom' && (
            <>
              <div><IOSLabel>自定义 Header 名称</IOSLabel><IOSInput value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.customHeaderName || 'Authorization'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, customHeaderName: v } })} placeholder="Authorization" /></div>
              <div><IOSLabel>值前缀</IOSLabel><IOSInput value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.customPrefix ?? 'Bearer '} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, customPrefix: v } })} placeholder="Bearer " /></div>
            </>
          )}
          <div><IOSLabel>图像生成方式</IOSLabel>
            <IOSSelect value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.imageMode || 'chat'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, imageMode: v as ProviderConfig['imageMode'] } })}>
              <option value="chat">Chat 接口内返回（默认）</option>
              <option value="standalone">独立接口</option>
              <option value="none">不支持</option>
            </IOSSelect>
          </div>
          <div><IOSLabel>视频生成方式</IOSLabel>
            <IOSSelect value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.videoMode || 'poll'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, videoMode: v as ProviderConfig['videoMode'] } })}>
              <option value="poll">轮询模式（默认）</option>
              <option value="none">不支持</option>
            </IOSSelect>
          </div>
          <CollapsibleSection title="自定义接口路径（高级）" defaultOpen={false}>
            <div className="flex-col" style={{ gap: 10 }}>
              <div><IOSLabel>对话接口</IOSLabel><IOSInput value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.chatEndpoint || '/v1/chat/completions'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, chatEndpoint: v } })} placeholder="/v1/chat/completions" /></div>
              <div><IOSLabel>视频接口</IOSLabel><IOSInput value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.videoEndpoint || '/v1/video/generations'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, videoEndpoint: v } })} placeholder="/v1/video/generations" /></div>
              <div><IOSLabel>模型列表接口</IOSLabel><IOSInput value={apiConfigs.find(c => c.id === activeConfigId)?.providerConfig?.modelsEndpoint || '/v1/models'} onChange={v => updateConfig({ providerConfig: { ...apiConfigs.find(c => c.id === activeConfigId)?.providerConfig ?? DEFAULT_PROVIDER_CONFIG, modelsEndpoint: v } })} placeholder="/v1/models" /></div>
            </div>
          </CollapsibleSection>
        </div>
      </CollapsibleSection>
      <div><IOSLabel>色彩模式</IOSLabel>
        <IOSSegmentedControl options={Object.entries(THEME_LABELS).map(([v, l]) => ({ l, v }))} value={themeMode} onChange={v => setThemeMode(v as ThemeMode)} />
      </div>
      <div><IOSLabel>聊天输出模式</IOSLabel>
        <IOSSegmentedControl options={[{ l: '非流式', v: 'non-stream' }, { l: '流式', v: 'stream' }]} value={chatStreamingMode} onChange={v => setChatStreamingMode(v as 'stream' | 'non-stream')} />
        <p style={{ fontSize: 11, color: T.text3, margin: '4px 0 0', lineHeight: 1.5 }}>
          {chatStreamingMode === 'non-stream' ? '等待 API 完整返回后一次性显示，不再模拟假流式打字。' : '逐 token 实时输出，适合支持 SSE 的对话接口。'}
        </p>
      </div>
      <div><IOSLabel>图片生成模式</IOSLabel>
        <IOSSegmentedControl options={[{ l: '非流式', v: 'non-stream' }, { l: '流式', v: 'stream' }]} value={imageStreamingMode} onChange={v => setImageStreamingMode(v as 'stream' | 'non-stream')} />
        <p style={{ fontSize: 11, color: T.text3, margin: '4px 0 0', lineHeight: 1.5 }}>
          {imageStreamingMode === 'non-stream' ? '按普通请求等待完整图片结果，适合流式链路不稳定时使用。' : '使用流式保活读取图片响应，长耗时生成时更不容易因为网络中断而丢结果。'}
        </p>
      </div>
      <div><IOSLabel>视频生成模式</IOSLabel>
        <IOSSegmentedControl options={[{ l: '非流式', v: 'non-stream' }, { l: '流式', v: 'stream' }]} value={videoStreamingMode} onChange={v => setVideoStreamingMode(v as 'stream' | 'non-stream')} />
        <p style={{ fontSize: 11, color: T.text3, margin: '4px 0 0', lineHeight: 1.5 }}>
          {videoStreamingMode === 'non-stream' ? '提交任务后在后台等待最终结果，再一次性回填完成状态。' : '提交后立即轮询并持续更新任务状态。'}
        </p>
      </div>
      <ModelCategoryList models={models} />
      {models.length > 0 && (
        <>
          <h3 className="flex-center" style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0, gap: 6 }}><Zap size={16} /> Function Calling</h3>
          <p style={{ fontSize: 12, color: T.text3, margin: 0, lineHeight: 1.5 }}>对话模型通过 Function Calling 自动调用生成工具时使用的默认模型。不设置则不启用自动调用。</p>
          <div><IOSLabel>默认图像模型</IOSLabel><IOSSelect value={defaultImageModel} onChange={setDefaultImageModel}><option value="">未设置（不自动生图）</option>{models.filter(m => m.cat === 'image').map(m => <option key={m.id} value={m.id}>{m.id}</option>)}</IOSSelect></div>
          <div><IOSLabel>默认视频模型</IOSLabel><IOSSelect value={defaultVideoModel} onChange={setDefaultVideoModel}><option value="">未设置（不自动生视频）</option>{models.filter(m => m.cat === 'video').map(m => <option key={m.id} value={m.id}>{m.id}</option>)}</IOSSelect></div>
        </>
      )}
      <h3 className="flex-center" style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0, gap: 6 }}><Search size={16} /> 网页搜索</h3>
      <p style={{ fontSize: 12, color: T.text3, margin: 0, lineHeight: 1.5 }}>接入 Tavily 搜索 API 后，对话模型可以自主搜索互联网获取实时信息。注册地址：<a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: T.blue }}>tavily.com</a>（免费 1000 次/月）</p>
      <div><IOSLabel>Tavily API Key</IOSLabel><IOSInput value={tavilyApiKey} onChange={setTavilyApiKey} placeholder="tvly-..." type="password" /></div>
      {tavilyApiKey && <IOSButton label="测试搜索" onClick={async () => {
        addLog('info', '测试 Tavily 搜索...');
        try {
          const data = await tavilySearch(tavilyApiKey, 'AI大模型最新新闻', 3);
          const count = data.results?.length || 0;
          addLog('success', `Tavily 搜索成功！返回 ${count} 条结果${data.answer ? '，含 AI 摘要' : ''}`);
          if (data.answer) addLog('success', `AI 摘要: ${data.answer.slice(0, 200)}`);
          data.results?.forEach((r: any, i: number) => addLog('debug', `  ${i + 1}. ${r.title} — ${r.url}`));
          addLog('success', '搜索功能已就绪，可以在对话中使用！');
        } catch (err: any) { addLog('error', `Tavily 搜索失败: ${err.message}`); }
      }} color={T.purple} />}
      <CollapsibleSection title="Agent 角色" count={roles.length} defaultOpen={false}>
        <div className="flex-col" style={{ gap: 8 }}>
          <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>每个角色有不同的系统提示词和可用工具。在 Chat 头部切换角色。</div>
          {PRESET_ROLES.map(r => (
            <div key={r.id} onClick={() => setViewingRole(r)} className="flex-center" style={{ gap: 10, padding: '10px 14px', borderRadius: 12, ...glass(0.04), transition: 'all 0.2s', cursor: 'pointer' }}>
              <span style={{ fontSize: 20, display: 'flex' }}><RoleIcon icon={r.icon} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{r.name}</div>
                <div className="truncate" style={{ fontSize: 11, color: T.text3 }}>{r.systemPrompt?.slice(0, 60) || '默认角色，无特殊提示词'}</div>
              </div>
              <div className="flex-center" style={{ gap: 4 }}>{r.tools.includes('generate_image') && <Palette size={10} color={T.orange} />}{r.tools.includes('generate_video') && <Clapperboard size={10} color={T.purple} />}</div>
            </div>
          ))}
          {viewingRole && (
            <div onClick={() => setViewingRole(null)} style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ ...glass(0.1), borderRadius: 20, padding: 24, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${T.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28, display: 'flex' }}><RoleIcon icon={viewingRole.icon} size={28} /></span>
                    <span style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{viewingRole.name}</span>
                  </div>
                  <button onClick={() => setViewingRole(null)} style={{ width: 32, height: 32, borderRadius: 16, ...glass(0.1), border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: 6, fontWeight: 600 }}>可用工具</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {viewingRole.tools.length === 0 && <span style={{ fontSize: 12, color: T.text3 }}>纯对话（无工具）</span>}
                    {viewingRole.tools.includes('generate_image') && <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, color: T.orange, background: `${T.orange}18`, display: 'flex', alignItems: 'center', gap: 4 }}><Palette size={10} /> 图像生成</span>}
                    {viewingRole.tools.includes('generate_video') && <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, color: T.purple, background: `${T.purple}18`, display: 'flex', alignItems: 'center', gap: 4 }}><Clapperboard size={10} /> 视频生成</span>}
                    {viewingRole.tools.includes('web_search') && <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, color: T.blue, background: `${T.blue}18` }}>🔍 网页搜索</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: 6, fontWeight: 600 }}>系统提示词</div>
                  <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.8, whiteSpace: 'pre-wrap', padding: 12, borderRadius: 12, ...glass(0.03) }}>{viewingRole.systemPrompt}</div>
                </div>
              </div>
            </div>
          )}
          {customRoles.length > 0 && <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>自定义角色</div>}
          {customRoles.map(r => (
            <div key={r.id} className="flex-center" style={{ gap: 10, padding: '10px 14px', borderRadius: 12, ...glass(0.04), transition: 'all 0.2s' }}>
              <span style={{ fontSize: 20, display: 'flex' }}><RoleIcon icon={r.icon} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{r.name}</div>
                <div className="truncate" style={{ fontSize: 11, color: T.text3 }}>{r.systemPrompt?.slice(0, 60) || '无提示词'}</div>
              </div>
              <div className="flex-center" style={{ gap: 4 }}>
                <button onClick={() => setEditingRole(r)} style={{ background: 'none', border: 'none', color: T.blue, fontSize: 11, cursor: 'pointer' }}>编辑</button>
                <button onClick={() => deleteCustomRole(r.id)} style={{ background: 'none', border: 'none', color: T.red, fontSize: 11, cursor: 'pointer' }}>删除</button>
              </div>
            </div>
          ))}
          {editingRole && <IOSCard><RoleEditor role={editingRole} onSave={saveCustomRole} onCancel={() => setEditingRole(null)} allIcons={['bot', 'palette', 'clapperboard', 'code', 'globe', 'sparkles']} /></IOSCard>}
          <div className="flex-center" style={{ gap: 8, flexWrap: 'wrap' }}>
            <IOSButton label="+ 新建角色" onClick={() => setEditingRole({ id: gid(), name: '', icon: 'bot', systemPrompt: '', tools: [], isCustom: true })} small />
            <IOSButton label="导入" onClick={importRoles} small />
            {customRoles.length > 0 && <IOSButton label="导出" onClick={exportRoles} small />}
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title={`记忆 (${memories.length})`} defaultOpen={false}>
        <div className="flex-col" style={{ gap: 8 }}>
          <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5 }}>AI 会自动从对话中提取关于你的偏好和信息，用于提供更个性化的回复。</div>
          {memories.length === 0 && <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: 8 }}>暂无记忆，开始对话后会自动积累</div>}
          {memories.slice(0, 50).map(m => (
            <div key={m.id} className="flex-center" style={{ gap: 8, padding: '8px 12px', borderRadius: 10, ...glass(0.03) }}>
              <span style={{ flex: 1, fontSize: 12, color: T.text2 }}>{m.content}</span>
              <span style={{ fontSize: 10, color: T.text3, flexShrink: 0 }}>{new Date(m.ts).toLocaleDateString('zh-CN')}</span>
              <button onClick={() => onDeleteMemory(m.id)} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 2, display: 'flex' }}><X size={10} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            {memories.length > 0 && <IOSButton label="清空全部记忆" onClick={onClearMemories} color={T.red} small />}
            {memories.length > 0 && <IOSButton label="导出" onClick={exportMemoriesToFile} small />}
          </div>
        </div>
      </CollapsibleSection>
      <IOSCard style={{ fontSize: 12, color: T.text3, lineHeight: 1.8 }}>
        <p style={{ fontWeight: 600, color: T.text2, margin: '0 0 4px' }}>API 使用说明</p>
        <p style={{ margin: 0 }}>图像模型通过 /v1/chat/completions 调用</p>
        <p style={{ margin: 0 }}>视频模型通过 /v1/video/generations 调用</p>
        <p style={{ margin: 0 }}>doubab 系列可能存在服务端转发问题</p>
      </IOSCard>
    </div>
  );

  if (!isMobile) {
    return (
      <div className="panel">
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>{settingsForm}</div>
        <div style={{ width: '40%', minWidth: 320, ...glass(0.02), borderLeft: `1px solid ${T.border}` }}><LogPanel logs={logs} onClear={onClearLogs} /></div>
      </div>
    );
  }
  return (
    <div style={{ height: '100%', width: '100%', overflowY: 'auto', padding: 16 }}>
      {settingsForm}
      <LogPanel logs={logs} onClear={onClearLogs} collapsible />
    </div>
  );
}
