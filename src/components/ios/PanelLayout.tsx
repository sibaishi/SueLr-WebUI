import React from 'react';
import { useT } from '../../contexts/ThemeContext';
import { glass } from './glass';
import { MobileDrawer } from './MobileDrawer';
import { MobileHeader } from './MobileHeader';

export function PanelLayout({ isMobile, drawerOpen, setDrawerOpen, drawerTitle, mobileTitle, mobileColor, sidebarContent, children }: {
  isMobile: boolean; drawerOpen: boolean; setDrawerOpen: (v: boolean) => void; drawerTitle: string;
  mobileTitle: string; mobileColor: string; sidebarContent: React.ReactNode; children: React.ReactNode;
}) {
  const T = useT();
  if (!isMobile) {
    return (
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        <div style={{ width: 300, ...glass(0.04), borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', padding: 16, gap: 16 }}>{sidebarContent}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={drawerTitle}>{sidebarContent}</MobileDrawer>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <MobileHeader title={mobileTitle} color={mobileColor} onOpenSettings={() => setDrawerOpen(true)} />
        {children}
      </div>
    </div>
  );
}
