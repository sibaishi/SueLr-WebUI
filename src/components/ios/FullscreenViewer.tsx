import React from 'react';
import { X } from 'lucide-react';
import { useT } from '../../contexts/ThemeContext';
import { glass, lightOverlay } from './glass';

export function FullscreenViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const T = useT();
  if (!url) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: lightOverlay(T), backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <img src={url} alt="" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, ...glass(0.15), border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
    </div>
  );
}
