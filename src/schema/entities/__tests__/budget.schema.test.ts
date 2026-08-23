import { describe, it, expect } from 'vitest';
import type { Budget } from '@/types';
import {
  BUDGET_COLUMNS,
  BUDGET_DEFAULTS,
  serializeBudget,
  deserializeBudget,
} from '@/schema/entities/budget.schema';

// ── Fixtures ─────────────────────────────────────────────────────

const HEADERS = [...BUDGET_COLUMNS] as string[];

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'budget-uuid-1',
    categoryId: 'cat-uuid-1',
    period: '2024-01',
    amount: 15000,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

// ── Serialization Tests ────────────────────────────────────────────

describe('budget.schema – Serialization', () => {
  it('S-01: serialize returns an array', () => {
    const row = serializeBudget(makeBudget());
    expect(Array.isArray(row)).toBe(true);
  });

  it('S-02: column count matches BUDGET_COLUMNS constant', () => {
    const row = serializeBudget(makeBudget());
    expect(row.length).toBe(BUDGET_COLUMNS.length);
  });

  it('S-03: all values are strings (no undefined/null)', () => {
    const row = serializeBudget(makeBudget());
    for (const val of row) {
      expect(typeof val).toBe('string');
      expect(val).not.toBeNull();
      expect(val).not.toBeUndefined();
    }
  });

  it('S-04: boolean field isDeleted serializes as "TRUE"/"FALSE"', () => {
    const rowTrue = serializeBudget(makeBudget({ isDeleted: true }));
    const rowFalse = serializeBudget(makeBudget({ isDeleted: false }));
    const isDeletedIdx = BUDGET_COLUMNS.indexOf('Is Deleted');

    expect(rowTrue[isDeletedIdx]).toBe('TRUE');
    expect(rowFalse[isDeletedIdx]).toBe('FALSE');
  });

  it('S-05: period field is always present and non-empty', () => {
    // Budget has no optional string fields that map to '' —
    // period is required; we verify it is preserved correctly
    const row = serializeBudget(makeBudget({ period: '2024-06' }));
    const periodIdx = BUDGET_COLUMNS.indexOf('Period');
    expect(row[periodIdx]).toBe('2024-06');
    expect(row[periodIdx]).not.toBe('');
  });

  it('S-06: numeric field (amount) serializes as numeric string', () => {
    const row = serializeBudget(makeBudget({ amount: 8888.5 }));
    const amountIdx = BUDGET_COLUMNS.indexOf('Amount');
    expect(row[amountIdx]).toBe('8888.5');
    expect(isNaN(Number(row[amountIdx]))).toBe(false);
  });

  it('S-07: checksum column (last) is always "" placeholder', () => {
    const row = serializeBudget(makeBudget());
    expect(BUDGET_COLUMNS[BUDGET_COLUMNS.length - 1]).toBe('Checksum');
    expect(row[row.length - 1]).toBe('');
  });
});

// ── Deserialization Tests ──────────────────────────────────────────

describe('budget.schema – Deserialization', () => {
  it('D-01: round-trip – deserialize(serialize(entity)) deep-equals entity', () => {
    const original = makeBudget();
    const row = serializeBudget(original);
    const restored = deserializeBudget(row, HEADERS);
    expect(restored).toEqual(original);
  });

  it('D-02: "TRUE" string becomes boolean true', () => {
    const row = serializeBudget(makeBudget({ isDeleted: true }));
    const result = deserializeBudget(row, HEADERS);
    expect(result.isDeleted).toBe(true);
  });

  it('D-03: "FALSE" string becomes boolean false', () => {
    const row = serializeBudget(makeBudget({ isDeleted: false }));
    const result = deserializeBudget(row, HEADERS);
    expect(result.isDeleted).toBe(false);
  });

  it('D-04: numeric string becomes number', () => {
    const row = serializeBudget(makeBudget({ amount: 3000 }));
    const result = deserializeBudget(row, HEADERS);
    expect(result.amount).toBe(3000);
    expect(typeof result.amount).toBe('number');
  });

  it('D-05: amount of 0 round-trips correctly (edge case for || 0 fallback)', () => {
    // Budget has no optional string fields; test 0-amount as the edge case
    // Note: deserializeBudget uses `|| 0`, so explicit 0 is already the default
    const row = serializeBudget(makeBudget({ amount: 0 }));
    const result = deserializeBudget(row, HEADERS);
    expect(result.amount).toBe(0);
  });

  it('D-06: missing column (short row) uses default (0) for amount', () => {
    const shortHeaders = HEADERS.filter(h => h !== 'Amount');
    const shortRow = Array(shortHeaders.length).fill('');
    shortRow[shortHeaders.indexOf('ID')] = 'budget-short';
    shortRow[shortHeaders.indexOf('Category ID')] = 'cat-short';
    shortRow[shortHeaders.indexOf('Period')] = '2024-01';
    shortRow[shortHeaders.indexOf('Is Deleted')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Created At')] = '2024-01-01T00:00:00Z';
    shortRow[shortHeaders.indexOf('Updated At')] = '2024-01-01T00:00:00Z';

    const result = deserializeBudget(shortRow, shortHeaders);
    expect(result.amount).toBe(0);
  });

  it('D-07: column order independence – shuffled headers still parse correctly', () => {
    const original = makeBudget();
    const row = serializeBudget(original);

    const paired = HEADERS.map((h, i) => [h, row[i]] as [string, string]);
    const shuffled = [...paired].reverse();
    const shuffledHeaders = shuffled.map(([h]) => h);
    const shuffledRow = shuffled.map(([, v]) => v);

    const result = deserializeBudget(shuffledRow, shuffledHeaders);
    expect(result.id).toBe(original.id);
    expect(result.categoryId).toBe(original.categoryId);
    expect(result.period).toBe(original.period);
    expect(result.amount).toBe(original.amount);
    expect(result.isDeleted).toBe(original.isDeleted);
  });

  it('D-12: row with extra unknown columns is tolerated', () => {
    const original = makeBudget();
    const row = serializeBudget(original);
    const extendedHeaders = [...HEADERS, 'Unknown Extra Column'];
    const extendedRow = [...row, 'some-extra-value'];

    const result = deserializeBudget(extendedRow, extendedHeaders);
    expect(result.id).toBe(original.id);
    expect(result.categoryId).toBe(original.categoryId);
    expect(result.amount).toBe(original.amount);
  });
});

// ── Defaults Tests ─────────────────────────────────────────────────

describe('budget.schema – Defaults', () => {
  it('DF-01: BUDGET_DEFAULTS exists and has sensible values', () => {
    expect(BUDGET_DEFAULTS).toBeDefined();
    expect(BUDGET_DEFAULTS.isDeleted).toBe(false);
    expect(BUDGET_DEFAULTS.amount).toBe(0);
    expect(Object.keys(BUDGET_DEFAULTS).length).toBeGreaterThan(0);
  });
});
