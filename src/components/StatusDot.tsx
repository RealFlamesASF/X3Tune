import type { ConnectionStatus } from '../types';

const COLORS: Record<ConnectionStatus, { dot: string; ring: string; label: string }> = {
  connected: { dot: 'bg-emerald-400', ring: 'bg-emerald-400/50', label: 'Connected' },
  connecting: { dot: 'bg-accent', ring: 'bg-accent/50', label: 'Connecting' },
  disconnected: { dot: 'bg-zinc-600', ring: 'bg-zinc-600/0', label: 'Disconnected' },
  error: { dot: 'bg-red-500', ring: 'bg-red-500/0', label: 'Error' },
  unsupported: { dot: 'bg-zinc-700', ring: 'bg-zinc-700/0', label: 'Unsupported' },
};

export function statusLabel(status: ConnectionStatus): string {
  return COLORS[status].label;
}

export function StatusDot({ status, size = 8 }: { status: ConnectionStatus; size?: number }) {
  const c = COLORS[status];
  const pulsing = status === 'connecting' || status === 'connected';
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }} aria-hidden="true">
      {pulsing && <span className={`absolute inset-0 rounded-full ${c.ring} animate-pulseRing`} />}
      <span className={`relative inline-block h-full w-full rounded-full ${c.dot}`} />
    </span>
  );
}

export function StatusPill({ status, label }: { status: ConnectionStatus; label?: string }) {
  return (
    <span className="chip">
      <StatusDot status={status} size={7} />
      {label ?? statusLabel(status)}
    </span>
  );
}
