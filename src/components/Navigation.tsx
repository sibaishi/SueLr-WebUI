import type { Tab, ThemeMode } from '../lib/types';
import { NAV_ITEMS, THEME_LABELS, THEME_ICONS } from '../lib/constants';
import { useT } from '../contexts/ThemeContext';
import { Icon } from '../lib/icons';

const glass = (T: any) => ({
  background: T.card,
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
});

export function DesktopSidebar({ tab, setTab, modelCount, themeMode, setThemeMode }: { tab: Tab; setTab: (t: Tab) => void; modelCount: number; themeMode: ThemeMode; setThemeMode: (t: ThemeMode) => void }) {
  const T = useT();
  const cycleTheme = () => { const modes: ThemeMode[] = ['dark', 'light', 'system']; setThemeMode(modes[(modes.indexOf(themeMode) + 1) % 3]); };
  return (
    <div style={{
      width: 78, ...glass(T),
      borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 0', gap: 6, flexShrink: 0,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: `linear-gradient(135deg, ${T.blue}, ${T.purple})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, boxShadow: `0 4px 20px ${T.blue}40`,
      }}><Icon name="bot" size={22} style={{ color: '#fff' }} /></div>

      {NAV_ITEMS.map(it => {
        const active = tab === it.key;
        return (
          <button key={it.key} onClick={() => setTab(it.key)} style={{
            width: 58, height: 54, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: active ? T.card2 : 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, transition: 'all 0.25s ease',
            boxShadow: active ? '0 2px 12px rgba(0,0,0,0.15)' : 'none',
            transform: active ? 'scale(1.02)' : 'scale(1)',
          }}>
            <Icon name={it.icon} size={20} style={{ color: active ? T[it.colorKey] : T.text3 }} />
            <span style={{
              fontSize: 10, fontWeight: active ? 600 : 400,
              color: active ? T[it.colorKey] : T.text3, transition: 'color 0.2s',
            }}>{it.label}</span>
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <button onClick={cycleTheme} title={THEME_LABELS[themeMode]} style={{
        width: 42, height: 42, borderRadius: 13, border: 'none',
        background: T.card2, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 6, transition: 'all 0.2s',
      }}><Icon name={THEME_ICONS[themeMode]} size={18} style={{ color: T.text2 }} /></button>

      <div style={{
        fontSize: 9, color: T.text3, textAlign: 'center',
        padding: '3px 8px', borderRadius: 8,
        background: T.card,
      }}>{modelCount > 0 ? `${modelCount} 模型` : '未连接'}</div>
    </div>
  );
}

export function MobileBottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const T = useT();
  return (
    <div style={{
      height: 64, ...glass(T),
      borderTop: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {NAV_ITEMS.map(it => {
        const active = tab === it.key;
        return (
          <button key={it.key} onClick={() => setTab(it.key)} style={{
            flex: 1, height: '100%', border: 'none', cursor: 'pointer', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}>
            <div style={{ transition: 'transform 0.2s', transform: active ? 'scale(1.1)' : 'scale(1)' }}>
              <Icon name={it.icon} size={22} style={{ color: active ? T[it.colorKey] : T.text3 }} />
            </div>
            <span style={{ fontSize: 10, color: active ? T[it.colorKey] : T.text3, fontWeight: active ? 600 : 400 }}>{it.label}</span>
            {active && <div style={{ width: 4, height: 4, borderRadius: 2, background: T[it.colorKey], boxShadow: `0 0 6px ${T[it.colorKey]}` }} />}
          </button>
        );
      })}
    </div>
  );
}
