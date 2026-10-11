import { useCallback, useEffect, useState } from 'react';
import { FirmwareLibrary } from '../components/FirmwareLibrary';
import { FirmwareUploader } from '../components/FirmwareUploader';
import { FlashHistory } from '../components/FlashHistory';
import { FlashWorkflow, type FlashSelection } from '../components/FlashWorkflow';
import { useApp } from '../context/AppContext';
import { Notifications } from '../modules/NotificationSystem';
import type { FirmwareFileRecord } from '../types';

export function Firmware() {
  const { files } = useApp();
  const [selection, setSelection] = useState<FlashSelection>({ modelId: null, component: null, fileId: null });

  const patch = useCallback((p: Partial<FlashSelection>) => setSelection((s) => ({ ...s, ...p })), []);

  // If the selected file was removed, clear the selection.
  useEffect(() => {
    if (selection.fileId && !files.some((f) => f.id === selection.fileId)) patch({ fileId: null });
  }, [files, selection.fileId, patch]);

  function useForFlash(rec: FirmwareFileRecord) {
    patch({ modelId: rec.modelId, component: rec.component, fileId: rec.id });
    Notifications.info('File selected for flashing', 'Review the flashing workflow to continue.');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono">Firmware manager</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Firmware</h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-zinc-400">
          Organise your own firmware files by scooter model and component, check them locally, and walk through the flashing safety
          workflow. Files never leave your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <FirmwareUploader />
          <FirmwareLibrary flashFileId={selection.fileId} onUseForFlash={useForFlash} />
        </div>
        <div className="space-y-6">
          <FlashWorkflow selection={selection} onChange={patch} />
          <FlashHistory />
        </div>
      </div>
    </div>
  );
}
