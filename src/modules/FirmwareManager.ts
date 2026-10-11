import type {
  FirmwareComponent,
  FirmwareDraft,
  FirmwareFileRecord,
  FlashHistoryEntry,
  ScooterModelId,
  ValidationResult,
} from '../types';
import { FIRMWARE_COMPONENTS } from '../types';
import { FirmwareStorage } from './FirmwareStorage';
import { extensionOf, FirmwareValidator } from './FirmwareValidator';
import { ScooterRegistry } from './ScooterRegistry';

/**
 * FirmwareManager — the user's own firmware library, kept in IndexedDB.
 *
 * A web page cannot browse arbitrary local folders, so organisation is *virtual*:
 * each file is filed under  firmware/<Model>/<Component>/<fileName>  inside the browser store.
 * Files can be downloaded back out at any time.
 */

function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type FirmwareTree = Record<ScooterModelId, Record<FirmwareComponent, FirmwareFileRecord[]>>;

export const FirmwareManager = {
  /** Validate a staged file without storing it. */
  async preview(draft: FirmwareDraft): Promise<{ validation: ValidationResult; sha256: string }> {
    const data = await draft.file.arrayBuffer();
    const { result, sha256 } = await FirmwareValidator.validate({
      fileName: draft.file.name,
      size: draft.file.size,
      data,
      modelId: draft.modelId,
      component: draft.component,
    });
    return { validation: result, sha256 };
  },

  /** Validate and store. Files that fail validation are refused. */
  async importFile(draft: FirmwareDraft): Promise<FirmwareFileRecord> {
    const data = await draft.file.arrayBuffer();
    const { result, sha256 } = await FirmwareValidator.validate({
      fileName: draft.file.name,
      size: draft.file.size,
      data,
      modelId: draft.modelId,
      component: draft.component,
    });
    if (result.status === 'invalid') {
      const failed = result.checks.filter((c) => c.status === 'fail').map((c) => c.detail);
      throw new Error(`File failed validation: ${failed.join(' ')}`);
    }
    const record: FirmwareFileRecord = {
      id: newId(),
      fileName: draft.file.name,
      size: draft.file.size,
      mimeType: draft.file.type || 'application/octet-stream',
      extension: extensionOf(draft.file.name),
      modelId: draft.modelId,
      component: draft.component,
      version: draft.version.trim(),
      notes: draft.notes.trim(),
      sha256,
      addedAt: Date.now(),
      validation: result,
    };
    await FirmwareStorage.putFile(record, data);
    return record;
  },

  list(): Promise<FirmwareFileRecord[]> {
    return FirmwareStorage.listFiles();
  },

  getData(id: string): Promise<ArrayBuffer | null> {
    return FirmwareStorage.getData(id);
  },

  remove(id: string): Promise<void> {
    return FirmwareStorage.deleteFile(id);
  },

  /** Re-run validation on a stored file (e.g. after validator rules change). */
  async revalidate(record: FirmwareFileRecord): Promise<FirmwareFileRecord> {
    const data = await FirmwareStorage.getData(record.id);
    if (!data) throw new Error('Stored file data is missing.');
    const { result, sha256 } = await FirmwareValidator.validate({
      fileName: record.fileName,
      size: record.size,
      data,
      modelId: record.modelId,
      component: record.component,
    });
    const next = { ...record, validation: result, sha256 };
    await FirmwareStorage.updateRecord(next);
    return next;
  },

  async download(record: FirmwareFileRecord): Promise<void> {
    const data = await FirmwareStorage.getData(record.id);
    if (!data) throw new Error('Stored file data is missing.');
    const url = URL.createObjectURL(new Blob([data], { type: record.mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  virtualPath(record: Pick<FirmwareFileRecord, 'modelId' | 'component' | 'fileName'>): string {
    return `firmware/${ScooterRegistry.folderName(record.modelId)}/${record.component}/${record.fileName}`;
  },

  /** Group records as model → component → files. Every model/component slot exists (possibly empty). */
  tree(records: FirmwareFileRecord[]): FirmwareTree {
    const tree = {} as FirmwareTree;
    for (const m of ScooterRegistry.list()) {
      tree[m.id] = { VCU: [], MCU: [], BLE: [], BMS: [] };
    }
    for (const r of records) tree[r.modelId][r.component].push(r);
    return tree;
  },

  /** The suggested folder layout, rendered as text for display / README. */
  folderLayoutText(): string {
    const models = ScooterRegistry.list();
    const lines = ['firmware/'];
    models.forEach((m, mi) => {
      const lastM = mi === models.length - 1;
      lines.push(`${lastM ? '└── ' : '├── '}${m.id}/`);
      FIRMWARE_COMPONENTS.forEach((c, ci) => {
        const lastC = ci === FIRMWARE_COMPONENTS.length - 1;
        lines.push(`${lastM ? '    ' : '│   '}${lastC ? '└── ' : '├── '}${c}/`);
      });
    });
    return lines.join('\n');
  },

  logFlash(entry: Omit<FlashHistoryEntry, 'id' | 'at'>): Promise<void> {
    return FirmwareStorage.addHistory({ ...entry, id: newId(), at: Date.now() });
  },

  history(): Promise<FlashHistoryEntry[]> {
    return FirmwareStorage.listHistory();
  },

  clearAll(): Promise<void> {
    return FirmwareStorage.clearAll();
  },
};
