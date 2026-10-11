import { Database, Globe, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Panel } from '../components/Panel';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../lib/format';
import { describeUnsupportedReason } from '../modules/BluetoothManager';
import { FirmwareManager } from '../modules/FirmwareManager';
import { FirmwareStorage } from '../modules/FirmwareStorage';
import { Notifications } from '../modules/NotificationSystem';

function Capability({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-white/[0.05] px-5 py-3 last:border-0">
      <div>
        <p className="text-[13px] text-zinc-200">{label}</p>
        <p className="mt-0.5 text-[12px] text-zinc-500">{detail}</p>
      </div>
      <span className={`chip shrink-0 ${ok ? 'border-emerald-500/25 text-emerald-300' : 'border-red-500/30 text-red-300'}`}>{ok ? 'YES' : 'NO'}</span>
    </li>
  );
}

export function Settings() {
  const { files, history, reloadLibrary } = useApp();
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    void FirmwareStorage.estimateUsage().then(setUsage).catch(() => setUsage(null));
  }, [files.length]);

  const btReason = describeUnsupportedReason();

  async function clearAll() {
    setClearing(true);
    try {
      await FirmwareManager.clearAll();
      await reloadLibrary();
      Notifications.success('Local data cleared', 'All stored firmware files and history were removed from this browser.');
      setConfirming(false);
    } catch (err) {
      Notifications.error('Could not clear data', (err as Error).message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono">Preferences</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Environment" icon={<Globe className="h-4 w-4" />} bodyClassName="p-0">
          <ul>
            <Capability label="Secure context" ok={window.isSecureContext} detail="Web Bluetooth requires HTTPS or http://localhost." />
            <Capability label="Web Bluetooth" ok={!btReason} detail={btReason ?? 'navigator.bluetooth is available.'} />
            <Capability label="IndexedDB" ok={'indexedDB' in window} detail="Used to store your firmware library in this browser." />
            <Capability label="SHA-256 hashing" ok={!!globalThis.crypto?.subtle} detail="Needed to compute integrity hashes of firmware files." />
          </ul>
          <p className="border-t border-white/[0.06] px-5 py-3.5 text-[12px] leading-relaxed text-zinc-500">
            Use Chrome or Edge on a supported desktop OS. Safari and Firefox do not implement Web Bluetooth.
          </p>
        </Panel>

        <Panel title="Local storage" icon={<Database className="h-4 w-4" />}>
          <dl className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="label-mono">Firmware files</dt>
              <dd className="mt-1 font-mono text-lg text-zinc-100">{files.length}</dd>
            </div>
            <div>
              <dt className="label-mono">History entries</dt>
              <dd className="mt-1 font-mono text-lg text-zinc-100">{history.length}</dd>
            </div>
            <div className="col-span-2">
              <dt className="label-mono">Browser storage used (all of this site)</dt>
              <dd className="mt-1 font-mono text-zinc-300">{usage ? `${formatBytes(usage.usage)} of ${formatBytes(usage.quota)}` : 'Unavailable'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] leading-relaxed text-zinc-500">
            Everything is stored locally in your browser profile. Nothing is uploaded. Clearing site data in your browser also removes it.
          </p>
          <div className="mt-4">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-danger" disabled={clearing} onClick={() => void clearAll()}>
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Yes, delete everything
                </button>
                <button className="btn-ghost" disabled={clearing} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn-ghost hover:!text-red-300" disabled={files.length === 0 && history.length === 0} onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" /> Clear library and history
              </button>
            )}
          </div>
        </Panel>

        <Panel title="Folder layout" icon={<Database className="h-4 w-4" />}>
          <pre className="overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[11.5px] leading-relaxed text-zinc-400">{FirmwareManager.folderLayoutText()}</pre>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
            A web page cannot browse arbitrary local folders, so this structure is virtual and lives in IndexedDB. Download a file from the library to save it to disk.
          </p>
        </Panel>

        <Panel title="Safety principles" icon={<ShieldCheck className="h-4 w-4" />}>
          <ul className="list-disc space-y-2 pl-5 text-[12.5px] leading-relaxed text-zinc-400">
            <li>No fake data: unreadable values are shown as “Unavailable” or “Not supported”.</li>
            <li>No simulated flashing, ever. Success is only reported from a real device response.</li>
            <li>No guessed Bluetooth UUIDs, authentication sequences, or firmware protocols.</li>
            <li>No changes to regional speed limits, safety protections, or undocumented motor-controller behaviour.</li>
            <li>Cryptographic verification and authentication on the device are never bypassed.</li>
            <li>Flash adapters registered: <span className="font-mono text-amber-300">0 verified</span>.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
