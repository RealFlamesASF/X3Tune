import type { ScooterModel } from '../types';

/** Generic, original scooter line-art used whenever a model photo is not available. */
export function ScooterSilhouette({ variant, className = '' }: { variant: ScooterModel['silhouette']; className?: string }) {
  const stemTop = variant === 'tall' ? { x: 178, y: 10 } : { x: 172, y: 26 };
  const dual = variant === 'dual';
  return (
    <svg viewBox="0 0 240 140" fill="none" className={className} role="img" aria-label="Scooter silhouette">
      <line x1="14" y1="130" x2="226" y2="130" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
      {/* wheels */}
      <circle cx="52" cy="108" r="22" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="52" cy="108" r="9" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="190" cy="108" r="22" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="190" cy="108" r="9" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
      {/* deck */}
      <rect x="48" y="90" width="140" height="10" rx="5" stroke="currentColor" strokeWidth="3" />
      {/* fender hints */}
      <path d="M30 100c4-18 20-26 38-24" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      {/* stem */}
      <line x1="190" y1="94" x2={stemTop.x} y2={stemTop.y + 4} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* handlebar */}
      <line x1={stemTop.x - 14} y1={stemTop.y} x2={stemTop.x + 8} y2={stemTop.y} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {/* headlight */}
      <circle cx={stemTop.x + 14} cy={stemTop.y + 8} r="3.5" fill="#ff7900" />
      {dual && (
        <>
          <circle cx="52" cy="108" r="3" fill="#ff7900" fillOpacity="0.8" />
          <circle cx="190" cy="108" r="3" fill="#ff7900" fillOpacity="0.8" />
        </>
      )}
    </svg>
  );
}
