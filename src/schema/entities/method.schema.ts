import type { PaymentMethod } from '../../types';

// ── Column Definition ────────────────────────────────────────────

export const METHOD_COLUMNS = [
  'ID',
  'Name',
  'Linked Account ID',
  'Is Active',
  'Is Deleted',
  'Sort Order',
  'Created At',
  'Updated At',
  'Checksum',
] as const;

export type MethodColumn = (typeof METHOD_COLUMNS)[number];

// ── Defaults ─────────────────────────────────────────────────────

export const METHOD_DEFAULTS: Partial<PaymentMethod> = {
  isActive: true,
  isDeleted: false,
  sortOrder: 0,
  linkedAccountId: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────

function get(row: string[], header: string[], field: MethodColumn): string {
  const idx = header.indexOf(field);
  if (idx === -1) return '';
  return row[idx] ?? '';
}

// ── Serialization ────────────────────────────────────────────────

export function serializeMethod(m: PaymentMethod): string[] {
  return [
    m.id,
    m.name,
    m.linkedAccountId || '',
    m.isActive ? 'TRUE' : 'FALSE',
    m.isDeleted ? 'TRUE' : 'FALSE',
    String(m.sortOrder || 0),
    m.createdAt,
    m.updatedAt,
    '', // Checksum placeholder
  ];
}

// ── Deserialization ──────────────────────────────────────────────

export function deserializeMethod(row: string[], header: string[]): PaymentMethod {
  return {
    id: get(row, header, 'ID'),
    name: get(row, header, 'Name'),
    linkedAccountId: get(row, header, 'Linked Account ID') || undefined,
    isActive: get(row, header, 'Is Active') === 'TRUE',
    isDeleted: get(row, header, 'Is Deleted') === 'TRUE',
    sortOrder: Number(get(row, header, 'Sort Order')) || 0,
    createdAt: get(row, header, 'Created At'),
    updatedAt: get(row, header, 'Updated At') || get(row, header, 'Created At'),
  };
}
