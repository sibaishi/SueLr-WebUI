import React from 'react';
import { glass } from './glass';

export function IOSCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="glass-card" style={{ ...glass(0.05), borderRadius: 16, padding: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', transition: 'all 0.3s ease', ...style }}>{children}</div>;
}
