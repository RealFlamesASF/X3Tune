import { Bluetooth, BluetoothSearching, History, Loader2, RotateCcw, TriangleAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import type { ScooterModelId } from '../types';
import { formatDateTime } from '../lib/format';

export function ConnectHero({ selectedId }: { selectedId: ScooterModelId | null }) {
  const { connection, connect, lastConnected } = useApp();
  const connecting = connection.status === 'connecting';
  const unsupported = connection.status === 'unsupported';
  const hasError = connection.status === 'error' && connection.error;
  const selectedName = selectedId ? ScooterRegistry.get(selectedId).name : null;

  return (
    <section className="glass relative animate-fadeUp overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      {connecting && <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-white/5"><div className="h-full w-1/3 animate-scan bg-accent" /></div>}

      <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          {connecting && (
            <>
              <span className="absolute inset-0 rounded-full border border-accent/50 animate-pulseRing" />
              <span className="absolute inset-0 rounded-full border border-accent/40 animate-pulseRing [animation-delay:0.55s]" />
              <span className="absolute inset-0 rounded-full border border-accent/30 animate-pulseRing [animation-delay:1.1s]" />
            </>
          )}
          <div
            className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border ${
              connecting ? 'border-accent/60 bg-accent/10 text-accent' : 'border-white/10 bg-white/[0.04] text-zinc-300'
            }`}
          >
            {connecting ? <BluetoothSearching className="h-8 w-8" /> : <Bluetooth className="h-8 w-8" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="label-mono">{connecting ? 'Establishing link' : 'No scooter connected'}</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
            {connecting ? (connection.progressLabel ?? 'Connecting…') : 'Connect your scooter'}
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-zinc-400">
            {connecting
              ? 'Complete the pairing prompt in your browser. TuneHub only reports a connection once the Bluetooth link is really open.'
              : 'Power on the scooter, keep it in range, then pick it from your browser’s Bluetooth chooser. TuneHub only reads standard Bluetooth information; it does not send commands to the scooter.'}
          </p>
          {selectedName && !connecting && (
            <p className="mt-2 text-[12.5px] text-zinc-500">
              Selected model: <span className="font-medium text-zinc-300">{selectedName}</span>
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 md:w-auto">
          <button className="btn-primary px-6 py-3.5 text-[15px]" disabled={connecting || unsupported} onClick={() => connect(selectedId)}>
            {connecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <Bluetooth className="h-5 w-5" /> Connect Scooter
              </>
            )}
          </button>
          <p className="text-center font-mono text-[10.5px] text-zinc-600">Chrome / Edge · HTTPS or localhost</p>
        </div>
      </div>

      {hasError && (
        <div className="relative mt-6 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4" role="alert">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex-1 text-[13px]">
            <p className="font-medium text-red-300">Connection failed</p>
            <p className="mt-0.5 text-zinc-400">{connection.error}</p>
          </div>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => connect(selectedId)}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {!hasError && connection.status === 'disconnected' && connection.error && (
        <div className="relative mt-6 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-[13px] text-amber-200">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {connection.error}
        </div>
      )}

      {lastConnected && !connecting && (
        <div className="relative mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.06] pt-4 text-[12px] text-zinc-500">
          <History className="h-3.5 w-3.5" />
          Last connection: <span className="font-mono text-zinc-300">{lastConnected.deviceName}</span>
          <span>·</span>
          <span className="font-mono">{formatDateTime(lastConnected.at)}</span>
        </div>
      )}
    </section>
  );
}
