import { ChevronDown, Download, FolderTree, HardDrive, RefreshCw, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBytes, formatDateTime } from '../lib/format';
import { FirmwareManager } from '../modules/FirmwareManager';
import { Notifications } from '../modules/NotificationSystem';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import type { FirmwareComponent, FirmwareFileRecord, ScooterModelId } from '../types';
import { FIRMWARE_COMPONENTS } from '../types';
import { CheckList, ValidationBadge } from './CheckList';
import { EmptyState, Panel } from './Panel';

interface Filter {
  modelId: ScooterModelId | null;
  component: FirmwareComponent | null;
}

export function FirmwareLibrary({
  flashFileId,
  onUseForFlash,
}: {
  flashFileId: string | null;
  onUseForFlash: (rec: FirmwareFileRecord) => void;
}) {
  const { files, libraryLoading, libraryError, reloadLibrary } = useApp();
  const [filter, setFilter] = useState<Filter>({ modelId: null, component: null });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const tree = useMemo(() => FirmwareManager.tree(files), [files]);
  const visible = files.filter(
    (f) => (!filter.modelId || f.modelId === filter.modelId) && (!filter.component || f.component === filter.component),
  );

  function toggle(modelId: ScooterModelId, component: FirmwareComponent | null) {
    setFilter((cur) => (cur.modelId === modelId && cur.component === component ? { modelId: null, component: null } : { modelId, component }));
  }

  async function run(id: string, fn: () => Promise<void>, errTitle: string) {
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      Notifications.error(errTitle, (err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel
      title="Firmware library"
      icon={<FolderTree className="h-4 w-4" />}
      action={<span className="chip">{files.length} file{files.length === 1 ? '' : 's'}</span>}
      bodyClassName="p-0"
    >
      {libraryError ? (
        <div className="p-5 text-[13px] text-red-300" role="alert">
          Local storage is unavailable: {libraryError}. Private browsing modes often block IndexedDB.
        </div>
      ) : (
        <>
          <div className="border-b border-white/[0.06] p-4">
            <p className="label-mono mb-2.5">firmware/</p>
            <div className="space-y-1.5">
              {ScooterRegistry.list().map((m) => {
                const total = FIRMWARE_COMPONENTS.reduce((n, c) => n + tree[m.id][c].length, 0);
                const modelActive = filter.modelId === m.id && filter.component === null;
                return (
                  <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <button
                      onClick={() => toggle(m.id, null)}
                      className={`w-[104px] shrink-0 truncate rounded-md px-2 py-1 text-left font-mono text-[12px] transition ${
                        modelActive ? 'bg-accent/15 text-accent' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                      }`}
                      title={`${m.name} (${total} file${total === 1 ? '' : 's'})`}
                    >
                      {m.id}/
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {FIRMWARE_COMPONENTS.map((c) => {
                        const n = tree[m.id][c].length;
                        const active = filter.modelId === m.id && filter.component === c;
                        return (
                          <button
                            key={c}
                            onClick={() => toggle(m.id, c)}
                            className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                              active
                                ? 'border-accent bg-accent/10 text-accent'
                                : n > 0
                                  ? 'border-white/15 bg-white/[0.05] text-zinc-200 hover:border-white/30'
                                  : 'border-white/[0.06] text-zinc-600 hover:border-white/15'
                            }`}
                          >
                            {c}
                            <span className="ml-1.5 opacity-70">{n}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {(filter.modelId || filter.component) && (
              <button className="mt-3 text-[11.5px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline" onClick={() => setFilter({ modelId: null, component: null })}>
                Clear filter
              </button>
            )}
          </div>

          {libraryLoading ? (
            <div className="space-y-3 p-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={<HardDrive className="h-5 w-5" />} title={files.length === 0 ? 'Your library is empty' : 'No files match this filter'}>
              {files.length === 0
                ? 'Add a firmware file above to organise it by scooter model and component.'
                : 'Pick another folder, or clear the filter to see every file.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {visible.map((f) => {
                const open = expanded === f.id;
                const selected = flashFileId === f.id;
                return (
                  <li key={f.id} className={selected ? 'bg-accent/[0.04]' : ''}>
                    <div className="flex items-start gap-3 px-5 py-3.5">
                      <button
                        className="mt-1 text-zinc-500 transition hover:text-zinc-200"
                        onClick={() => setExpanded(open ? null : f.id)}
                        aria-expanded={open}
                        aria-label={open ? 'Hide details' : 'Show details'}
                      >
                        <ChevronDown className={`h-4 w-4 transition ${open ? '' : '-rotate-90'}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-zinc-100" title={f.fileName}>
                            {f.fileName}
                          </p>
                          <ValidationBadge status={f.validation.status} />
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-zinc-500" title={FirmwareManager.virtualPath(f)}>
                          {FirmwareManager.virtualPath(f)}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-zinc-600">
                          {formatBytes(f.size)} · .{f.extension || 'none'}
                          {f.version && <> · {f.version}</>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => onUseForFlash(f)} title="Use this file in the flashing workflow">
                          <Zap className="h-3.5 w-3.5 text-accent" /> <span className="hidden sm:inline">{selected ? 'Selected' : 'Use'}</span>
                        </button>
                        <button
                          className="btn-ghost px-2.5 py-1.5"
                          title="Download"
                          aria-label={`Download ${f.fileName}`}
                          disabled={busyId === f.id}
                          onClick={() => void run(f.id, () => FirmwareManager.download(f), 'Download failed')}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {confirmId === f.id ? (
                          <button
                            className="btn-danger px-2.5 py-1.5 text-xs"
                            disabled={busyId === f.id}
                            onClick={() =>
                              void run(
                                f.id,
                                async () => {
                                  await FirmwareManager.remove(f.id);
                                  await reloadLibrary();
                                  setConfirmId(null);
                                  Notifications.success('File removed', f.fileName);
                                },
                                'Could not remove file',
                              )
                            }
                          >
                            Confirm
                          </button>
                        ) : (
                          <button className="btn-ghost px-2.5 py-1.5 hover:!text-red-300" title="Remove" aria-label={`Remove ${f.fileName}`} onClick={() => setConfirmId(f.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {open && (
                      <div className="space-y-4 border-t border-white/[0.05] bg-ink-900/50 px-5 py-4 pl-12">
                        <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                          <div className="flex gap-2">
                            <dt className="text-zinc-500">Model</dt>
                            <dd className="text-zinc-300">{ScooterRegistry.get(f.modelId).name}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-zinc-500">Component</dt>
                            <dd className="font-mono text-zinc-300">{f.component}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-zinc-500">Added</dt>
                            <dd className="font-mono text-zinc-300">{formatDateTime(f.addedAt)}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="text-zinc-500">Type</dt>
                            <dd className="font-mono text-zinc-300">{f.mimeType}</dd>
                          </div>
                          <div className="flex gap-2 sm:col-span-2">
                            <dt className="text-zinc-500">SHA-256</dt>
                            <dd className="break-all font-mono text-zinc-400">{f.sha256 || 'Unavailable'}</dd>
                          </div>
                          {f.notes && (
                            <div className="flex gap-2 sm:col-span-2">
                              <dt className="text-zinc-500">Notes</dt>
                              <dd className="text-zinc-300">{f.notes}</dd>
                            </div>
                          )}
                        </dl>
                        <CheckList items={f.validation.checks} />
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          disabled={busyId === f.id}
                          onClick={() =>
                            void run(
                              f.id,
                              async () => {
                                await FirmwareManager.revalidate(f);
                                await reloadLibrary();
                                Notifications.info('Validation re-run', f.fileName);
                              },
                              'Validation failed',
                            )
                          }
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Re-validate
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
