import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import {
  sortLedgerTransactionsNewestFirst,
  sortLedgerTransactionsOldestFirst,
} from '../ledgerOrdering';

function transaction(id: string, createdAt: string, sortOrder?: number): Transaction {
  return {
    id,
    groupId: `group-${id}`,
    date: '2024-03-15',
    amount: 1,
    entries: [],
    uiType: 'expense',
    note: id,
    ...(sortOrder === undefined ? {} : { sortOrder }),
    isDeleted: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('Ledger transaction ordering', () => {
  it('uses saved order for complete date groups and reverses it for chronology', () => {
    const items = [
      transaction('old', '2024-03-15T08:00:00.000Z', 0),
      transaction('middle', '2024-03-15T09:00:00.000Z', 1),
      transaction('new', '2024-03-15T10:00:00.000Z', 2),
    ];

    expect(sortLedgerTransactionsNewestFirst(items).map(item => item.id)).toEqual([
      'new',
      'middle',
      'old',
    ]);
    expect(sortLedgerTransactionsOldestFirst(items).map(item => item.id)).toEqual([
      'old',
      'middle',
      'new',
    ]);
  });

  it('uses creation time consistently when a date group contains a legacy row', () => {
    const items = [
      transaction('explicit-old', '2024-03-15T08:00:00.000Z', 2),
      transaction('legacy-middle', '2024-03-15T09:00:00.000Z'),
      transaction('explicit-new', '2024-03-15T10:00:00.000Z', 0),
    ];

    expect(sortLedgerTransactionsNewestFirst(items).map(item => item.id)).toEqual([
      'explicit-new',
      'legacy-middle',
      'explicit-old',
    ]);
    expect(sortLedgerTransactionsOldestFirst(items).map(item => item.id)).toEqual([
      'explicit-old',
      'legacy-middle',
      'explicit-new',
    ]);
  });
});
