import { Ban, CircleCheck, CircleX, Loader2, ShieldAlert, TriangleAlert, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../lib/format';
import { BluetoothManager } from '../modules/BluetoothManager';
import { FirmwareFlasher } from '../modules/FirmwareFlasher';
import { FirmwareManager } from '../modules/FirmwareManager';
import { Notifications } from '../modules/NotificationSystem';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import type { FirmwareComponent, FlashProgress, FlashResult, ScooterModelId } from '../types';
import { FIRMWARE_COMPONENTS } from '../types';
import { CheckList } from './CheckList';
import { Panel } from './Panel';

export interface FlashSelection {
  modelId: ScooterModelId | null;
  component: FirmwareComponent | null;
  fileId: string | null;
}

type StepState = 'done' | 'active' | 'warn' | 'idle';

function Step({ n, title, state, children }: { n: number; title: string; state: StepState; children?: ReactNode }) {
  const ring =
    state === 'done'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : state === 'warn'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : state === 'active'
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-white/10 bg-white/[0.03] text-zinc-600';
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-white/[0.08] last:hidden" aria-hidden="true" />
      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold ${ring}`}>
        {state === 'done' ? <CircleCheck className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <h3 className={`text-[13.5px] font-semibold ${state === 'idle' ? 'text-zinc-500' : 'text-zinc-100'}`}>{title}</h3>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

export function FlashWorkflow({ selection, onChange }: { selection: FlashSelection; onChange: (patch: Partial<FlashSelection>) => void }) {
  const { connection, deviceInfo, files, setTab, reloadLibrary } = useApp();
  const connected = connection.status === 'connected';

  const [confirmModel, setConfirmModel] = useState(false);
  const [confirmPower, setConfirmPower] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [result, setResult] = useState<FlashResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Adopt the model chosen on the dashboard if none is selected here yet.
  useEffect(() => {
    if (connection.selectedModelId && !selection.modelId) onChange({ modelId: connection.selectedModelId });
  }, [connection.selectedModelId, selection.modelId, onChange]);

  // Any change to the target invalidates confirmations and old results.
  useEffect(() => {
    setConfirmModel(false);
    setConfirmPower(false);
    setResult(null);
    setProgress(null);
  }, [selection.modelId, selection.component, selection.fileId, connected]);

  const file = files.find((f) => f.id === selection.fileId) ?? null;
  const model = selection.modelId ? ScooterRegistry.get(selection.modelId) : null;
  const candidates = files.filter((f) => f.modelId === selection.modelId && f.component === selection.component);

  const preflight = useMemo(
    () =>
      FirmwareFlasher.preflight({
        connected,
        selectedModelId: selection.modelId,
        component: selection.component,
        file,
        deviceInfo,
      }),
    [connected, selection.modelId, selection.component, file, deviceInfo],
  );

  const canPress = connected && !!file && !!selection.modelId && !!selection.component && confirmModel && confirmPower && !flashing;

  async function handleFlash() {
    const server = BluetoothManager.getServer();
    if (!server || !file || !selection.modelId || !selection.component) return;
    const modelId = selection.modelId;
    const component = selection.component;
    setFlashing(true);
    setResult(null);
    setProgress(null);
    const abort = new AbortController();
    abortRef.current = abort;

    let res: FlashResult;
    try {
      const data = await FirmwareManager.getData(file.id);
      res = data
        ? await FirmwareFlasher.flash({ server, selectedModelId: modelId, component, file, data, deviceInfo }, preflight, setProgress, abort.signal)
        : { outcome: 'failed', message: 'Stored file data is missing. Nothing was written.', bytesWritten: 0 };
    } catch (err) {
      res = { outcome: 'failed', message: `Unexpected error: ${(err as Error).message}`, bytesWritten: 0 };
    }

    setResult(res);
    setFlashing(false);
    abortRef.current = null;

    try {
      await FirmwareManager.logFlash({ fileId: file.id, fileName: file.fileName, modelId, component, outcome: res.outcome, message: res.message });
      await reloadLibrary();
    } catch {
      /* history is best-effort */
    }

    if (res.outcome === 'success') Notifications.success('Firmware written', res.message);
    else if (res.outcome === 'unsupported') Notifications.warning('Nothing was written', res.message);
    else if (res.outcome === 'aborted') Notifications.warning('Flashing blocked', res.message);
    else Notifications.error('Flashing failed', res.message);
  }

  const pct = progress && progress.totalBytes > 0 ? Math.min(100, Math.round((progress.bytesWritten / progress.totalBytes) * 100)) : null;

  return (
    <Panel title="Flashing workflow" icon={<Zap className="h-4 w-4" />} action={<span className="chip text-amber-300">PROTOCOL: NOT VERIFIED</span>}>
      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-[12.5px] leading-relaxed text-amber-100/90">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          No verified flashing protocol is implemented. TuneHub validates files locally and walks through every safety check, but it will
          not write to the scooter until a verified adapter exists for your exact model and component. It never sends arbitrary bytes to
          unknown Bluetooth characteristics.
        </p>
      </div>

      <ol>
        {/* 1 */}
        <Step n={1} title="Select connected scooter" state={connected && selection.modelId ? 'done' : 'active'}>
          {connected ? (
            <div className="space-y-3">
              <p className="text-[12.5px] text-zinc-400">
                Connected to <span className="font-mono text-zinc-200">{connection.deviceName}</span>
              </p>
              <label className="block max-w-xs">
                <span className="label-mono">Model (your selection, not verified)</span>
                <select
                  className="input mt-1.5"
                  value={selection.modelId ?? ''}
                  onChange={(e) => onChange({ modelId: (e.target.value || null) as ScooterModelId | null, fileId: null })}
                >
                  <option value="">Choose a model…</option>
                  {ScooterRegistry.list().map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[12.5px] text-zinc-500">No scooter is connected. Flashing requires a live Bluetooth connection.</p>
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setTab('dashboard')}>
                Go to Dashboard
              </button>
            </div>
          )}
        </Step>

        {/* 2 */}
        <Step n={2} title="Select firmware component" state={selection.component ? 'done' : selection.modelId ? 'active' : 'idle'}>
          <div className="grid max-w-md grid-cols-4 gap-2" role="radiogroup" aria-label="Component to flash">
            {FIRMWARE_COMPONENTS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={selection.component === c}
                onClick={() => onChange({ component: c, fileId: null })}
                className={`rounded-xl border py-2 font-mono text-[12.5px] font-medium transition ${
                  selection.component === c ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {model && model.knownComponents === null && (
            <p className="mt-2 text-[11.5px] text-zinc-600">It is not known which of these targets {model.name} actually has. None is assumed.</p>
          )}
        </Step>

        {/* 3 */}
        <Step n={3} title="Choose a firmware file" state={file ? 'done' : selection.component && selection.modelId ? 'active' : 'idle'}>
          {selection.modelId && selection.component ? (
            candidates.length === 0 ? (
              <p className="text-[12.5px] text-zinc-500">
                No files stored under <span className="font-mono text-zinc-400">firmware/{selection.modelId}/{selection.component}/</span>. Add one with the uploader.
              </p>
            ) : (
              <ul className="max-w-xl space-y-1.5" role="radiogroup" aria-label="Firmware file">
                {candidates.map((f) => (
                  <li key={f.id}>
                    <button
                      role="radio"
                      aria-checked={selection.fileId === f.id}
                      onClick={() => onChange({ fileId: f.id })}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        selection.fileId === f.id ? 'border-accent bg-accent/[0.07]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-zinc-100">{f.fileName}</span>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {formatBytes(f.size)}
                          {f.version && ` · ${f.version}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-[12.5px] text-zinc-600">Choose a model and component first.</p>
          )}
        </Step>

        {/* 4 */}
        <Step n={4} title="Validate model and hardware compatibility" state={!file ? 'idle' : preflight.canFlash ? 'done' : 'warn'}>
          {file ? <CheckList items={preflight.items} /> : <p className="text-[12.5px] text-zinc-600">Runs once a file is chosen.</p>}
        </Step>

        {/* 5 */}
        <Step n={5} title="Review firmware details and warnings" state={file ? 'active' : 'idle'}>
          {file && (
            <div className="space-y-3">
              <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-zinc-500">File</dt>
                  <dd className="truncate text-zinc-200">{file.fileName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Size</dt>
                  <dd className="font-mono text-zinc-200">{formatBytes(file.size)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Target</dt>
                  <dd className="font-mono text-zinc-200">
                    {file.modelId} / {file.component}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-zinc-500">Version</dt>
                  <dd className="font-mono text-zinc-200">{file.version || 'Not provided'}</dd>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <dt className="text-zinc-500">SHA-256</dt>
                  <dd className="break-all font-mono text-zinc-400">{file.sha256 || 'Unavailable'}</dd>
                </div>
              </dl>
              <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-zinc-500">
                <li>Wrong or corrupted firmware can permanently disable a scooter or its battery management.</li>
                <li>Compatibility with your hardware cannot be verified by TuneHub.</li>
                <li>The device bootloader’s own signature and safety checks are never bypassed.</li>
              </ul>
            </div>
          )}
        </Step>

        {/* 6 */}
        <Step n={6} title="Confirm explicitly" state={confirmModel && confirmPower ? 'done' : file ? 'active' : 'idle'}>
          {file && (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-zinc-300">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#ff7900]" checked={confirmModel} onChange={(e) => setConfirmModel(e.target.checked)} />
                I have independently verified that this file is meant for my exact scooter model, hardware revision, and the {selection.component} component.
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-snug text-zinc-300">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#ff7900]" checked={confirmPower} onChange={(e) => setConfirmPower(e.target.checked)} />
                The scooter is sufficiently charged and will stay powered and in range, and I accept the risk of damage.
              </label>

              {!preflight.hasVerifiedAdapter && (
                <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[12px] leading-snug text-zinc-400">
                  <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  No verified protocol exists for this target. Pressing the button records a validation-only attempt. No data will be sent to the scooter.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-primary" disabled={!canPress} onClick={() => void handleFlash()}>
                  {flashing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Flash Firmware
                </button>
                {flashing && (
                  <button className="btn-ghost" onClick={() => abortRef.current?.abort()}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </Step>

        {/* 7 */}
        <Step n={7} title="Progress" state={flashing ? 'active' : 'idle'}>
          {flashing || progress ? (
            pct !== null ? (
              <div className="max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-zinc-500">
                  {formatBytes(progress!.bytesWritten)} / {formatBytes(progress!.totalBytes)} acknowledged by device ({pct}%)
                </p>
              </div>
            ) : (
              <p className="text-[12.5px] text-zinc-500">Working… The device has not reported any write progress.</p>
            )
          ) : (
            <p className="text-[12.5px] text-zinc-600">Shown only when the device reports real write acknowledgements.</p>
          )}
        </Step>

        {/* 8 */}
        <Step n={8} title="Result" state={result ? (result.outcome === 'success' ? 'done' : 'warn') : 'idle'}>
          {result ? (
            <div
              role="status"
              className={`flex max-w-xl items-start gap-3 rounded-xl border p-4 text-[13px] leading-relaxed ${
                result.outcome === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-100'
                  : result.outcome === 'failed'
                    ? 'border-red-500/30 bg-red-500/[0.07] text-red-100'
                    : 'border-amber-500/30 bg-amber-500/[0.06] text-amber-100'
              }`}
            >
              {result.outcome === 'success' ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : result.outcome === 'failed' ? (
                <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div>
                <p>{result.message}</p>
                <p className="mt-1 font-mono text-[11px] opacity-70">Bytes written: {result.bytesWritten}</p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-zinc-600">The outcome is taken from the device’s real response.</p>
          )}
        </Step>
      </ol>
    </Panel>
  );
}
