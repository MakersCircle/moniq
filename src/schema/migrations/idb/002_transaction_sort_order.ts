import type { IDBPDatabase } from 'idb';
import type { MoniqDB } from '@/lib/db';

/**
 * IDB Migration 002 — Back-fill sortOrder on existing transactions.
 *
 * Reads all transaction records, groups them by date, sorts each group by
 * createdAt ascending, and assigns sortOrder = index (0-based). Records that
 * already have sortOrder defined are skipped so this is idempotent.
 */
const migration002: {
  version: number;
  up: (db: IDBPDatabase<MoniqDB>, oldVersion: number) => Promise<void>;
} = {
  version: 2,

  async up(db: IDBPDatabase<MoniqDB>, oldVersion: number): Promise<void> {
    if (oldVersion >= 2) return;

    const tx = db.transaction('transactions', 'readwrite');
    const all = await tx.store.getAll();

    // Group by date
    const byDate = new Map<string, (typeof all)[number][]>();
    for (const txn of all) {
      const group = byDate.get(txn.date) ?? [];
      group.push(txn);
      byDate.set(txn.date, group);
    }

    // For each date group: sort by createdAt, assign sortOrder
    const puts: Promise<void>[] = [];
    for (const [, group] of byDate) {
      // Skip if every record already has sortOrder set
      if (group.every(t => (t as { sortOrder?: number }).sortOrder !== undefined)) continue;

      group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      group.forEach((txn, idx) => {
        puts.push(tx.store.put({ ...txn, sortOrder: idx } as never).then(() => {}));
      });
    }

    await Promise.all(puts);
    await tx.done;
  },
};

export default migration002;
