import { FilePlus2, FileUp, Loader2, Replace, ShieldQuestion, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useApp } from '../context/AppContext';
import { formatBytes } from '../lib/format';
import { FirmwareManager } from '../modules/FirmwareManager';
import { detectComponentsFromName, detectModelFromName, extensionOf, MAX_FILE_BYTES } from '../modules/FirmwareValidator';
import { Notifications } from '../modules/NotificationSystem';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import type { FirmwareComponent, ScooterModelId, ValidationResult } from '../types';
import { FIRMWARE_COMPONENTS } from '../types';
import { CheckList, ValidationBadge } from './CheckList';
import { Panel } from './Panel';

export function FirmwareUploader() {
  const { connection, reloadLibrary } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [modelId, setModelId] = useState<ScooterModelId | ''>('');
  const [component, setComponent] = useState<FirmwareComponent | ''>('');
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<{ validation: ValidationResult; sha256: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file || !modelId || !component) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    FirmwareManager.preview({ file, modelId, component, version, notes })
      .then((p) => !cancelled && setPreview(p))
      .catch((err: Error) => {
        if (cancelled) return;
        setPreview(null);
        Notifications.error('Could not read the file', err.message);
      })
      .finally(() => !cancelled && setPreviewing(false));
    return () => {
      cancelled = true;
    };
    // version and notes do not affect validation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, modelId, component]);

  function stage(f: File) {
    if (f.size > MAX_FILE_BYTES) {
      Notifications.error('File too large', `Maximum supported size is ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
      return;
    }
    setFile(f);
    setPreview(null);
    // Pre-fill from the file name, but only as a suggestion the user can change.
    const m = detectModelFromName(f.name) ?? connection.selectedModelId;
    setModelId(m ?? '');
    const comps = detectComponentsFromName(f.name);
    setComponent(comps.length === 1 ? comps[0] : '');
    setVersion('');
    setNotes('');
  }

  function reset() {
    setFile(null);
    setModelId('');
    setComponent('');
    setVersion('');
    setNotes('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) stage(f);
  }

  async function save() {
    if (!file || !modelId || !component) return;
    setSaving(true);
    try {
      const rec = await FirmwareManager.importFile({ file, modelId, component, version, notes });
      await reloadLibrary();
      Notifications.success('Added to library', FirmwareManager.virtualPath(rec));
      if (rec.validation.status === 'warnings') {
        Notifications.warning('Compatibility not verified', 'The file was stored, but TuneHub could not verify it matches your hardware.');
      }
      reset();
    } catch (err) {
      Notifications.error('Could not add file', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!file && !!modelId && !!component && !!preview && preview.validation.status !== 'invalid' && !previewing && !saving;

  return (
    <Panel title="Add firmware file" icon={<Upload className="h-4 w-4" />}>
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && stage(e.target.files[0])} />

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? 'border-accent bg-accent/[0.07]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${dragging ? 'border-accent/50 text-accent' : 'border-white/10 text-zinc-500'}`}>
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Drag and drop a firmware file here</p>
            <p className="mt-1 text-[12px] text-zinc-500">
              Files stay in your browser (IndexedDB). A web page cannot browse your folders, so pick or drop the file.
            </p>
          </div>
          <button className="btn-ghost" onClick={() => inputRef.current?.click()}>
            <FilePlus2 className="h-4 w-4" /> Browse files
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100" title={file.name}>
                {file.name}
              </p>
              <p className="mt-0.5 font-mono text-[11.5px] text-zinc-500">
                {formatBytes(file.size)} · .{extensionOf(file.name) || 'none'} · {file.type || 'application/octet-stream'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button className="btn-ghost px-2.5 py-2" title="Select another file" aria-label="Select another file" onClick={() => inputRef.current?.click()}>
                <Replace className="h-4 w-4" />
              </button>
              <button className="btn-ghost px-2.5 py-2 hover:!text-red-300" title="Remove file" aria-label="Remove file" onClick={reset}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-mono">Scooter model</span>
              <select className="input mt-1.5" value={modelId} onChange={(e) => setModelId(e.target.value as ScooterModelId | '')}>
                <option value="">Choose a model…</option>
                {ScooterRegistry.list().map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-mono">Version label (optional)</span>
              <input className="input mt-1.5 font-mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Your own label, e.g. as named by the source" />
            </label>
          </div>

          <div>
            <span className="label-mono">Component</span>
            <div className="mt-1.5 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Firmware component">
              {FIRMWARE_COMPONENTS.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={component === c}
                  onClick={() => setComponent(c)}
                  className={`rounded-xl border py-2.5 font-mono text-[13px] font-medium transition ${
                    component === c ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-zinc-600">
              <ShieldQuestion className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500/70" />
              VCU, MCU, BLE and BMS are separate targets. Not every scooter has every one, and TuneHub does not assume any.
            </p>
          </div>

          <label className="block">
            <span className="label-mono">Notes (optional)</span>
            <textarea className="input mt-1.5 min-h-[64px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Source, release notes, hash from the publisher…" />
          </label>

          <div className="rounded-xl border border-white/[0.07] bg-ink-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="label-mono">Local validation</p>
              {previewing ? (
                <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                </span>
              ) : preview ? (
                <ValidationBadge status={preview.validation.status} />
              ) : null}
            </div>
            {preview ? (
              <CheckList items={preview.validation.checks} />
            ) : (
              <p className="text-[12.5px] text-zinc-500">{previewing ? 'Reading file…' : 'Choose a model and component to run validation.'}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className="btn-ghost" onClick={reset} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" disabled={!canSave} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Add to library
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
