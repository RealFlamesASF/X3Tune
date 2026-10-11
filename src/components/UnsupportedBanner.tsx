import { TriangleAlert } from 'lucide-react';
import { describeUnsupportedReason } from '../modules/BluetoothManager';

export function UnsupportedBanner() {
  const reason = describeUnsupportedReason();
  if (!reason) return null;
  return (
    <div className="panel animate-fadeUp border-amber-500/30 bg-amber-500/[0.06] p-5" role="alert">
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="space-y-2 text-[13px] leading-relaxed">
          <h2 className="text-sm font-semibold text-amber-200">Bluetooth is not available in this browser</h2>
          <p className="text-zinc-300">{reason}</p>
          <ul className="list-disc space-y-1 pl-5 text-zinc-400">
            <li>Use Chrome or Edge (Chromium) on a supported desktop or Android system.</li>
            <li>The page must be served over HTTPS or from <span className="font-mono text-zinc-300">http://localhost</span>.</li>
            <li>Your computer needs a working Bluetooth Low Energy adapter that is turned on.</li>
          </ul>
          <p className="text-zinc-500">The firmware library still works without Bluetooth, but nothing can be flashed.</p>
        </div>
      </div>
    </div>
  );
}
