import { describe, it, expect } from 'vitest';
import type { PaymentMethod } from '../../../types';
import {
  METHOD_COLUMNS,
  METHOD_DEFAULTS,
  serializeMethod,
  deserializeMethod,
} from '../method.schema';

// ── Fixtures ─────────────────────────────────────────────────────

const HEADERS = [...METHOD_COLUMNS] as string[];

function makeMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 'method-uuid-1',
    name: 'HDFC Debit Card',
    linkedAccountId: 'acc-uuid-1',
    isActive: true,
    isDeleted: false,
    sortOrder: 1,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

// ── Serialization Tests ────────────────────────────────────────────

describe('method.schema – Serialization', () => {
  it('S-01: serialize returns an array', () => {
    const row = serializeMethod(makeMethod());
    expect(Array.isArray(row)).toBe(true);
  });

  it('S-02: column count matches METHOD_COLUMNS constant', () => {
    const row = serializeMethod(makeMethod());
    expect(row.length).toBe(METHOD_COLUMNS.length);
  });

  it('S-03: all values are strings (no undefined/null)', () => {
    const row = serializeMethod(makeMethod());
    for (const val of row) {
      expect(typeof val).toBe('string');
      expect(val).not.toBeNull();
      expect(val).not.toBeUndefined();
    }
  });

  it('S-04: boolean fields serialize as "TRUE"/"FALSE"', () => {
    const rowTrue = serializeMethod(makeMethod({ isActive: true, isDeleted: true }));
    const rowFalse = serializeMethod(makeMethod({ isActive: false, isDeleted: false }));
    const isActiveIdx = METHOD_COLUMNS.indexOf('Is Active');
    const isDeletedIdx = METHOD_COLUMNS.indexOf('Is Deleted');

    expect(rowTrue[isActiveIdx]).toBe('TRUE');
    expect(rowTrue[isDeletedIdx]).toBe('TRUE');
    expect(rowFalse[isActiveIdx]).toBe('FALSE');
    expect(rowFalse[isDeletedIdx]).toBe('FALSE');
  });

  it('S-05: optional linkedAccountId field is "" when undefined', () => {
    const row = serializeMethod(makeMethod({ linkedAccountId: undefined }));
    const linkedIdx = METHOD_COLUMNS.indexOf('Linked Account ID');
    expect(row[linkedIdx]).toBe('');
  });

  it('S-06: numeric field (sortOrder) serializes as numeric string', () => {
    const row = serializeMethod(makeMethod({ sortOrder: 99 }));
    const sortIdx = METHOD_COLUMNS.indexOf('Sort Order');
    expect(row[sortIdx]).toBe('99');
    expect(isNaN(Number(row[sortIdx]))).toBe(false);
  });

  it('S-07: checksum column (last) is always "" placeholder', () => {
    const row = serializeMethod(makeMethod());
    expect(METHOD_COLUMNS[METHOD_COLUMNS.length - 1]).toBe('Checksum');
    expect(row[row.length - 1]).toBe('');
  });
});

// ── Deserialization Tests ──────────────────────────────────────────

describe('method.schema – Deserialization', () => {
  it('D-01: round-trip – deserialize(serialize(entity)) deep-equals entity', () => {
    const original = makeMethod();
    const row = serializeMethod(original);
    const restored = deserializeMethod(row, HEADERS);
    expect(restored).toEqual(original);
  });

  it('D-02: "TRUE" string becomes boolean true', () => {
    const row = serializeMethod(makeMethod({ isActive: true }));
    const result = deserializeMethod(row, HEADERS);
    expect(result.isActive).toBe(true);
  });

  it('D-03: "FALSE" string becomes boolean false', () => {
    const row = serializeMethod(makeMethod({ isActive: false, isDeleted: false }));
    const result = deserializeMethod(row, HEADERS);
    expect(result.isActive).toBe(false);
    expect(result.isDeleted).toBe(false);
  });

  it('D-04: numeric string becomes number', () => {
    const row = serializeMethod(makeMethod({ sortOrder: 55 }));
    const result = deserializeMethod(row, HEADERS);
    expect(result.sortOrder).toBe(55);
    expect(typeof result.sortOrder).toBe('number');
  });

  it('D-05: empty string for optional linkedAccountId becomes undefined', () => {
    const row = serializeMethod(makeMethod({ linkedAccountId: undefined }));
    const result = deserializeMethod(row, HEADERS);
    expect(result.linkedAccountId).toBeUndefined();
  });

  it('D-06: missing column (short row) uses default (0) for sortOrder', () => {
    const shortHeaders = HEADERS.filter(h => h !== 'Sort Order');
    const shortRow = Array(shortHeaders.length).fill('');
    shortRow[shortHeaders.indexOf('ID')] = 'method-short';
    shortRow[shortHeaders.indexOf('Name')] = 'Cash';
    shortRow[shortHeaders.indexOf('Is Active')] = 'TRUE';
    shortRow[shortHeaders.indexOf('Is Deleted')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Created At')] = '2024-01-01T00:00:00Z';
    shortRow[shortHeaders.indexOf('Updated At')] = '2024-01-01T00:00:00Z';

    const result = deserializeMethod(shortRow, shortHeaders);
    expect(result.sortOrder).toBe(0);
  });

  it('D-07: column order independence – shuffled headers still parse correctly', () => {
    const original = makeMethod();
    const row = serializeMethod(original);

    const paired = HEADERS.map((h, i) => [h, row[i]] as [string, string]);
    const shuffled = [...paired].reverse();
    const shuffledHeaders = shuffled.map(([h]) => h);
    const shuffledRow = shuffled.map(([, v]) => v);

    const result = deserializeMethod(shuffledRow, shuffledHeaders);
    expect(result.id).toBe(original.id);
    expect(result.name).toBe(original.name);
    expect(result.sortOrder).toBe(original.sortOrder);
    expect(result.isActive).toBe(original.isActive);
    expect(result.linkedAccountId).toBe(original.linkedAccountId);
  });

  it('D-12: row with extra unknown columns is tolerated', () => {
    const original = makeMethod();
    const row = serializeMethod(original);
    const extendedHeaders = [...HEADERS, 'Unknown Extra Column'];
    const extendedRow = [...row, 'some-extra-value'];

    const result = deserializeMethod(extendedRow, extendedHeaders);
    expect(result.id).toBe(original.id);
    expect(result.name).toBe(original.name);
    expect(result.sortOrder).toBe(original.sortOrder);
  });
});

// ── Defaults Tests ─────────────────────────────────────────────────

describe('method.schema – Defaults', () => {
  it('DF-01: METHOD_DEFAULTS exists and has sensible values', () => {
    expect(METHOD_DEFAULTS).toBeDefined();
    expect(METHOD_DEFAULTS.isActive).toBe(true);
    expect(METHOD_DEFAULTS.isDeleted).toBe(false);
    expect(METHOD_DEFAULTS.sortOrder).toBe(0);
    expect(Object.keys(METHOD_DEFAULTS).length).toBeGreaterThan(0);
  });
});
