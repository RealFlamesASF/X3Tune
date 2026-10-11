import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import type { CheckStatus, ValidationStatus } from '../types';

const ICONS: Record<CheckStatus, { Icon: typeof CircleCheck; cls: string }> = {
  pass: { Icon: CircleCheck, cls: 'text-emerald-400' },
  warn: { Icon: TriangleAlert, cls: 'text-amber-400' },
  fail: { Icon: CircleX, cls: 'text-red-400' },
};

export function CheckList({ items }: { items: Array<{ id: string; label: string; status: CheckStatus; detail: string }> }) {
  return (
    <ul className="space-y-2.5">
      {items.map((c) => {
        const { Icon, cls } = ICONS[c.status];
        return (
          <li key={c.id} className="flex items-start gap-2.5">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} />
            <div className="min-w-0 text-[12.5px] leading-snug">
              <p className="font-medium text-zinc-200">{c.label}</p>
              <p className="mt-0.5 text-zinc-500">{c.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const BADGES: Record<ValidationStatus, { label: string; cls: string }> = {
  valid: { label: 'CHECKS PASSED', cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  warnings: { label: 'WITH WARNINGS', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  invalid: { label: 'FAILED', cls: 'border-red-500/30 bg-red-500/10 text-red-300' },
};

export function ValidationBadge({ status }: { status: ValidationStatus }) {
  const b = BADGES[status];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${b.cls}`}>{b.label}</span>;
}
