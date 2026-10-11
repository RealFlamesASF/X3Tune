import { Activity, Battery, BatteryLow, Clock, Cpu, Gauge, RefreshCw, ShieldAlert, Signal, Unplug, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateTime, formatDuration } from '../lib/format';
import { useNow } from '../lib/useNow';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import { EmptyState, Panel } from './Panel';
import { ReadingValue } from './ReadingValue';
import { ScooterImage } from './ScooterImage';
import { StatusPill } from './StatusDot';

function Tile({ icon, label, children, sub }: { icon: ReactNode; label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel animate-fadeUp p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <span className="text-accent">{icon}</span>
        <span className="label-mono">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{children}</div>
      {sub && <div className="mt-2 text-[11.5px] leading-snug text-zinc-500">{sub}</div>}
    </div>
  );
}

function signalQuality(dbm: number): string {
  if (dbm >= -60) return 'Strong';
  if (dbm >= -75) return 'Good';
  if (dbm >= -90) return 'Weak';
  return 'Very weak';
}

export function ConnectedDashboard() {
  const { connection, deviceInfo, services, infoLoading, refreshDeviceInfo, disconnect } = useApp();
  const now = useNow(1000, connection.status === 'connected');
  const model = connection.selectedModelId ? ScooterRegistry.get(connection.selectedModelId) : null;
  const battery = deviceInfo?.batteryLevel;
  const batteryPct = battery?.status === 'ok' ? battery.value : null;

  return (
    <div className="space-y-5">
      <section className="glass animate-fadeUp overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          {model ? (
            <ScooterImage model={model} className="h-28 w-full shrink-0 rounded-xl bg-white/[0.03] sm:w-44" />
          ) : (
            <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-white/[0.03] text-zinc-600 sm:w-44">
              <Cpu className="h-10 w-10" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status="connected" />
              <span className="chip">GATT link open</span>
            </div>
            <h1 className="mt-3 truncate text-2xl font-bold tracking-tight text-white">{connection.deviceName ?? 'Unnamed device'}</h1>
            <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-[12.5px] sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-zinc-500">Selected model</dt>
                <dd className="text-zinc-200">{model ? model.name : 'Not specified'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500">Connected</dt>
                <dd className="font-mono text-zinc-200">{connection.connectedAt ? formatDateTime(connection.connectedAt) : '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500">Session</dt>
                <dd className="font-mono text-zinc-200">{connection.connectedAt ? formatDuration(now - connection.connectedAt) : '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500">Device ID</dt>
                <dd className="truncate font-mono text-zinc-400" title={connection.deviceId ?? ''}>
                  {connection.deviceId ? `${connection.deviceId.slice(0, 12)}…` : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11.5px] text-zinc-600">
              The model above is what you selected in TuneHub. It is not verified against the connected hardware.
            </p>
          </div>
          <button className="btn-danger shrink-0 self-start sm:self-center" onClick={disconnect}>
            <Unplug className="h-4 w-4" /> Disconnect
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={batteryPct !== null && batteryPct < 20 ? <BatteryLow className="h-4 w-4" /> : <Battery className="h-4 w-4" />}
          label="Battery level"
          sub={battery && battery.status !== 'ok' ? battery.reason : 'Standard BLE Battery Service'}
        >
          {infoLoading && !deviceInfo ? (
            <span className="text-zinc-600">Reading…</span>
          ) : (
            <>
              <ReadingValue reading={battery} format={(v) => `${v}%`} />
              {batteryPct !== null && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${batteryPct < 20 ? 'bg-red-500' : 'bg-accent'}`}
                    style={{ width: `${batteryPct}%` }}
                  />
                </div>
              )}
            </>
          )}
        </Tile>

        <Tile icon={<Zap className="h-4 w-4" />} label="Battery voltage" sub={deviceInfo?.batteryVoltage.status !== 'ok' ? deviceInfo?.batteryVoltage.reason : undefined}>
          <ReadingValue reading={deviceInfo?.batteryVoltage} format={(v) => `${v.toFixed(1)} V`} />
        </Tile>

        <Tile icon={<Cpu className="h-4 w-4" />} label="Firmware version" sub={deviceInfo?.firmwareRevision.status !== 'ok' ? deviceInfo?.firmwareRevision.reason : 'Device Information Service'}>
          {infoLoading && !deviceInfo ? <span className="text-zinc-600">Reading…</span> : <ReadingValue reading={deviceInfo?.firmwareRevision} />}
        </Tile>

        <Tile
          icon={<Signal className="h-4 w-4" />}
          label="BLE signal"
          sub={
            deviceInfo?.signalDbm.status === 'ok'
              ? signalQuality(deviceInfo.signalDbm.value)
              : deviceInfo?.signalDbm.status !== 'ok'
                ? deviceInfo?.signalDbm.reason
                : undefined
          }
        >
          <ReadingValue reading={deviceInfo?.signalDbm} format={(v) => `${v} dBm`} />
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Diagnostics"
          icon={<Activity className="h-4 w-4" />}
          action={
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => void refreshDeviceInfo()} disabled={infoLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${infoLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          }
          bodyClassName="p-0"
        >
          {services.length === 0 ? (
            <EmptyState icon={<Gauge className="h-5 w-5" />} title={infoLoading ? 'Reading standard services…' : 'No diagnostics yet'}>
              TuneHub checks only the standard Battery and Device Information services.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {services.map((s) => (
                <li key={s.name} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-200">{s.name}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">{s.detail}</p>
                  </div>
                  <span
                    className={`chip shrink-0 ${s.available ? 'border-emerald-500/25 text-emerald-300' : 'text-zinc-500'}`}
                  >
                    {s.available ? 'READABLE' : 'UNAVAILABLE'}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-2 px-5 py-3 text-[12px] text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                Last read: <span className="font-mono">{deviceInfo ? formatDateTime(deviceInfo.readAt) : '—'}</span>
              </li>
            </ul>
          )}
        </Panel>

        <Panel title="Safety" icon={<ShieldAlert className="h-4 w-4" />}>
          <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-zinc-400">
            <li>TuneHub never changes speed limits or disables safety systems.</li>
            <li>No commands are sent to the scooter from this dashboard.</li>
            <li>Values show “Unavailable” when the device does not provide them. Nothing is estimated.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
