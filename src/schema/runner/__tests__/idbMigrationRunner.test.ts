import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { openMoniqDB, closeDB } from '../../runner/idbMigrationRunner';
import { idbMigrations } from '../../migrations';
import { CURRENT_SCHEMA_VERSION } from '../../version';

// Reset IDB between tests
beforeEach(async () => {
  await closeDB();
  // fake-indexeddb/auto resets automatically per test when using indexedDB.deleteDatabase
  await new Promise<void>(res => {
    const req = indexedDB.deleteDatabase('moniq-db');
    req.onsuccess = () => res();
    req.onerror = () => res();
  });
});

describe('idbMigrationRunner', () => {
  describe('IDB-01: openMoniqDB() creates DB at CURRENT_SCHEMA_VERSION', () => {
    it('opens DB at the current schema version', async () => {
      const db = await openMoniqDB();
      expect(db.version).toBe(CURRENT_SCHEMA_VERSION);
      db.close();
    });
  });

  describe('IDB-02: All required object stores exist after migration 001', () => {
    it('creates all 9 required stores', async () => {
      const db = await openMoniqDB();
      const storeNames = Array.from(db.objectStoreNames);
      const required = [
        'accounts',
        'methods',
        'categories',
        'transactions',
        'budgets',
        'sync_queue',
        'remote_snapshot',
        'settings',
        'meta',
      ];
      for (const name of required) {
        expect(storeNames).toContain(name);
      }
      db.close();
    });
  });

  describe('IDB-03: All required indexes exist on each store', () => {
    it('creates by-updatedAt on accounts', async () => {
      const db = await openMoniqDB();
      const tx = db.transaction('accounts', 'readonly');
      const indexNames = Array.from(tx.store.indexNames);
      expect(indexNames).toContain('by-updatedAt');
      db.close();
    });

    it('creates by-linkedAccountId on methods', async () => {
      const db = await openMoniqDB();
      const tx = db.transaction('methods', 'readonly');
      const indexNames = Array.from(tx.store.indexNames);
      expect(indexNames).toContain('by-linkedAccountId');
      db.close();
    });

    it('creates by-date and by-accountId on transactions', async () => {
      const db = await openMoniqDB();
      const tx = db.transaction('transactions', 'readonly');
      const indexNames = Array.from(tx.store.indexNames);
      expect(indexNames).toContain('by-date');
      expect(indexNames).toContain('by-accountId');
      expect(indexNames).toContain('by-categoryId');
      db.close();
    });

    it('creates by-timestamp on sync_queue', async () => {
      const db = await openMoniqDB();
      const tx = db.transaction('sync_queue', 'readonly');
      const indexNames = Array.from(tx.store.indexNames);
      expect(indexNames).toContain('by-timestamp');
      db.close();
    });

    it('creates by-store on remote_snapshot', async () => {
      const db = await openMoniqDB();
      const tx = db.transaction('remote_snapshot', 'readonly');
      const indexNames = Array.from(tx.store.indexNames);
      expect(indexNames).toContain('by-store');
      db.close();
    });
  });

  describe('IDB-04: Calling openMoniqDB() twice returns same DB', () => {
    it('resolves to the same instance', async () => {
      const db1 = await openMoniqDB();
      const db2 = await openMoniqDB();
      expect(db1).toBe(db2);
      db1.close();
    });
  });

  describe('IDB-05 & IDB-06: Migrations run in order and only pending ones run', () => {
    it('migration registry is sorted ascending by version', () => {
      const versions = idbMigrations.map(m => m.version);
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBeGreaterThan(versions[i - 1]);
      }
    });

    it('all migrations have version and up() function', () => {
      for (const m of idbMigrations) {
        expect(typeof m.version).toBe('number');
        expect(typeof m.up).toBe('function');
      }
    });
  });

  describe('IDB-07: Already-at-version DB skips migrations', () => {
    it('opens without error on second open after close', async () => {
      const db1 = await openMoniqDB();
      db1.close();
      await closeDB();

      const db2 = await openMoniqDB();
      expect(db2.version).toBe(CURRENT_SCHEMA_VERSION);
      db2.close();
    });
  });

  describe('IDB-10: closeDB() allows fresh openMoniqDB()', () => {
    it('reopens cleanly after close', async () => {
      const db1 = await openMoniqDB();
      db1.close();
      await closeDB();

      const db2 = await openMoniqDB();
      expect(db2).toBeDefined();
      db2.close();
    });
  });
});
