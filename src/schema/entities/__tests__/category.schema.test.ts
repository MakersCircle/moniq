import { describe, it, expect } from 'vitest';
import type { Category } from '../../../types';
import {
  CATEGORY_COLUMNS,
  CATEGORY_DEFAULTS,
  serializeCategory,
  deserializeCategory,
} from '../category.schema';

// ── Fixtures ─────────────────────────────────────────────────────

const HEADERS = [...CATEGORY_COLUMNS] as string[];

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-uuid-1',
    group: 'Needs',
    head: 'Food',
    subHead: 'Groceries',
    initialBalance: 0,
    isActive: true,
    isDeleted: false,
    sortOrder: 3,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

// ── Serialization Tests ────────────────────────────────────────────

describe('category.schema – Serialization', () => {
  it('S-01: serialize returns an array', () => {
    const row = serializeCategory(makeCategory());
    expect(Array.isArray(row)).toBe(true);
  });

  it('S-02: column count matches CATEGORY_COLUMNS constant', () => {
    const row = serializeCategory(makeCategory());
    expect(row.length).toBe(CATEGORY_COLUMNS.length);
  });

  it('S-03: all values are strings (no undefined/null)', () => {
    const row = serializeCategory(makeCategory());
    for (const val of row) {
      expect(typeof val).toBe('string');
      expect(val).not.toBeNull();
      expect(val).not.toBeUndefined();
    }
  });

  it('S-04: boolean fields serialize as "TRUE"/"FALSE"', () => {
    const rowTrue = serializeCategory(makeCategory({ isActive: true, isDeleted: true }));
    const rowFalse = serializeCategory(makeCategory({ isActive: false, isDeleted: false }));
    const isActiveIdx = CATEGORY_COLUMNS.indexOf('Is Active');
    const isDeletedIdx = CATEGORY_COLUMNS.indexOf('Is Deleted');

    expect(rowTrue[isActiveIdx]).toBe('TRUE');
    expect(rowTrue[isDeletedIdx]).toBe('TRUE');
    expect(rowFalse[isActiveIdx]).toBe('FALSE');
    expect(rowFalse[isDeletedIdx]).toBe('FALSE');
  });

  it('S-05: optional subHead field is "" when undefined', () => {
    const row = serializeCategory(makeCategory({ subHead: undefined }));
    const subHeadIdx = CATEGORY_COLUMNS.indexOf('Sub Head');
    expect(row[subHeadIdx]).toBe('');
  });

  it('S-06: numeric field (sortOrder) serializes as numeric string', () => {
    const row = serializeCategory(makeCategory({ sortOrder: 42 }));
    const sortIdx = CATEGORY_COLUMNS.indexOf('Sort Order');
    expect(row[sortIdx]).toBe('42');
    expect(isNaN(Number(row[sortIdx]))).toBe(false);
  });

  it('S-07: checksum column (last) is always "" placeholder', () => {
    const row = serializeCategory(makeCategory());
    expect(CATEGORY_COLUMNS[CATEGORY_COLUMNS.length - 1]).toBe('Checksum');
    expect(row[row.length - 1]).toBe('');
  });
});

// ── Deserialization Tests ──────────────────────────────────────────

describe('category.schema – Deserialization', () => {
  it('D-01: round-trip – deserialize(serialize(entity)) deep-equals entity', () => {
    // color is not in v1 schema columns, so we test without it
    const original = { ...makeCategory() };
    delete original.color;
    const row = serializeCategory(original as Category);
    const restored = deserializeCategory(row, HEADERS);
    expect(restored).toEqual(original);
  });

  it('D-02: "TRUE" string becomes boolean true', () => {
    const row = serializeCategory(makeCategory({ isActive: true }));
    const result = deserializeCategory(row, HEADERS);
    expect(result.isActive).toBe(true);
  });

  it('D-03: "FALSE" string becomes boolean false', () => {
    const row = serializeCategory(makeCategory({ isActive: false, isDeleted: false }));
    const result = deserializeCategory(row, HEADERS);
    expect(result.isActive).toBe(false);
    expect(result.isDeleted).toBe(false);
  });

  it('D-04: numeric string becomes number', () => {
    const row = serializeCategory(makeCategory({ sortOrder: 7, initialBalance: 500 }));
    const result = deserializeCategory(row, HEADERS);
    expect(result.sortOrder).toBe(7);
    expect(typeof result.sortOrder).toBe('number');
    expect(result.initialBalance).toBe(500);
    expect(typeof result.initialBalance).toBe('number');
  });

  it('D-05: empty string for optional subHead becomes undefined', () => {
    const row = serializeCategory(makeCategory({ subHead: undefined }));
    const result = deserializeCategory(row, HEADERS);
    expect(result.subHead).toBeUndefined();
  });

  it('D-06: missing column (short row) uses default (0) for sortOrder', () => {
    const shortHeaders = HEADERS.filter(h => h !== 'Sort Order');
    const shortRow = Array(shortHeaders.length).fill('');
    shortRow[shortHeaders.indexOf('ID')] = 'cat-short';
    shortRow[shortHeaders.indexOf('Group')] = 'Needs';
    shortRow[shortHeaders.indexOf('Head')] = 'Misc';
    shortRow[shortHeaders.indexOf('Is Active')] = 'TRUE';
    shortRow[shortHeaders.indexOf('Is Deleted')] = 'FALSE';
    shortRow[shortHeaders.indexOf('Created At')] = '2024-01-01T00:00:00Z';
    shortRow[shortHeaders.indexOf('Updated At')] = '2024-01-01T00:00:00Z';

    const result = deserializeCategory(shortRow, shortHeaders);
    expect(result.sortOrder).toBe(0);
  });

  it('D-07: column order independence – shuffled headers still parse correctly', () => {
    const original = makeCategory({ color: undefined });
    const row = serializeCategory(original);

    const paired = HEADERS.map((h, i) => [h, row[i]] as [string, string]);
    const shuffled = [...paired].reverse();
    const shuffledHeaders = shuffled.map(([h]) => h);
    const shuffledRow = shuffled.map(([, v]) => v);

    const result = deserializeCategory(shuffledRow, shuffledHeaders);
    expect(result.id).toBe(original.id);
    expect(result.group).toBe(original.group);
    expect(result.head).toBe(original.head);
    expect(result.sortOrder).toBe(original.sortOrder);
    expect(result.isActive).toBe(original.isActive);
  });

  it('D-12: row with extra unknown columns is tolerated', () => {
    const original = makeCategory({ color: undefined });
    const row = serializeCategory(original);
    const extendedHeaders = [...HEADERS, 'Unknown Extra Column'];
    const extendedRow = [...row, 'some-extra-value'];

    const result = deserializeCategory(extendedRow, extendedHeaders);
    expect(result.id).toBe(original.id);
    expect(result.head).toBe(original.head);
    expect(result.group).toBe(original.group);
  });
});

// ── Defaults Tests ─────────────────────────────────────────────────

describe('category.schema – Defaults', () => {
  it('DF-01: CATEGORY_DEFAULTS exists and has sensible values', () => {
    expect(CATEGORY_DEFAULTS).toBeDefined();
    expect(CATEGORY_DEFAULTS.isActive).toBe(true);
    expect(CATEGORY_DEFAULTS.isDeleted).toBe(false);
    expect(CATEGORY_DEFAULTS.sortOrder).toBe(0);
    expect(Object.keys(CATEGORY_DEFAULTS).length).toBeGreaterThan(0);
  });
});
