import { describe, it, expect } from 'vitest';
import type { Account } from '@/types';
import {
  ACCOUNT_COLUMNS,
  ACCOUNT_DEFAULTS,
  serializeAccount,
  deserializeAccount,
} from '@/schema/entities/account.schema';

// ── Fixtures ─────────────────────────────────────────────────────

const HEADERS = [...ACCOUNT_COLUMNS] as string[];

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-uuid-1',
    name: 'Test Savings',
    type: 'Asset',
    description: 'My bank account',
    isSavings: true,
    initialBalance: 5000,
    excludeFromNet: false,
    isActive: true,
    isDeleted: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

// ── Serialization Tests ────────────────────────────────────────────

describe('account.schema – Serialization', () => {
  it('S-01: serialize returns an array', () => {
    const row = serializeAccount(makeAccount());
    expect(Array.isArray(row)).toBe(true);
  });

  it('S-02: column count matches ACCOUNT_COLUMNS constant', () => {
    const row = serializeAccount(makeAccount());
    expect(row.length).toBe(ACCOUNT_COLUMNS.length);
  });

  it('S-03: all values are strings (no undefined/null)', () => {
    const row = serializeAccount(makeAccount());
    for (const val of row) {
      expect(typeof val).toBe('string');
      expect(val).not.toBeNull();
      expect(val).not.toBeUndefined();
    }
  });

  it('S-04: boolean fields serialize as "TRUE"/"FALSE"', () => {
    const rowTrue = serializeAccount(
      makeAccount({ isSavings: true, excludeFromNet: true, isActive: true, isDeleted: true })
    );
    const rowFalse = serializeAccount(
      makeAccount({ isSavings: false, excludeFromNet: false, isActive: false, isDeleted: false })
    );
    const isSavingsIdx = ACCOUNT_COLUMNS.indexOf('Is Savings');
    const excludeNetIdx = ACCOUNT_COLUMNS.indexOf('Exclude Net');
    const isActiveIdx = ACCOUNT_COLUMNS.indexOf('Is Active');
    const isDeletedIdx = ACCOUNT_COLUMNS.indexOf('Is Deleted');

    expect(rowTrue[isSavingsIdx]).toBe('TRUE');
    expect(rowTrue[excludeNetIdx]).toBe('TRUE');
    expect(rowTrue[isActiveIdx]).toBe('TRUE');
    expect(rowTrue[isDeletedIdx]).toBe('TRUE');

    expect(rowFalse[isSavingsIdx]).toBe('FALSE');
    expect(rowFalse[excludeNetIdx]).toBe('FALSE');
    expect(rowFalse[isActiveIdx]).toBe('FALSE');
    expect(rowFalse[isDeletedIdx]).toBe('FALSE');
  });

  it('S-05: optional description field is "" when undefined', () => {
    const row = serializeAccount(makeAccount({ description: undefined }));
    const descIdx = ACCOUNT_COLUMNS.indexOf('Description');
    expect(row[descIdx]).toBe('');
  });

  it('S-06: numeric field (initialBalance) serializes as numeric string', () => {
    const row = serializeAccount(makeAccount({ initialBalance: 12345.67 }));
    const balIdx = ACCOUNT_COLUMNS.indexOf('Initial Balance');
    expect(row[balIdx]).toBe('12345.67');
    expect(isNaN(Number(row[balIdx]))).toBe(false);
  });

  it('S-07: checksum column (last) is always "" placeholder', () => {
    const row = serializeAccount(makeAccount());
    expect(ACCOUNT_COLUMNS[ACCOUNT_COLUMNS.length - 1]).toBe('Checksum');
    expect(row[row.length - 1]).toBe('');
  });
});

// ── Deserialization Tests ──────────────────────────────────────────

describe('account.schema – Deserialization', () => {
  it('D-01: round-trip – deserialize(serialize(entity)) deep-equals entity', () => {
    const original = makeAccount();
    const row = serializeAccount(original);
    const restored = deserializeAccount(row, HEADERS);
    expect(restored).toEqual(original);
  });

  it('D-02: "TRUE" string becomes boolean true', () => {
    const row = serializeAccount(makeAccount({ isActive: true, isSavings: true }));
    const result = deserializeAccount(row, HEADERS);
    expect(result.isActive).toBe(true);
    expect(result.isSavings).toBe(true);
  });

  it('D-03: "FALSE" string becomes boolean false', () => {
    const row = serializeAccount(makeAccount({ isActive: false, isDeleted: false }));
    const result = deserializeAccount(row, HEADERS);
    expect(result.isActive).toBe(false);
    expect(result.isDeleted).toBe(false);
  });

  it('D-04: numeric string becomes number', () => {
    const row = serializeAccount(makeAccount({ initialBalance: 9999 }));
    const result = deserializeAccount(row, HEADERS);
    expect(result.initialBalance).toBe(9999);
    expect(typeof result.initialBalance).toBe('number');
  });

  it('D-05: empty string for optional description becomes undefined', () => {
    const row = serializeAccount(makeAccount({ description: undefined }));
    const result = deserializeAccount(row, HEADERS);
    expect(result.description).toBeUndefined();
  });

  it('D-06: missing column (short row) uses default value (0) for initialBalance', () => {
    const shortHeaders = HEADERS.filter(h => h !== 'Initial Balance');
    const shortRow = Array(shortHeaders.length).fill('');
    shortRow[shortHeaders.indexOf('ID')] = 'acc-short';
    shortRow[shortHeaders.indexOf('Name')] = 'Short Account';
    shortRow[shortHeaders.indexOf('Type')] = 'Asset';
    shortRow[shortHeaders.indexOf('Is Active')] = 'TRUE';
    shortRow[shortHeaders.indexOf('Is Deleted')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Is Savings')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Exclude Net')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Created At')] = '2024-01-01T00:00:00Z';
    shortRow[shortHeaders.indexOf('Updated At')] = '2024-01-01T00:00:00Z';

    const result = deserializeAccount(shortRow, shortHeaders);
    expect(result.initialBalance).toBe(0);
  });

  it('D-07: column order independence – shuffled headers still parse correctly', () => {
    const original = makeAccount();
    const row = serializeAccount(original);

    // Reverse order as a deterministic shuffle
    const paired = HEADERS.map((h, i) => [h, row[i]] as [string, string]);
    const shuffled = [...paired].reverse();
    const shuffledHeaders = shuffled.map(([h]) => h);
    const shuffledRow = shuffled.map(([, v]) => v);

    const result = deserializeAccount(shuffledRow, shuffledHeaders);
    expect(result.id).toBe(original.id);
    expect(result.name).toBe(original.name);
    expect(result.initialBalance).toBe(original.initialBalance);
    expect(result.isActive).toBe(original.isActive);
    expect(result.isSavings).toBe(original.isSavings);
  });

  it('D-12: row with extra unknown columns is tolerated', () => {
    const original = makeAccount();
    const row = serializeAccount(original);
    const extendedHeaders = [...HEADERS, 'Unknown Extra Column'];
    const extendedRow = [...row, 'some-extra-value'];

    const result = deserializeAccount(extendedRow, extendedHeaders);
    expect(result.id).toBe(original.id);
    expect(result.name).toBe(original.name);
    expect(result.initialBalance).toBe(original.initialBalance);
  });
});

// ── Defaults Tests ─────────────────────────────────────────────────

describe('account.schema – Defaults', () => {
  it('DF-01: ACCOUNT_DEFAULTS exists and has sensible values', () => {
    expect(ACCOUNT_DEFAULTS).toBeDefined();
    expect(ACCOUNT_DEFAULTS.isActive).toBe(true);
    expect(ACCOUNT_DEFAULTS.isDeleted).toBe(false);
    expect(ACCOUNT_DEFAULTS.isSavings).toBe(false);
    expect(ACCOUNT_DEFAULTS.excludeFromNet).toBe(false);
    expect(Object.keys(ACCOUNT_DEFAULTS).length).toBeGreaterThan(0);
  });
});
