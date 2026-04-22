import React from 'react';
import { useT } from '../../contexts/ThemeContext';
import { glass } from './glass';

export function IOSSegmentedControl({ options, value, onChange }: { options: { l: string; v: string }[]; value: string; onChange: (v: string) => void }) {
  const T = useT();
  return (
    <div style={{ ...glass(0.08), borderRadius: 10, padding: 3, display: 'flex', gap: 2 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: value === o.v ? 600 : 400,
          color: value === o.v ? T.text : T.text2,
          background: value === o.v ? `rgba(255,255,255,0.12)` : 'transparent',
          boxShadow: value === o.v ? '0 2px 8px rgba(0,0,0,0.2)' : 'none', transition: 'all 0.2s',
        }}>{o.l}</button>
      ))}
    </div>
  );
}
