import React from 'react';
import { useT } from '../../contexts/ThemeContext';

export function MobileHeader({ title, color, onOpenSettings }: { title: string; color: string; onOpenSettings: () => void }) {
  const T = useT();
  return (
    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</span>
      <button onClick={onOpenSettings} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: color, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>新建任务</button>
    </div>
  );
}
