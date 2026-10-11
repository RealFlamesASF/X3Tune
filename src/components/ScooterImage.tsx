import { useState } from 'react';
import type { ScooterModel } from '../types';
import { ScooterSilhouette } from './ScooterSilhouette';

/**
 * Shows the model photo when /public/scooters/<id>.jpg exists (add your own licensed images),
 * otherwise a clean silhouette. The silhouette sits underneath so there is no layout flicker.
 */
export function ScooterImage({ model, className = '' }: { model: ScooterModel; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center p-6 text-zinc-600">
        <ScooterSilhouette variant={model.silhouette} className="h-full w-full max-w-[280px]" />
      </div>
      {!failed && (
        <img
          src={model.imageUrl}
          alt={model.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain p-3 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
