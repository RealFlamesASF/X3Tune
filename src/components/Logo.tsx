export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="th-g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#ffa24d" />
          <stop offset="1" stopColor="#ff7900" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#14141a" stroke="rgba(255,255,255,0.1)" />
      <path d="M8.5 10.5h15" stroke="url(#th-g)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M16 10.5V24" stroke="url(#th-g)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="22.5" cy="22" r="2" fill="#ff7900" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[17px] font-bold tracking-tight text-white">
          Tune<span className="text-accent">Hub</span>
        </span>
        <span className="font-mono text-[10px] text-zinc-600">v0.1</span>
      </div>
    </div>
  );
}
