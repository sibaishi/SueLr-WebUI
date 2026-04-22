import { useState } from 'react';
import { useT } from '../contexts/ThemeContext';
import type { ModelInfo, BridgeRef } from '../lib/types';
import type { ProviderConfig } from '../lib/providers';
import { CHAT_COLOR, RATIOS, QUICK_PROMPTS } from '../lib/constants';
import { taskStatusColor, taskStatusLabel } from '../lib/utils';
import { useImageGen } from '../hooks/useImageGen';
import { FullscreenViewer, IOSSegmentedControl, IOSLabel, IOSSelect, AutoTextarea, IOSButton, FileUploadArea, RefImageList, CollapsibleSection, TaskDetailModal, PanelLayout, glass, glassLight } from './ios';
import { XCircle, Download, MessageSquare } from 'lucide-react';

export function ImagePanel({ base, apiKey, models, addLog, isMobile, bridgeRef, onAddToChat, providerConfig, imageStreamingMode }: { base: string; apiKey: string; models: ModelInfo[]; addLog: (l: string, m: string) => void; isMobile: boolean; bridgeRef: React.MutableRefObject<BridgeRef>; onAddToChat: (urls: string[]) => void; providerConfig?: ProviderConfig; imageStreamingMode: 'stream' | 'non-stream' }) {
  const T = useT();
  const img = useImageGen(base, apiKey, models, addLog, bridgeRef, providerConfig, imageStreamingMode);
  const [detailTask, setDetailTask] = useState<typeof img.tasks[0] | null>(null);

  const controlContent = (
    <div className="flex-col" style={{ gap: 16, padding: isMobile ? 16 : 0 }}>
      <IOSSegmentedControl options={[{ l: '文生图', v: 'text' }, { l: '图生图', v: 'image' }]} value={img.mode} onChange={v => img.setMode(v as 'text' | 'image')} />
      <div><IOSLabel>模型</IOSLabel><IOSSelect value={img.model} onChange={img.setModel}><option value="">选择模型</option>{img.imgModels.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}</IOSSelect></div>
      <div><IOSLabel>提示词</IOSLabel><AutoTextarea value={img.prompt} onChange={img.setPrompt} placeholder="描述你想要的图片..." maxH={200} /></div>
      <div><IOSLabel>图片比例</IOSLabel><IOSSelect value={img.ratio} onChange={img.setRatio}>{RATIOS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}</IOSSelect></div>
      {img.mode === 'image' && (
        <div>
          <IOSLabel>参考图片（最多5张）</IOSLabel>
          <FileUploadArea accept="image/*" multiple onUpload={f => img.handleFileUpload(f as any)} />
          <RefImageList images={img.refImages} onRemove={i => img.setRefImages(p => p.filter((_, j) => j !== i))} />
        </div>
      )}
      <IOSButton label={`生成图片${img.activeCount > 0 ? ` (${img.activeCount}个任务)` : ''}`} onClick={() => { img.handleGenerate(); if (isMobile) img.setDrawerOpen(false); }} color={T.orange} disabled={!img.prompt.trim() || !img.model} />
      <div>
        <IOSLabel>快速提示词</IOSLabel>
        <div className="flex-center" style={{ flexWrap: 'wrap', gap: 6 }}>
          {QUICK_PROMPTS.map(q => (
            <button key={q.label} onClick={() => img.setPrompt(q.prompt)} title={q.prompt} style={{ ...glassLight(), padding: '5px 12px', borderRadius: 10, border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{q.label}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel">
      <FullscreenViewer url={img.previewUrl} onClose={() => img.setPreviewUrl(null)} />
      {detailTask && <TaskDetailModal task={detailTask} type="image" onClose={() => setDetailTask(null)}
        onApply={t => { img.setPrompt(t.prompt); img.setModel(t.model); img.setRatio(t.ratio); if (t.refImages.length > 0) { img.setRefImages(t.refImages); img.setMode('image'); } }}
      />}
      <PanelLayout isMobile={isMobile} drawerOpen={img.drawerOpen} setDrawerOpen={img.setDrawerOpen} drawerTitle="图像生成设置" mobileTitle="图像生成" mobileColor={T.orange} sidebarContent={controlContent}>
        <CollapsibleSection title="任务" count={img.tasks.length} defaultOpen={true} extra={
          img.tasks.some(t => t.status === 'queued' || t.status === 'processing') ? (
            <button onClick={() => img.cancelAll()} style={{ background: 'none', border: 'none', color: T.red, fontSize: 11, cursor: 'pointer' }}>全部终止</button>
          ) : undefined
        }>
          <div className="flex-col" style={{ gap: 8 }}>
            {img.tasks.length === 0 && <div style={{ fontSize: 13, color: T.text3, textAlign: 'center', padding: 12, ...glass(0.03), borderRadius: 12 }}>暂无任务</div>}
            {img.tasks.map(t => (
              <div key={t.id} onClick={() => setDetailTask(t)} style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', transition: 'transform 0.15s', ...glass(0.03) }}>
                <div style={{ padding: 12 }}>
                  <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="flex-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ fontSize: 10, color: taskStatusColor(t.status, T), background: `${taskStatusColor(t.status, T)}18`, backdropFilter: 'blur(8px)' }}>{taskStatusLabel(t.status)}</span>
                      <span style={{ fontSize: 12, color: T.text3 }}>{t.model}</span>
                    </div>
                    {(t.status === 'queued' || t.status === 'processing') && <button onClick={e => { e.stopPropagation(); img.cancelTask(t.id); }} style={{ background: `${T.red}15`, border: 'none', color: T.red, fontSize: 11, cursor: 'pointer', padding: '3px 10px', borderRadius: 6 }}>终止</button>}
                  </div>
                  <div className="truncate" style={{ fontSize: 13, color: T.text2 }}>{t.prompt}</div>
                  {t.error && <div className="flex-center" style={{ fontSize: 11, color: T.red, marginTop: 4, gap: 4 }}><XCircle size={10} /> {t.error.slice(0, 80)}</div>}
                  {t.images.length > 0 && <div className="flex-center" style={{ gap: 4, marginTop: 8 }}>{t.images.map((image, i) => <img key={i} src={image} alt="" onClick={e => { e.stopPropagation(); img.setPreviewUrl(image); }} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', cursor: 'pointer', boxShadow: `0 2px 8px rgba(0,0,0,0.3)` }} />)}</div>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div className="section-title">
            <span className="section-title-text">图片画廊 ({img.gallery.length})</span>
            {img.gallery.length > 0 && <button onClick={() => img.clearGallery()} style={{ background: 'none', border: 'none', color: T.red, fontSize: 12, cursor: 'pointer' }}>清空</button>}
          </div>
          {img.gallery.length === 0 ? (
            <div className="empty-hint">{isMobile ? '点击右上角「设置」开始生成' : '生成的图片将显示在这里'}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 120 : 160}px, 1fr))`, gap: 12 }}>
              {img.gallery.map(item => (
                <div key={item.id} className="gallery-item" style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                  onClick={() => img.setPreviewUrl(item.url)}
                  onMouseEnter={e => { const o = e.currentTarget.querySelector('.ov') as HTMLDivElement; if (o) o.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={e => { const o = e.currentTarget.querySelector('.ov') as HTMLDivElement; if (o) o.style.opacity = '0'; e.currentTarget.style.transform = 'scale(1)'; }}>
                  <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isMobile && (
                    <button onClick={e => { e.stopPropagation(); onAddToChat([item.url]); }} className="btn-icon" style={{ position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 16, ...glassLight(), border: `1px solid rgba(255,255,255,0.15)`, color: '#fff' }}><MessageSquare size={14} /></button>
                  )}
                  <div className="ov" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', opacity: 0, transition: 'opacity 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <button onClick={e => { e.stopPropagation(); onAddToChat([item.url]); }} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${CHAT_COLOR}, ${T.blue})`, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${CHAT_COLOR}40` }}><MessageSquare size={12} /> 对话</button>
                    <button onClick={e => { e.stopPropagation(); const a = document.createElement('a'); a.href = item.url; a.download = `${item.id}.png`; if (item.url.startsWith('data:')) a.click(); else { a.target = '_blank'; a.click(); } }} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 4px 12px ${T.blue}40` }}><Download size={12} /> 下载</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PanelLayout>
    </div>
  );
}
