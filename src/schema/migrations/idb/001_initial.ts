import type { IDBPDatabase } from 'idb';
import type { MoniqDB } from '../../../lib/db';

/**
 * IDB Migration 001 — Initial Schema
 *
 * Creates all object stores and indexes that currently exist in db.ts.
 * This migration establishes the v1 baseline that all future migrations build on.
 */
const migration001: {
  version: number;
  up: (db: IDBPDatabase<MoniqDB>, oldVersion: number) => void;
} = {
  version: 1,

  up(db: IDBPDatabase<MoniqDB>, oldVersion: number): void {
    if (oldVersion >= 1) return;

    // Accounts
    const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
    accountStore.createIndex('by-updatedAt', 'updatedAt');

    // Payment Methods
    const methodStore = db.createObjectStore('methods', { keyPath: 'id' });
    methodStore.createIndex('by-updatedAt', 'updatedAt');
    methodStore.createIndex('by-linkedAccountId', 'linkedAccountId');

    // Categories
    const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
    categoryStore.createIndex('by-updatedAt', 'updatedAt');

    // Transactions
    const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
    txStore.createIndex('by-updatedAt', 'updatedAt');
    txStore.createIndex('by-date', 'date');
    txStore.createIndex('by-accountId', 'accountId');
    txStore.createIndex('by-categoryId', 'categoryId');

    // Budgets
    const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
    budgetStore.createIndex('by-updatedAt', 'updatedAt');

    // Sync Queue (internal — not synced to Sheets)
    const syncQueueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
    syncQueueStore.createIndex('by-timestamp', 'timestamp');

    // Remote Snapshot (internal — checksums from last pull)
    const snapshotStore = db.createObjectStore('remote_snapshot', { keyPath: 'id' });
    snapshotStore.createIndex('by-store', 'store');

    // Settings (local-only key-value store)
    db.createObjectStore('settings', { keyPath: 'key' });

    // Meta (lastSyncedAt, spreadsheetId, schema versions, migration locks, etc.)
    db.createObjectStore('meta', { keyPath: 'key' });
  },
};

export default migration001;
