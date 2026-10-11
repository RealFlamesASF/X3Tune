import type { ReactNode } from 'react';

export function Panel({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName = 'p-5',
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel animate-fadeUp ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-accent">{icon}</span>}
            {title && <h2 className="text-sm font-semibold tracking-wide text-zinc-100">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      {children && <p className="max-w-sm text-[13px] leading-relaxed text-zinc-500">{children}</p>}
      {action}
    </div>
  );
}
