import React from 'react';
import { X } from 'lucide-react';
import { useT } from '../../contexts/ThemeContext';

export function RefImageList({ images, onRemove }: { images: string[]; onRemove: (i: number) => void }) {
  const T = useT();
  if (images.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: 'relative', width: 50, height: 50, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button onClick={() => onRemove(i)} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, background: 'rgba(255,0,0,0.7)', color: '#fff', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={8} /></button>
        </div>
      ))}
    </div>
  );
}
