import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { Notifications, useNotifications } from '../modules/NotificationSystem';
import type { NotificationKind } from '../types';

const STYLE: Record<NotificationKind, { icon: typeof Info; accent: string; ring: string }> = {
  success: { icon: CircleCheck, accent: 'text-emerald-400', ring: 'border-emerald-500/25' },
  error: { icon: CircleX, accent: 'text-red-400', ring: 'border-red-500/30' },
  warning: { icon: TriangleAlert, accent: 'text-amber-400', ring: 'border-amber-500/30' },
  info: { icon: Info, accent: 'text-sky-400', ring: 'border-sky-500/25' },
};

export function Toasts() {
  const items = useNotifications();
  return (
    <div
      className="pointer-events-none fixed right-4 top-[72px] z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2.5"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {items.map((n) => {
        const s = STYLE[n.kind];
        const Icon = s.icon;
        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex animate-slideIn items-start gap-3 rounded-xl border ${s.ring} bg-ink-800/95 p-3.5 shadow-panel backdrop-blur-xl`}
            role={n.kind === 'error' ? 'alert' : 'status'}
          >
            <Icon className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${s.accent}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-100">{n.title}</p>
              {n.message && <p className="mt-0.5 break-words text-[13px] leading-snug text-zinc-400">{n.message}</p>}
            </div>
            <button
              onClick={() => Notifications.dismiss(n.id)}
              className="rounded-md p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
