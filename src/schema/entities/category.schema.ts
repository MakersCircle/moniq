import type { Category } from '../../types';

// ── Column Definition ────────────────────────────────────────────

export const CATEGORY_COLUMNS = [
  'ID',
  'Group',
  'Head',
  'Sub Head',
  'Initial Balance',
  'Is Active',
  'Is Deleted',
  'Sort Order',
  'Created At',
  'Updated At',
  'Checksum',
] as const;

export type CategoryColumn = (typeof CATEGORY_COLUMNS)[number];

// ── Defaults ─────────────────────────────────────────────────────

export const CATEGORY_DEFAULTS: Partial<Category> = {
  isActive: true,
  isDeleted: false,
  sortOrder: 0,
  subHead: undefined,
  initialBalance: undefined,
  color: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────

function get(row: string[], header: string[], field: CategoryColumn): string {
  const idx = header.indexOf(field);
  if (idx === -1) return '';
  return row[idx] ?? '';
}

// ── Serialization ────────────────────────────────────────────────

export function serializeCategory(c: Category): string[] {
  return [
    c.id,
    c.group,
    c.head,
    c.subHead || '',
    String(c.initialBalance || 0),
    c.isActive ? 'TRUE' : 'FALSE',
    c.isDeleted ? 'TRUE' : 'FALSE',
    String(c.sortOrder || 0),
    c.createdAt,
    c.updatedAt,
    '', // Checksum placeholder
  ];
}

// ── Deserialization ──────────────────────────────────────────────

export function deserializeCategory(row: string[], header: string[]): Category {
  const rawBalance = get(row, header, 'Initial Balance');
  return {
    id: get(row, header, 'ID'),
    group: (get(row, header, 'Group') as Category['group']) || 'Needs',
    head: get(row, header, 'Head'),
    subHead: get(row, header, 'Sub Head') || undefined,
    initialBalance: rawBalance !== '' ? Number(rawBalance) || 0 : undefined,
    isActive: get(row, header, 'Is Active') === 'TRUE',
    isDeleted: get(row, header, 'Is Deleted') === 'TRUE',
    sortOrder: Number(get(row, header, 'Sort Order')) || 0,
    createdAt: get(row, header, 'Created At'),
    updatedAt: get(row, header, 'Updated At') || get(row, header, 'Created At'),
  };
}
