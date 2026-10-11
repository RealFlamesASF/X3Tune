import { Bluetooth, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState, Panel } from '../components/Panel';
import { ReadingValue } from '../components/ReadingValue';
import { StatusPill } from '../components/StatusDot';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../lib/format';
import { ScooterRegistry } from '../modules/ScooterRegistry';

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/[0.05] px-5 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-[12.5px] text-zinc-500">
        {label}
        {hint && <span className="ml-2 font-mono text-[10px] text-zinc-700">{hint}</span>}
      </dt>
      <dd className="min-w-0 break-words text-[13px] sm:text-right">{children}</dd>
    </div>
  );
}

export function DeviceInfoPage() {
  const { connection, deviceInfo, infoLoading, setTab } = useApp();
  const connected = connection.status === 'connected';
  const model = connection.selectedModelId ? ScooterRegistry.get(connection.selectedModelId) : null;

  const warnings: string[] = [
    'The model shown in TuneHub is your selection. It is not proof of what hardware is connected.',
    'Firmware compatibility cannot be verified by TuneHub. Always confirm model, hardware revision and component with the firmware publisher.',
  ];
  if (connected && deviceInfo) {
    if (deviceInfo.modelNumber.status !== 'ok') warnings.push('The device did not report a model number, so its identity cannot be confirmed.');
    if (deviceInfo.hardwareRevision.status !== 'ok') warnings.push('The device did not report a hardware revision.');
    if (deviceInfo.batteryLevel.status !== 'ok') warnings.push('Battery level could not be read, so power stability cannot be checked before firmware operations.');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono">Device information</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Device Info</h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-zinc-400">
          Only information the device actually reports through standard Bluetooth services is shown. Anything else reads “Unavailable” or “Not supported”.
        </p>
      </div>

      {!connected ? (
        <Panel>
          <EmptyState
            icon={<Bluetooth className="h-5 w-5" />}
            title="No scooter connected"
            action={
              <button className="btn-primary" onClick={() => setTab('dashboard')}>
                <Bluetooth className="h-4 w-4" /> Connect a scooter
              </button>
            }
          >
            Connect a scooter from the Dashboard to read its device information.
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title="Identity" icon={<Info className="h-4 w-4" />} bodyClassName="p-0">
            <dl>
              <Row label="Connection status">
                <StatusPill status={connection.status} />
              </Row>
              <Row label="Bluetooth name">
                <span className="font-mono text-zinc-100">{connection.deviceName ?? 'Unnamed device'}</span>
              </Row>
              <Row label="Selected model" hint="your selection">
                <span className="text-zinc-100">{model ? model.name : 'Not specified'}</span>
              </Row>
              <Row label="Device model" hint="reported by device">
                <ReadingValue reading={deviceInfo?.modelNumber} />
              </Row>
              <Row label="Manufacturer">
                <ReadingValue reading={deviceInfo?.manufacturer} />
              </Row>
              <Row label="Hardware revision">
                <ReadingValue reading={deviceInfo?.hardwareRevision} />
              </Row>
              <Row label="Firmware version">
                <ReadingValue reading={deviceInfo?.firmwareRevision} />
              </Row>
              <Row label="Software version">
                <ReadingValue reading={deviceInfo?.softwareRevision} />
              </Row>
              <Row label="Serial number">
                <ReadingValue reading={deviceInfo?.serialNumber} />
              </Row>
              <Row label="Battery level">
                <ReadingValue reading={deviceInfo?.batteryLevel} format={(v) => `${v}%`} />
              </Row>
              <Row label="Battery voltage">
                <ReadingValue reading={deviceInfo?.batteryVoltage} format={(v) => `${v.toFixed(1)} V`} />
              </Row>
              <Row label="BLE signal">
                <ReadingValue reading={deviceInfo?.signalDbm} format={(v) => `${v} dBm`} />
              </Row>
              <Row label="Last read">
                <span className="font-mono text-zinc-300">{infoLoading ? 'Reading…' : deviceInfo ? formatDateTime(deviceInfo.readAt) : '—'}</span>
              </Row>
            </dl>
          </Panel>

          <Panel title="Compatibility warnings" icon={<TriangleAlert className="h-4 w-4" />}>
            <ul className="space-y-3">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-zinc-400">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  {w}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
