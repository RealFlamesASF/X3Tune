import { History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../lib/format';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import type { FlashOutcome } from '../types';
import { EmptyState, Panel } from './Panel';

const OUTCOME: Record<FlashOutcome, { label: string; cls: string }> = {
  success: { label: 'FLASHED', cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  failed: { label: 'FAILED', cls: 'border-red-500/30 bg-red-500/10 text-red-300' },
  aborted: { label: 'BLOCKED', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  unsupported: { label: 'NOT WRITTEN', cls: 'border-white/15 bg-white/5 text-zinc-300' },
};

export function FlashHistory() {
  const { history } = useApp();
  return (
    <Panel title="Firmware history" icon={<History className="h-4 w-4" />} bodyClassName="p-0">
      {history.length === 0 ? (
        <EmptyState icon={<History className="h-5 w-5" />} title="No flash attempts yet">
          Every attempt, including ones where nothing was written, is recorded here with its real outcome.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {history.map((h) => (
            <li key={h.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-[13px] font-medium text-zinc-200" title={h.fileName}>
                  {h.fileName}
                </p>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${OUTCOME[h.outcome].cls}`}>{OUTCOME[h.outcome].label}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">
                {ScooterRegistry.get(h.modelId).name} · {h.component} · {formatDateTime(h.at)}
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-zinc-500">{h.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
