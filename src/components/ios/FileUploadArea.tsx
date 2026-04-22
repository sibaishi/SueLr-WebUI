import React, { useState, useRef, type DragEvent } from 'react';
import { Folder } from 'lucide-react';
import { useT } from '../../contexts/ThemeContext';

export function FileUploadArea({ onUpload, accept = 'image/*', multiple = true }: { onUpload: (files: File[]) => void; accept?: string; multiple?: boolean }) {
  const T = useT();
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onUpload(Array.from(e.dataTransfer.files)); };
  return (
    <div onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={handleDrop}
      style={{ border: `2px dashed ${drag ? T.blue : T.border}`, borderRadius: 12, padding: '16px 0', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: drag ? `${T.blue}10` : 'transparent' }}>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={e => { if (e.target.files) onUpload(Array.from(e.target.files)); e.target.value = ''; }} style={{ display: 'none' }} />
      <Folder size={20} color={T.text3} style={{ margin: '0 auto 6px' }} />
      <div style={{ fontSize: 12, color: T.text3 }}>点击或拖拽文件到此处</div>
    </div>
  );
}
