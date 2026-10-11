import { Bluetooth, ChevronRight, Loader2, ShieldQuestion, Unplug } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatReading } from '../modules/DeviceInfoService';
import type { ScooterModel } from '../types';
import { ScooterImage } from './ScooterImage';
import { StatusDot, statusLabel } from './StatusDot';

export function ScooterCard({
  model,
  selected,
  onSelect,
  index,
}: {
  model: ScooterModel;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const { connection, connect, disconnect, deviceInfo } = useApp();
  const isThis = connection.selectedModelId === model.id;
  const thisStatus = isThis ? connection.status : 'disconnected';
  const unsupported = connection.status === 'unsupported';
  const busy = connection.status === 'connecting';

  const firmware =
    thisStatus === 'connected' && deviceInfo
      ? formatReading(deviceInfo.firmwareRevision, (v) => v)
      : thisStatus === 'connected'
        ? 'Reading…'
        : null;

  return (
    <article
      onClick={onSelect}
      style={{ animationDelay: `${index * 55}ms` }}
      className={`group panel relative flex animate-fadeUp cursor-pointer flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-white/20 ${
        selected ? 'border-accent/60 shadow-glow' : ''
      }`}
    >
      <div className="relative h-40 bg-gradient-to-b from-white/[0.04] to-transparent">
        <ScooterImage model={model} className="h-full" />
        <span className="chip absolute left-3 top-3">{model.tagline}</span>
        {thisStatus === 'connected' && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-300">
            <StatusDot status="connected" size={6} /> LIVE
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-[15px] font-semibold text-white">{model.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-zinc-500">
            <ShieldQuestion className="h-3.5 w-3.5 text-amber-500/80" />
            Compatibility unverified
          </p>
        </div>

        <dl className="space-y-1.5 text-[12px]">
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500">Connection</dt>
            <dd className="flex items-center gap-1.5 text-zinc-300">
              <StatusDot status={thisStatus} size={6} />
              {statusLabel(thisStatus)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-zinc-500">Firmware</dt>
            <dd className={firmware ? 'font-mono text-zinc-200' : 'text-zinc-600'}>{firmware ?? 'Connect to read'}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-1">
          {thisStatus === 'connected' ? (
            <button
              className="btn-ghost w-full"
              onClick={(e) => {
                e.stopPropagation();
                disconnect();
              }}
            >
              <Unplug className="h-4 w-4" /> Disconnect
            </button>
          ) : (
            <button
              className="btn-primary w-full"
              disabled={unsupported || busy}
              title={unsupported ? (connection.error ?? 'Web Bluetooth is not available') : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
                connect(model.id);
              }}
            >
              {thisStatus === 'connecting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                </>
              ) : (
                <>
                  <Bluetooth className="h-4 w-4" /> Connect <ChevronRight className="-ml-1 h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
