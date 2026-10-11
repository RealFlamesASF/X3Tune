import { useState } from 'react';
import { ConnectedDashboard } from '../components/ConnectedDashboard';
import { ConnectHero } from '../components/ConnectHero';
import { ScooterCard } from '../components/ScooterCard';
import { UnsupportedBanner } from '../components/UnsupportedBanner';
import { useApp } from '../context/AppContext';
import { ScooterRegistry } from '../modules/ScooterRegistry';
import type { ScooterModelId } from '../types';

export function Dashboard() {
  const { connection } = useApp();
  const [selectedId, setSelectedId] = useState<ScooterModelId | null>(null);
  const connected = connection.status === 'connected';
  const activeSelected = connected ? connection.selectedModelId : selectedId;

  return (
    <div className="space-y-8">
      {connection.status === 'unsupported' && <UnsupportedBanner />}

      {connected ? <ConnectedDashboard /> : <ConnectHero selectedId={selectedId} />}

      <section aria-labelledby="models-heading">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="label-mono">Scooter models</p>
            <h2 id="models-heading" className="mt-1 text-lg font-semibold text-white">
              Select your scooter
            </h2>
          </div>
          <p className="hidden max-w-xs text-right text-[12px] text-zinc-600 sm:block">
            Selecting a model labels your session. It does not prove which hardware is connected.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ScooterRegistry.list().map((m, i) => (
            <ScooterCard key={m.id} model={m} index={i} selected={activeSelected === m.id} onSelect={() => !connected && setSelectedId(m.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}
