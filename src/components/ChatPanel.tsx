import { useState } from 'react';
import type { ModelInfo, BridgeRef, AgentRole } from '../lib/types';
import type { ProviderConfig } from '../lib/providers';
import { useChat } from '../hooks/useChat';
import { useT } from '../contexts/ThemeContext';
import { MarkdownRenderer } from './Markdown';
import { FullscreenViewer, IOSButton, AutoTextarea, VideoThumbnail, TypingIndicator, SplashScreen, RoleSelector, CustomDropdown } from './ios';
import { Bot, Palette, Clapperboard, Code, PenLine, Paperclip, MessageSquare, Copy, RefreshCw, Trash2, Download, XCircle, CheckCircle, Search, X, Menu, Circle } from 'lucide-react';

const WELCOME_ICONS: Record<string, React.ReactNode> = { write: <PenLine size={14} />, code: <Code size={14} />, image: <Palette size={14} />, video: <Clapperboard size={14} /> };
const WELCOME_SUGGESTIONS = [
  { key: 'write', text: '帮我写一篇文章' },
  { key: 'code', text: '解释一段代码' },
  { key: 'image', text: '画一只可爱的橘猫' },
  { key: 'video', text: '生成一段城市夜景视频' },
];

export function ChatPanel({ base, apiKey, models, addLog, isMobile, bridgeRef, defaultImageModel, defaultVideoModel, roles, getMemoryContext, scheduleExtraction, tavilyApiKey, providerConfig, chatStreamingMode, imageStreamingMode, videoStreamingMode, activeTab, searchMemories }: { base: string; apiKey: string; models: ModelInfo[]; addLog: (l: string, m: string) => void; isMobile: boolean; bridgeRef: React.MutableRefObject<BridgeRef>; defaultImageModel: string; defaultVideoModel: string; roles: AgentRole[]; getMemoryContext: () => string; scheduleExtraction: (msgs: { role: string; content: string }[], cid: string, model: string, base: string, key: string) => void; tavilyApiKey: string; providerConfig?: ProviderConfig; chatStreamingMode: 'stream' | 'non-stream'; imageStreamingMode: 'stream' | 'non-stream'; videoStreamingMode: 'stream' | 'non-stream'; activeTab?: string; searchMemories?: (query: string) => string }) {
  const T = useT();
  const chat = useChat(base, apiKey, models, addLog, bridgeRef, defaultImageModel, defaultVideoModel, roles, getMemoryContext, scheduleExtraction, tavilyApiKey, providerConfig, chatStreamingMode, imageStreamingMode, videoStreamingMode, activeTab, searchMemories);
  const glass = (opacity = 0.06) => ({ background: `rgba(255,255,255,${opacity})`, backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)' });

  const convListContent = (
    <>
      <div style={{ padding: 16 }}>
        <button onClick={() => { chat.newConv(); if (isMobile) chat.setDrawerOpen(false); }} style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: `1.5px dashed ${T.border}`, background: 'transparent', color: '#30D158', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>+ 新建对话</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chat.convs.map(c => {
          const lastMsg = c.msgs.length > 0 ? c.msgs[c.msgs.length - 1] : null;
          const displayTime = lastMsg ? new Date(lastMsg.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : new Date(c.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const isActive = c.id === chat.activeId;
          return (
          <div key={c.id} className="conv-item" onClick={() => { chat.setActiveId(c.id); if (isMobile) chat.setDrawerOpen(false); }} style={{
            padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: isActive ? T.card2 : 'transparent', transition: 'all 0.2s', borderRadius: 8, margin: '0 8px',
          }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <div style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? T.text : T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
              {lastMsg && <div style={{ fontSize: 11, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>{lastMsg.role === 'user' ? '你' : 'AI'}: {lastMsg.content.slice(0, 40)}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: T.text3 }}>{displayTime}</span>
              <button className="del-btn" onClick={e => { e.stopPropagation(); chat.delConv(c.id); }} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', padding: 4, display: 'flex' }}><X size={12} /></button>
            </div>
          </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }} onDragOver={chat.handleDragOver} onDragLeave={chat.handleDragLeave} onDrop={chat.handleDrop}>
      <FullscreenViewer url={chat.previewUrl} onClose={() => chat.setPreviewUrl(null)} />
      {chat.isDragging && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(48,209,88,0.12)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, pointerEvents: 'none' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, ...glass(0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Paperclip size={36} color="#30D158" /></div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#30D158' }}>拖拽图片到这里</div>
          <div style={{ fontSize: 13, color: T.text2 }}>最多 9 张，超过 2K 自动压缩</div>
        </div>
      )}
      {!isMobile && (
        <div style={{ width: 280, ...glass(0.04), borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {convListContent}
        </div>
      )}
      {isMobile && <FullscreenViewer url={chat.previewUrl} onClose={() => chat.setPreviewUrl(null)} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, ...glass(0.03), position: 'relative', zIndex: 10 }}>
          {isMobile && (
            <button onClick={() => chat.setDrawerOpen(true)} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', ...glass(0.08), color: T.text2, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Menu size={16} /></button>
          )}
          <RoleSelector roles={roles} activeRoleId={chat.currentRole.id} onSelect={chat.setRole} />
          <CustomDropdown
            value={chat.currentModel}
            onChange={chat.setConvModel}
            placeholder="选择模型"
            options={[
              ...chat.chatModels.map(m => ({ label: m.id, value: m.id, group: '对话模型' })),
              ...chat.imgModels.map(m => ({ label: m.id, value: m.id, group: '图像模型' })),
              ...chat.vidModels.map(m => ({ label: m.id, value: m.id, group: '视频模型' })),
            ]}
            style={{ flex: 1, minWidth: 0 }}
          />
          {chat.currentModelCat === 'image' && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: `${T.orange}20`, color: T.orange, fontSize: 11, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Palette size={10} /> 图像模式</span>
          )}
          {chat.currentModelCat === 'video' && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: `${T.purple}20`, color: T.purple, fontSize: 11, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}><Clapperboard size={10} /> 视频模式</span>
          )}
          {chat.conv && chat.sendings.has(chat.conv.id) && (
            <>
              <span style={{ fontSize: 12, color: chat.currentModelCat === 'image' ? T.orange : chat.currentModelCat === 'video' ? T.purple : '#30D158', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Circle size={6} fill="currentColor" style={{ animation: 'pulse 1.5s infinite' }} />
                {chat.currentModelCat === 'image' ? '生成中' : chat.currentModelCat === 'video' ? '生成中' : '思考中'}
              </span>
              <button onClick={() => chat.cancel(chat.conv!.id)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: `${T.red}20`, color: T.red, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>终止</button>
            </>
          )}
        </div>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!chat.conv && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 40px ${T.blue}50` }}><Bot size={36} color="#fff" /></div>
              <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>AI 多模态助手</div>
              <div style={{ fontSize: 13, color: T.text2, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>选择对话模型聊天，选择图像/视频模型直接生成，或开启 Function Calling 自动调用工具</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12 }}>
                {WELCOME_SUGGESTIONS.map((s, i) => (
                  <button key={s.text} onClick={() => { chat.setInput(s.text); }} style={{
                    padding: '10px 16px', borderRadius: 14, ...glass(0.06), border: `1px solid ${T.border}`,
                    color: T.text2, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
                  }}>
                    {WELCOME_ICONS[s.key]} {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chat.conv?.msgs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
              <MessageSquare size={36} color={T.text3} />
              <div style={{ fontSize: 14, color: T.text3 }}>新对话已创建，输入消息开始聊天</div>
            </div>
          )}
          {chat.conv?.msgs.map(msg => (
            <div key={msg.id} className="msg-row" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10, animation: 'fadeInUp 0.3s ease' }}>
              {msg.role === 'assistant' && (
                <div className="avatar-md" style={{ width: 32, height: 32, borderRadius: 16, background: `linear-gradient(135deg, ${T.blue}30, ${T.purple}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Bot size={16} color={T.blue} /></div>
              )}
              <div className="msg-content" style={{
                position: 'relative', maxWidth: isMobile ? '85%' : '72%', borderRadius: 20, padding: '12px 18px',
                background: msg.role === 'user' ? '#30D158' : glass(0.06).background,
                backdropFilter: msg.role === 'assistant' ? glass(0.06).backdropFilter : undefined,
                WebkitBackdropFilter: msg.role === 'assistant' ? glass(0.06).WebkitBackdropFilter : undefined,
                border: msg.role === 'assistant' ? `1px solid ${T.border}` : '1px solid transparent',
                color: msg.role === 'user' ? '#fff' : T.text,
                borderBottomRightRadius: msg.role === 'user' ? 4 : 20,
                borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 20, overflow: 'hidden',
                boxShadow: msg.role === 'user' ? `0 4px 20px #30D15830` : `0 4px 20px rgba(0,0,0,0.1)`,
              }}>
                <div className="msg-actions" style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 3, zIndex: 2 }}>
                  <button onClick={() => { navigator.clipboard.writeText(msg.content); }} title="复制" style={{ width: 26, height: 26, borderRadius: 8, background: msg.role === 'user' ? 'rgba(0,0,0,0.25)' : glass(0.1).background, border: 'none', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : T.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy size={11} /></button>
                  {msg.role === 'assistant' && msg === chat.conv!.msgs[chat.conv!.msgs.length - 1] && !chat.sendings.has(chat.conv!.id) && (
                    <button onClick={chat.regenerate} title="重新生成" style={{ width: 26, height: 26, borderRadius: 8, background: glass(0.1).background, border: 'none', color: T.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={11} /></button>
                  )}
                  <button onClick={() => chat.deleteMessage(msg.id)} title="删除" style={{ width: 26, height: 26, borderRadius: 8, background: msg.role === 'user' ? 'rgba(0,0,0,0.25)' : glass(0.1).background, border: 'none', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : T.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={11} /></button>
                </div>
                <div style={{ fontSize: 10, color: msg.role === 'user' ? 'rgba(255,255,255,0.55)' : T.text3, marginBottom: 6, fontWeight: 500 }}>{msg.role === 'user' ? '你' : 'AI'} · {new Date(msg.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                {msg.role === 'assistant' ? (
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}><MarkdownRenderer content={msg.content} isUser={false} /></div>
                ) : (
                  <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                )}
                {msg.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {msg.images.map((img, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} onClick={() => chat.setPreviewUrl(img)}>
                        <img src={img} alt="" style={{ maxWidth: '100%', maxHeight: 300, display: 'block', borderRadius: 14 }} />
                        <div className="img-actions" style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 5, opacity: isMobile ? 0.85 : 0, transition: 'opacity 0.15s' }}>
                          <button onClick={e => { e.stopPropagation(); chat.addPendingImages([img]); }} title="添加到对话" style={{ width: 30, height: 30, borderRadius: 10, ...glass(0.2), border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Paperclip size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); const a = document.createElement('a'); a.href = img; a.download = `image_${i + 1}.png`; if (img.startsWith('data:')) a.click(); else { a.target = '_blank'; a.click(); } }} style={{ width: 30, height: 30, borderRadius: 10, ...glass(0.2), border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Download size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {msg.toolCall && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 14, fontSize: 12, ...glass(0.04), border: `1px solid ${msg.toolCall.status === 'processing' ? `${T.blue}25` : msg.toolCall.status === 'failed' ? `${T.red}25` : `${T.green}25`}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.text2 }}>
                      {msg.toolCall.status === 'processing' ? (
                        <><Circle size={6} fill={T.blue} style={{ animation: 'pulse 1.5s infinite' }} /><span style={{ color: T.blue, fontWeight: 500 }}>{msg.toolCall.label}</span><span style={{ marginLeft: 'auto', display: 'flex' }}>{msg.toolCall.type === 'video' ? <Clapperboard size={14} /> : <Palette size={14} />}</span></>
                      ) : msg.toolCall.status === 'failed' ? (
                        <><XCircle size={14} color={T.red} /><span style={{ color: T.red }}>{msg.toolCall.label}</span></>
                      ) : (
                        <><CheckCircle size={14} color={T.green} /><span style={{ color: T.green }}>{msg.toolCall.label}</span></>
                      )}
                    </div>
                    {msg.toolCall.error && <div style={{ marginTop: 6, fontSize: 11, color: T.red, wordBreak: 'break-all' }}>{msg.toolCall.error}</div>}
                  </div>
                )}
                {msg.videoUrl && <div style={{ marginTop: 10 }}><VideoThumbnail src={msg.videoUrl} /></div>}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: 32, height: 32, borderRadius: 16, background: `linear-gradient(135deg, #30D158, ${T.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: `0 4px 16px #30D15840` }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>U</span>
                </div>
              )}
            </div>
          ))}
          {chat.conv && chat.sendings.has(chat.conv.id) && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: `linear-gradient(135deg, ${T.blue}30, ${T.purple}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bot size={16} color={T.blue} /></div>
              <div style={{ borderRadius: 20, borderBottomLeftRadius: 4, padding: '12px 18px', ...glass(0.06), border: `1px solid ${T.border}` }}><TypingIndicator /></div>
            </div>
          )}
        </div>
        {/* Input */}
        <div style={{ padding: 16, flexShrink: 0, ...glass(0.03), borderTop: `1px solid ${T.border}` }}>
          {chat.pendingImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {chat.pendingImages.map((img, i) => (
                <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => chat.removePendingImage(i)} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 10, ...glass(0.3), border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
                </div>
              ))}
              {chat.pendingImages.length < 9 && (
                <button onClick={() => chat.fileInputRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 12, border: `1.5px dashed ${T.border}`, background: 'transparent', color: T.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <input ref={chat.fileInputRef} type="file" accept="image/*" multiple onChange={e => { if (e.target.files) chat.handleImageUpload(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
            <button onClick={() => chat.fileInputRef.current?.click()} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', ...glass(0.08), color: T.text2, cursor: 'pointer', flexShrink: 0, display: chat.pendingImages.length >= 9 ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}><Paperclip size={16} /></button>
            <div style={{ flex: 1, minWidth: 0 }}><AutoTextarea value={chat.input} onChange={chat.setInput} placeholder={`输入消息... (Enter 发送, Shift+Enter 换行)`} maxH={120} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat.send(); } }} /></div>
            <button onClick={chat.send} disabled={(!chat.input.trim() && chat.pendingImages.length === 0) || !chat.currentModel} style={{
              width: 38, height: 38, borderRadius: 12, border: 'none',
              background: (!chat.input.trim() && chat.pendingImages.length === 0) || !chat.currentModel ? glass(0.06).background : `linear-gradient(135deg, #30D158, ${T.blue})`,
              color: (!chat.input.trim() && chat.pendingImages.length === 0) || !chat.currentModel ? T.text3 : '#fff',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (!chat.input.trim() && chat.pendingImages.length === 0) || !chat.currentModel ? 'none' : `0 4px 16px #30D15840`,
            }}><span style={{ fontSize: 16, fontWeight: 700 }}>↑</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
