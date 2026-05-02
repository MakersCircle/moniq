import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Account,
  PaymentMethod,
  Category,
  Transaction,
  Budget,
  SyncOperation,
} from '../types';

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
    indexes: { 'by-updatedAt': string; 'by-date': string };
  };
  budgets: { key: string; value: Budget; indexes: { 'by-updatedAt': string } };
  settings: { key: string; value: { key: string; value: string } };
  sync_queue: { key: string; value: SyncOperation; indexes: { 'by-timestamp': string } };
  remote_snapshot: {
    key: string;
    value: { id: string; store: string; data: unknown; checksum: string };
  };
  meta: { key: string; value: { key: string; value: string } };
}

const DB_NAME = 'moniq-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MoniqDB> | null = null;

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function getDB(): Promise<IDBPDatabase<MoniqDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MoniqDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Accounts
      const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
      accountStore.createIndex('by-updatedAt', 'updatedAt');

      // Methods
      const methodStore = db.createObjectStore('methods', { keyPath: 'id' });
      methodStore.createIndex('by-updatedAt', 'updatedAt');
      methodStore.createIndex('by-linkedAccountId', 'linkedAccountId');

      // Categories
      const catStore = db.createObjectStore('categories', { keyPath: 'id' });
      catStore.createIndex('by-updatedAt', 'updatedAt');

      // Transactions
      const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
      txStore.createIndex('by-updatedAt', 'updatedAt');
      txStore.createIndex('by-date', 'date');

      // Budgets
      const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
      budgetStore.createIndex('by-updatedAt', 'updatedAt');

      // Settings (key-value)
      db.createObjectStore('settings', { keyPath: 'key' });

      // Sync queue
      const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
      syncStore.createIndex('by-timestamp', 'timestamp');

      // Remote snapshot (for reconciliation)
      db.createObjectStore('remote_snapshot', { keyPath: 'id' });

      // Meta (lastSyncedAt, spreadsheetId, etc.)
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return dbInstance;
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
  await closeDB();
  const { deleteDB } = await import('idb');
  await deleteDB(DB_NAME);
}
