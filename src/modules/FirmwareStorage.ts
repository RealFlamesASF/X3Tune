import type { FlashHistoryEntry, FirmwareFileRecord } from '../types';

/**
 * FirmwareStorage — thin IndexedDB wrapper.
 * Stores: `files` (metadata), `blobs` (raw bytes keyed by file id), `history` (flash attempts).
 * Everything stays in the user's browser profile; nothing is uploaded anywhere.
 */

const DB_NAME = 'tunehub';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('Failed to open IndexedDB.'));
    };
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted.'));
  });
}

export const FirmwareStorage = {
  async putFile(record: FirmwareFileRecord, data: ArrayBuffer): Promise<void> {
    const db = await open();
    const tx = db.transaction(['files', 'blobs'], 'readwrite');
    tx.objectStore('files').put(record);
    tx.objectStore('blobs').put(data, record.id);
    await done(tx);
  },

  async updateRecord(record: FirmwareFileRecord): Promise<void> {
    const db = await open();
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(record);
    await done(tx);
  },

  async listFiles(): Promise<FirmwareFileRecord[]> {
    const db = await open();
    const all = await wrap(db.transaction('files').objectStore('files').getAll() as IDBRequest<FirmwareFileRecord[]>);
    return all.sort((a, b) => b.addedAt - a.addedAt);
  },

  async getData(id: string): Promise<ArrayBuffer | null> {
    const db = await open();
    const data = await wrap(db.transaction('blobs').objectStore('blobs').get(id) as IDBRequest<ArrayBuffer | undefined>);
    return data ?? null;
  },

  async deleteFile(id: string): Promise<void> {
    const db = await open();
    const tx = db.transaction(['files', 'blobs'], 'readwrite');
    tx.objectStore('files').delete(id);
    tx.objectStore('blobs').delete(id);
    await done(tx);
  },

  async addHistory(entry: FlashHistoryEntry): Promise<void> {
    const db = await open();
    const tx = db.transaction('history', 'readwrite');
    tx.objectStore('history').put(entry);
    await done(tx);
  },

  async listHistory(): Promise<FlashHistoryEntry[]> {
    const db = await open();
    const all = await wrap(db.transaction('history').objectStore('history').getAll() as IDBRequest<FlashHistoryEntry[]>);
    return all.sort((a, b) => b.at - a.at);
  },

  async clearAll(): Promise<void> {
    const db = await open();
    const tx = db.transaction(['files', 'blobs', 'history'], 'readwrite');
    tx.objectStore('files').clear();
    tx.objectStore('blobs').clear();
    tx.objectStore('history').clear();
    await done(tx);
  },

  async estimateUsage(): Promise<{ usage: number; quota: number } | null> {
    if (!navigator.storage?.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage ?? 0, quota: quota ?? 0 };
  },
};
