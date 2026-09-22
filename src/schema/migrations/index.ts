import type { IDBPDatabase } from 'idb';
import type { MoniqDB } from '@/lib/db';
import type { SheetClient } from '@/sync/SheetClient';

import migration001Idb from './idb/001_initial';
import migration002Idb from './idb/002_transaction_sort_order';
import migration001Sheets from './sheets/001_initial';
import migration002Sheets from './sheets/002_transaction_sort_order';

// ── IDB Migration Registry ────────────────────────────────────────
// Add new IDB migrations here in ascending version order.
// NEVER reorder or remove existing entries.

export interface IdbMigration {
  version: number;
  up: (db: IDBPDatabase<MoniqDB>, oldVersion: number) => void | Promise<void>;
}

export const idbMigrations: IdbMigration[] = [migration001Idb, migration002Idb];

// ── Sheets Migration Registry ─────────────────────────────────────
// Add new Sheets migrations here in ascending version order.
// NEVER reorder or remove existing entries.

export interface SheetsMigration {
  version: number;
  up: (client: SheetClient) => Promise<void>;
}

export const sheetsMigrations: SheetsMigration[] = [migration001Sheets, migration002Sheets];
