import { type DBSchema, type IDBPDatabase, type StoreNames } from 'idb';
import type {
  Account,
  PaymentMethod,
  Category,
  Transaction,
  Budget,
  SyncOperation,
} from '../types';
import {
  openMoniqDB as _openMoniqDB,
  closeDB as _closeDB,
  setDbDeleting,
} from '../schema/runner/idbMigrationRunner';

// ── IDB Schema ─────────────────────────────────────────────────

interface MoniqDB extends DBSchema {
  accounts: { key: string; value: Account; indexes: { 'by-updatedAt': string } };
  methods: {
    key: string;
    value: PaymentMethod;
    indexes: { 'by-updatedAt': string; 'by-linkedAccountId': string };
  };
  categories: { key: string; value: Category; indexes: { 'by-updatedAt': string } };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-updatedAt': string;
      'by-date': string;
      'by-accountId': string;
      'by-categoryId': string;
    };
  };
  budgets: { key: string; value: Budget; indexes: { 'by-updatedAt': string } };
  settings: { key: string; value: { key: string; value: string } };
  sync_queue: { key: string; value: SyncOperation; indexes: { 'by-timestamp': string } };
  remote_snapshot: {
    key: string;
    value: { id: string; store: string; data: unknown; checksum: string };
    indexes: { 'by-store': string };
  };
  meta: { key: string; value: { key: string; value: string } };
}

export type { MoniqDB };

const DB_NAME = 'moniq-db';

let dbPromise: Promise<IDBPDatabase<MoniqDB>> | null = null;
let isDeleting = false;

export async function closeDB(): Promise<void> {
  await _closeDB();
  dbPromise = null;
}

export async function getDB(): Promise<IDBPDatabase<MoniqDB>> {
  if (isDeleting) throw new Error('Database is currently being deleted.');
  if (dbPromise) return dbPromise;
  dbPromise = _openMoniqDB() as Promise<IDBPDatabase<MoniqDB>>;
  return dbPromise;
}

// ── Generic CRUD helpers ────────────────────────────────────────

type EntityStore = 'accounts' | 'methods' | 'categories' | 'transactions' | 'budgets';

export async function getAll<T>(storeName: EntityStore): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName) as Promise<T[]>;
}

export async function getById<T>(storeName: EntityStore, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName, id) as Promise<T | undefined>;
}

export async function put<T extends { id: string }>(
  storeName: EntityStore,
  item: T
): Promise<void> {
  const db = await getDB();
  await db.put(storeName, item as never);
}

export async function putMany<T extends { id: string }>(
  storeName: EntityStore,
  items: T[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  for (const item of items) {
    await tx.store.put(item as never);
  }
  await tx.done;
}

export async function del(storeName: EntityStore, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

export async function clearStore(
  storeName: EntityStore | 'sync_queue' | 'remote_snapshot' | 'settings' | 'meta'
): Promise<void> {
  const db = await getDB();
  await db.clear(storeName);
}

// ── Sync Queue helpers ──────────────────────────────────────────

export async function addToSyncQueue(op: SyncOperation): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', op);
}

export async function getAllSyncQueue(): Promise<SyncOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync_queue', 'by-timestamp');
}

export async function removeSyncOp(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('sync_queue');
}

// ── Remote Snapshot helpers ─────────────────────────────────────

export async function saveRemoteSnapshot(
  id: string,
  store: string,
  data: unknown,
  checksum: string
): Promise<void> {
  const db = await getDB();
  await db.put('remote_snapshot', { id, store, data, checksum });
}

export async function getRemoteSnapshot(
  id: string
): Promise<{ id: string; store: string; data: unknown; checksum: string } | undefined> {
  const db = await getDB();
  return db.get('remote_snapshot', id);
}

export async function clearRemoteSnapshot(): Promise<void> {
  const db = await getDB();
  await db.clear('remote_snapshot');
}

// ── Meta helpers ────────────────────────────────────────────────

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await getDB();
  const result = await db.get('meta', key);
  return result?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

export async function delMeta(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('meta', key);
}

// ── Settings helpers ────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value;
}

export async function putSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function delSetting(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', key);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDB();
  const all = await db.getAll('settings');
  const result: Record<string, string> = {};
  for (const { key, value } of all) {
    result[key] = value;
  }
  return result;
}

export async function deleteMoniqDB(): Promise<void> {
  isDeleting = true;
  setDbDeleting(true);
  await closeDB();

  // Give the browser a moment to fully release file handles
  await new Promise(resolve => setTimeout(resolve, 200));

  const { deleteDB } = await import('idb');
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      isDeleting = false;
      setDbDeleting(false);
      reject(
        new Error(
          'Database deletion timed out. It may be locked by another tab. Please close other Moniq tabs and try again.'
        )
      );
    }, 5000);

    deleteDB(DB_NAME, {
      blocked() {
        clearTimeout(timeoutId);
        isDeleting = false;
        setDbDeleting(false);
        reject(new Error('Database is locked. Please close all other Moniq tabs and try again.'));
      },
    })
      .then(() => {
        clearTimeout(timeoutId);
        isDeleting = false;
        setDbDeleting(false);
        resolve();
      })
      .catch(err => {
        clearTimeout(timeoutId);
        isDeleting = false;
        setDbDeleting(false);
        reject(err);
      });
  });
}

export async function clearLocalData(): Promise<void> {
  const db = await getDB();
  const stores: StoreNames<MoniqDB>[] = [
    'transactions',
    'accounts',
    'methods',
    'categories',
    'budgets',
    'sync_queue',
    'remote_snapshot',
    'settings',
    'meta',
  ];
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(store => tx.objectStore(store).clear()));
  await tx.done;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    closeDB().catch(console.error);
  });
}
