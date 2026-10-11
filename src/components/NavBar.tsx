import { Cpu, Info, LayoutDashboard, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TabId } from '../types';
import { Logo } from './Logo';
import { StatusDot, statusLabel } from './StatusDot';

const TABS: Array<{ id: TabId; label: string; icon: typeof Cpu }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'firmware', label: 'Firmware', icon: Cpu },
  { id: 'device', label: 'Device Info', icon: Info },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function NavBar() {
  const { tab, setTab, connection } = useApp();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <button onClick={() => setTab('dashboard')} className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-accent/60" aria-label="TuneHub home">
          <Logo />
        </button>

        <nav className="ml-2 hidden h-full items-stretch gap-1 md:flex" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-3.5 text-[13px] font-medium transition ${
                  active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-accent' : ''}`} />
                {label}
                {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-accent shadow-[0_0_12px_rgba(255,121,0,0.8)]" />}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-3 pr-3.5">
          <StatusDot status={connection.status} />
          <span className="truncate font-mono text-[11px] text-zinc-400">
            {connection.status === 'connected' && connection.deviceName ? connection.deviceName : statusLabel(connection.status)}
          </span>
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className="flex border-t border-white/[0.05] md:hidden" aria-label="Main">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                active ? 'text-accent' : 'text-zinc-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
