import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../contexts/ThemeContext';
import { glass, lightOverlay } from './glass';

export function MobileDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const T = useT();
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  useEffect(() => { if (open) { setRendered(true); requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); } else { setVisible(false); const t = setTimeout(() => setRendered(false), 350); return () => clearTimeout(t); } }, [open]);
  if (!rendered) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: lightOverlay(T), backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '85%', maxWidth: 340,
        background: T.menuBg, display: 'flex', flexDirection: 'column',
        boxShadow: '8px 0 40px rgba(0,0,0,0.4)',
        transform: visible ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, ...glass(0.1), border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
