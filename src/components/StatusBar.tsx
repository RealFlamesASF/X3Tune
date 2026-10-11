import { useApp } from '../context/AppContext';
import { describeUnsupportedReason } from '../modules/BluetoothManager';

export function StatusBar() {
  const { connection, files } = useApp();
  const supported = describeUnsupportedReason() === null;
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-white/[0.07] bg-ink-950/90 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-7 max-w-6xl items-center gap-5 px-6 font-mono text-[10.5px] text-zinc-500">
        <span>
          WEB BLUETOOTH <span className={supported ? 'text-emerald-400' : 'text-red-400'}>{supported ? 'AVAILABLE' : 'UNAVAILABLE'}</span>
        </span>
        <span>
          LINK <span className="text-zinc-300">{connection.status.toUpperCase()}</span>
        </span>
        <span>
          LIBRARY <span className="text-zinc-300">{files.length} FILE{files.length === 1 ? '' : 'S'}</span>
        </span>
        <span className="ml-auto">
          FLASH ADAPTERS <span className="text-amber-400">0 VERIFIED</span>
        </span>
      </div>
    </footer>
  );
}
