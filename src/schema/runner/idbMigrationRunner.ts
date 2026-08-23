import { openDB, type IDBPDatabase } from 'idb';
import type { MoniqDB } from '@/lib/db';
import { idbMigrations } from '@/schema/migrations';
import { CURRENT_SCHEMA_VERSION } from '@/schema/version';

const DB_NAME = 'moniq-db';

let dbPromise: Promise<IDBPDatabase<MoniqDB>> | null = null;
let isDeleting = false;

export function setDbDeleting(val: boolean) {
  isDeleting = val;
}

export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    if (db) db.close();
    dbPromise = null;
  }
}

/**
 * Opens the Moniq IndexedDB, running any pending IDB migrations before returning.
 *
 * This replaces the inline `openDB` call in `src/lib/db.ts`. The upgrade
 * callback iterates the `idbMigrations` registry and calls `up()` for each
 * migration whose version is greater than the current IDB version.
 *
 * Data transforms (backfill) are also supported inside each migration's `up()`
 * function by using the provided `transaction` object to read/write existing data.
 */
export function openMoniqDB(): Promise<IDBPDatabase<MoniqDB>> {
  if (isDeleting) throw new Error('Database is currently being deleted.');
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBPDatabase<MoniqDB>>((resolve, reject) => {
    openDB<MoniqDB>(DB_NAME, CURRENT_SCHEMA_VERSION, {
      upgrade(db, oldVersion) {
        for (const migration of idbMigrations) {
          if (migration.version > oldVersion) {
            migration.up(db, oldVersion);
          }
        }
      },
      blocked(_currentVersion, _blockedVersion, _event) {
        reject(new Error('Database open blocked by another tab. Please close other Moniq tabs.'));
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then(db => db.close()).catch(() => {});
          dbPromise = null;
        }
      },
    })
      .then(resolve)
      .catch(err => {
        dbPromise = null;
        reject(err);
      });
  });

  return dbPromise;
}
