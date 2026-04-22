import { useState } from 'react';
import { useT } from '../contexts/ThemeContext';
import type { ModelInfo, BridgeRef } from '../lib/types';
import type { ProviderConfig } from '../lib/providers';
import { CHAT_COLOR, VID_RES, VID_DUR, VID_RATIO } from '../lib/constants';
import { ftime, taskStatusColor } from '../lib/utils';
import { fileToB64 } from '../lib/image';
import { useVideoGen } from '../hooks/useVideoGen';
import { IOSSegmentedControl, IOSLabel, IOSSelect, AutoTextarea, IOSButton, FileUploadArea, RefImageList, CollapsibleSection, TaskDetailModal, PanelLayout, VideoThumbnail, glass } from './ios';
import { XCircle, Download, MessageSquare } from 'lucide-react';

export function VideoPanel({ base, apiKey, models, addLog, isMobile, bridgeRef, onAddToChat, providerConfig, videoStreamingMode }: { base: string; apiKey: string; models: ModelInfo[]; addLog: (l: string, m: string) => void; isMobile: boolean; bridgeRef: React.MutableRefObject<BridgeRef>; onAddToChat: (prompt: string, videoUrl?: string) => void; providerConfig?: ProviderConfig; videoStreamingMode: 'stream' | 'non-stream' }) {
  const T = useT();
  const vid = useVideoGen(base, apiKey, models, addLog, bridgeRef, providerConfig, videoStreamingMode);
  const [detailTask, setDetailTask] = useState<typeof vid.tasks[0] | null>(null);

  const controlContent = (
    <div className="flex-col" style={{ gap: 16, padding: isMobile ? 16 : 0 }}>
      <IOSSegmentedControl options={[{ l: '文生视频', v: 'text' }, { l: '图生视频', v: 'image' }]} value={vid.mode} onChange={v => vid.setMode(v as 'text' | 'image')} />
      <div><IOSLabel>模型</IOSLabel><IOSSelect value={vid.model} onChange={vid.setModel}><option value="">选择模型</option>{vid.vidModels.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}</IOSSelect></div>
      <div><IOSLabel>提示词</IOSLabel><AutoTextarea value={vid.prompt} onChange={vid.setPrompt} placeholder="描述你想要的视频..." maxH={200} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div><IOSLabel>时长</IOSLabel><IOSSelect value={String(vid.duration)} onChange={v => vid.setDuration(Number(v))}>{VID_DUR.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}</IOSSelect></div>
        <div><IOSLabel>分辨率</IOSLabel><IOSSelect value={vid.resolution} onChange={vid.setResolution}>{VID_RES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}</IOSSelect></div>
        <div><IOSLabel>比例</IOSLabel><IOSSelect value={vid.vidRatio} onChange={vid.setVidRatio}>{VID_RATIO.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}</IOSSelect></div>
      </div>
      {vid.mode === 'image' && (
        <div>
          <IOSLabel>参考图片</IOSLabel>
          <FileUploadArea accept="image/*" multiple onUpload={f => vid.handleFileUpload(f as any)} />
          <RefImageList images={vid.refImages} onRemove={i => vid.setRefImages(p => p.filter((_, j) => j !== i))} />
        </div>
      )}
      <div>
        <IOSLabel>配乐（可选）</IOSLabel>
        <FileUploadArea accept="audio/*" multiple={false} onUpload={files => { const f = files[0]; if (f) fileToB64(f).then(b64 => vid.setAudioFile({ name: f.name, type: f.type, data: b64 })); }} />
        {vid.audioFile && <audio controls src={vid.audioFile.data} style={{ width: '100%', height: 32, marginTop: 8 }} />}
      </div>
      <IOSButton label={`提交视频任务${vid.activeCount > 0 ? ` (${vid.activeCount}个进行中)` : ''}`} onClick={() => { vid.submit(); if (isMobile) vid.setDrawerOpen(false); }} color={T.purple} disabled={!vid.prompt.trim() || !vid.model} />
    </div>
  );

  return (
    <>
      {detailTask && <TaskDetailModal task={detailTask as any} type="video" onClose={() => setDetailTask(null)}
        onApply={t => { vid.setPrompt(t.prompt); vid.setModel(t.model); }}
      />}
      <PanelLayout isMobile={isMobile} drawerOpen={vid.drawerOpen} setDrawerOpen={vid.setDrawerOpen} drawerTitle="视频生成设置" mobileTitle="视频生成" mobileColor={T.purple} sidebarContent={controlContent}>
        <CollapsibleSection title="视频任务" count={vid.tasks.length} defaultOpen={true} extra={
          vid.tasks.some(t => t.status === '提交中' || t.status === '处理中') ? (
            <button onClick={() => vid.cancelAll()} style={{ background: 'none', border: 'none', color: T.red, fontSize: 11, cursor: 'pointer' }}>全部终止</button>
          ) : undefined
        }>
          <div className="flex-col" style={{ gap: 8 }}>
            {vid.tasks.length === 0 && <div style={{ fontSize: 13, color: T.text3, textAlign: 'center', padding: 12, ...glass(0.03), borderRadius: 12 }}>暂无任务</div>}
            {vid.tasks.map(t => (
              <div key={t.id} onClick={() => setDetailTask(t)} style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', transition: 'transform 0.15s', ...glass(0.03) }}>
                <div style={{ padding: 12 }}>
                  <div className="flex-center" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="flex-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ fontSize: 10, color: taskStatusColor(t.status, T), background: `${taskStatusColor(t.status, T)}18`, backdropFilter: 'blur(8px)' }}>{t.status}</span>
                      <span style={{ fontSize: 12, color: T.text3 }}>{t.model}</span>
                      <span style={{ fontSize: 11, color: T.text3 }}>{t.params}</span>
                    </div>
                    {(t.status === '提交中' || t.status === '处理中') && <button onClick={e => { e.stopPropagation(); vid.cancelTask(t.id); }} style={{ background: `${T.red}15`, border: 'none', color: T.red, fontSize: 11, cursor: 'pointer', padding: '3px 10px', borderRadius: 6 }}>终止</button>}
                  </div>
                  <div className="truncate" style={{ fontSize: 13, color: T.text2 }}>{t.prompt}</div>
                  {t.error && <div className="flex-center" style={{ fontSize: 11, color: T.red, marginTop: 4, gap: 4 }}><XCircle size={10} /> {t.error.slice(0, 80)}</div>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div className="section-title">
            <span className="section-title-text">视频画廊 ({vid.completedVideos.length})</span>
            {vid.completedVideos.length > 0 && <button onClick={() => vid.clearCompleted()} style={{ background: 'none', border: 'none', color: T.red, fontSize: 12, cursor: 'pointer' }}>清空</button>}
          </div>
          {vid.completedVideos.length === 0 ? (
            <div className="empty-hint">{isMobile ? '点击右上角「设置」开始生成' : '完成的视频将显示在这里'}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 240 : 280}px, 1fr))`, gap: 12 }}>
              {vid.completedVideos.map(v => (
                <div key={v.id} className="glass-card" style={{ ...glass(0.04), borderRadius: 16, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <VideoThumbnail src={v.url} />
                  <div className="flex-center" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 12, color: T.text2 }}>{v.prompt}</div>
                      <div style={{ fontSize: 11, color: T.text3 }}>{v.model} · {ftime(v.ts)}</div>
                    </div>
                    <div className="flex-center" style={{ gap: 6, flexShrink: 0 }}>
                      <button onClick={() => onAddToChat(v.prompt, v.url)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${CHAT_COLOR}, ${T.blue})`, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, boxShadow: `0 4px 12px ${CHAT_COLOR}40` }}><MessageSquare size={12} /> 对话</button>
                      <a href={v.url} download target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 10, background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`, color: '#fff', fontSize: 12, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, boxShadow: `0 4px 12px ${T.purple}40` }}><Download size={12} /> 下载</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PanelLayout>
    </>
  );
}
