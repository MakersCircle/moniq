import { describe, it, expect } from 'vitest';
import type { Transaction, LedgerEntry } from '../../../types';
import {
  TRANSACTION_COLUMNS,
  TRANSACTION_DEFAULTS,
  serializeTransaction,
  deserializeTransaction,
} from '../transaction.schema';

// ── Fixtures ─────────────────────────────────────────────────────

const HEADERS = [...TRANSACTION_COLUMNS] as string[];

const SAMPLE_ENTRIES: LedgerEntry[] = [
  { accountId: 'acc-1', type: 'DEBIT', amount: 100 },
  { accountId: 'cat-1', type: 'CREDIT', amount: 100 },
];

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-uuid-1',
    groupId: 'grp-uuid-1',
    uiType: 'expense',
    entries: SAMPLE_ENTRIES,
    amount: 100,
    date: '2024-01-15',
    methodId: 'method-uuid-1',
    note: 'Grocery run',
    tags: ['food', 'essentials'],
    isDeleted: false,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
    ...overrides,
  };
}

// ── Serialization Tests ────────────────────────────────────────────

describe('transaction.schema – Serialization', () => {
  it('S-01: serialize returns an array', () => {
    const row = serializeTransaction(makeTransaction());
    expect(Array.isArray(row)).toBe(true);
  });

  it('S-02: column count matches TRANSACTION_COLUMNS constant', () => {
    const row = serializeTransaction(makeTransaction());
    expect(row.length).toBe(TRANSACTION_COLUMNS.length);
  });

  it('S-03: all values are strings (no undefined/null)', () => {
    const row = serializeTransaction(makeTransaction());
    for (const val of row) {
      expect(typeof val).toBe('string');
      expect(val).not.toBeNull();
      expect(val).not.toBeUndefined();
    }
  });

  it('S-04: boolean field isDeleted serializes as "TRUE"/"FALSE"', () => {
    const rowTrue = serializeTransaction(makeTransaction({ isDeleted: true }));
    const rowFalse = serializeTransaction(makeTransaction({ isDeleted: false }));
    const isDeletedIdx = TRANSACTION_COLUMNS.indexOf('Is Deleted');

    expect(rowTrue[isDeletedIdx]).toBe('TRUE');
    expect(rowFalse[isDeletedIdx]).toBe('FALSE');
  });

  it('S-05: optional methodId field is "" when undefined', () => {
    const row = serializeTransaction(makeTransaction({ methodId: undefined }));
    const methodIdx = TRANSACTION_COLUMNS.indexOf('Method ID');
    expect(row[methodIdx]).toBe('');
  });

  it('S-06: numeric field (amount) serializes as numeric string', () => {
    const row = serializeTransaction(makeTransaction({ amount: 2500.5 }));
    const amountIdx = TRANSACTION_COLUMNS.indexOf('Amount');
    expect(row[amountIdx]).toBe('2500.5');
    expect(isNaN(Number(row[amountIdx]))).toBe(false);
  });

  it('S-07: checksum column (last) is always "" placeholder', () => {
    const row = serializeTransaction(makeTransaction());
    expect(TRANSACTION_COLUMNS[TRANSACTION_COLUMNS.length - 1]).toBe('Checksum');
    expect(row[row.length - 1]).toBe('');
  });
});

// ── Deserialization Tests ──────────────────────────────────────────

describe('transaction.schema – Deserialization', () => {
  it('D-01: round-trip – deserialize(serialize(entity)) deep-equals entity', () => {
    const original = makeTransaction();
    const row = serializeTransaction(original);
    const restored = deserializeTransaction(row, HEADERS);
    expect(restored).toEqual(original);
  });

  it('D-02: "TRUE" string becomes boolean true', () => {
    const row = serializeTransaction(makeTransaction({ isDeleted: true }));
    const result = deserializeTransaction(row, HEADERS);
    expect(result.isDeleted).toBe(true);
  });

  it('D-03: "FALSE" string becomes boolean false', () => {
    const row = serializeTransaction(makeTransaction({ isDeleted: false }));
    const result = deserializeTransaction(row, HEADERS);
    expect(result.isDeleted).toBe(false);
  });

  it('D-04: numeric string becomes number', () => {
    const row = serializeTransaction(makeTransaction({ amount: 7777 }));
    const result = deserializeTransaction(row, HEADERS);
    expect(result.amount).toBe(7777);
    expect(typeof result.amount).toBe('number');
  });

  it('D-05: empty string for optional methodId becomes undefined', () => {
    const row = serializeTransaction(makeTransaction({ methodId: undefined }));
    const result = deserializeTransaction(row, HEADERS);
    expect(result.methodId).toBeUndefined();
  });

  it('D-06: missing column (short row) uses default (0) for amount', () => {
    const shortHeaders = HEADERS.filter(h => h !== 'Amount');
    const shortRow = Array(shortHeaders.length).fill('');
    shortRow[shortHeaders.indexOf('ID')] = 'txn-short';
    shortRow[shortHeaders.indexOf('Group ID')] = 'grp-short';
    shortRow[shortHeaders.indexOf('UI Type')] = 'expense';
    shortRow[shortHeaders.indexOf('Entries JSON')] = JSON.stringify(SAMPLE_ENTRIES);
    shortRow[shortHeaders.indexOf('Date')] = '2024-01-15';
    shortRow[shortHeaders.indexOf('Is Deleted')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Created At')] = '2024-01-15T00:00:00Z';
    shortRow[shortHeaders.indexOf('Updated At')] = '2024-01-15T00:00:00Z';

    const result = deserializeTransaction(shortRow, shortHeaders);
    expect(result.amount).toBe(0);
  });

  it('D-07: column order independence – shuffled headers still parse correctly', () => {
    const original = makeTransaction();
    const row = serializeTransaction(original);

    const paired = HEADERS.map((h, i) => [h, row[i]] as [string, string]);
    const shuffled = [...paired].reverse();
    const shuffledHeaders = shuffled.map(([h]) => h);
    const shuffledRow = shuffled.map(([, v]) => v);

    const result = deserializeTransaction(shuffledRow, shuffledHeaders);
    expect(result.id).toBe(original.id);
    expect(result.amount).toBe(original.amount);
    expect(result.date).toBe(original.date);
    expect(result.isDeleted).toBe(original.isDeleted);
  });

  it('D-08: serial date in Date field is parsed to YYYY-MM-DD format (serial 45306 = 2024-01-15)', () => {
    // Google Sheets serial date 45306 corresponds to 2024-01-15
    const row = serializeTransaction(makeTransaction());
    // Manually replace the date column with the serial number string
    const dateIdx = TRANSACTION_COLUMNS.indexOf('Date');
    const serialRow = [...row];
    serialRow[dateIdx] = '45306';

    const result = deserializeTransaction(serialRow, HEADERS);
    expect(result.date).toBe('2024-01-15');
  });

  it('D-09: ISO date string passes through unchanged', () => {
    const row = serializeTransaction(makeTransaction({ date: '2025-07-04' }));
    const result = deserializeTransaction(row, HEADERS);
    expect(result.date).toBe('2025-07-04');
  });

  it('D-10: Entries JSON parses back to LedgerEntry array', () => {
    const row = serializeTransaction(makeTransaction());
    const result = deserializeTransaction(row, HEADERS);
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toEqual({ accountId: 'acc-1', type: 'DEBIT', amount: 100 });
    expect(result.entries[1]).toEqual({ accountId: 'cat-1', type: 'CREDIT', amount: 100 });
  });

  it('D-11: Tags comma string splits back to array', () => {
    const row = serializeTransaction(makeTransaction({ tags: ['food', 'essentials', 'monthly'] }));
    const result = deserializeTransaction(row, HEADERS);
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags).toEqual(['food', 'essentials', 'monthly']);
  });

  it('D-11: empty tags string results in empty array', () => {
    const row = serializeTransaction(makeTransaction({ tags: [] }));
    const result = deserializeTransaction(row, HEADERS);
    expect(result.tags).toEqual([]);
  });

  it('D-12: row with extra unknown columns is tolerated', () => {
    const original = makeTransaction();
    const row = serializeTransaction(original);
    const extendedHeaders = [...HEADERS, 'Unknown Extra Column'];
    const extendedRow = [...row, 'some-extra-value'];

    const result = deserializeTransaction(extendedRow, extendedHeaders);
    expect(result.id).toBe(original.id);
    expect(result.amount).toBe(original.amount);
    expect(result.entries).toHaveLength(2);
  });
});

// ── Defaults Tests ─────────────────────────────────────────────────

describe('transaction.schema – Defaults', () => {
  it('DF-01: TRANSACTION_DEFAULTS exists and has sensible values', () => {
    expect(TRANSACTION_DEFAULTS).toBeDefined();
    expect(TRANSACTION_DEFAULTS.isDeleted).toBe(false);
    expect(TRANSACTION_DEFAULTS.note).toBe('');
    expect(Array.isArray(TRANSACTION_DEFAULTS.tags)).toBe(true);
    expect(TRANSACTION_DEFAULTS.tags).toHaveLength(0);
    expect(Object.keys(TRANSACTION_DEFAULTS).length).toBeGreaterThan(0);
  });
});
