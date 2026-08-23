import type { Budget } from '../../types';

// ── Column Definition ────────────────────────────────────────────

export const BUDGET_COLUMNS = [
  'ID',
  'Category ID',
  'Period',
  'Amount',
  'Is Deleted',
  'Created At',
  'Updated At',
  'Checksum',
] as const;

export type BudgetColumn = (typeof BUDGET_COLUMNS)[number];

// ── Defaults ─────────────────────────────────────────────────────

export const BUDGET_DEFAULTS: Partial<Budget> = {
  isDeleted: false,
  amount: 0,
};

// ── Helpers ───────────────────────────────────────────────────────

function get(row: string[], header: string[], field: BudgetColumn): string {
  const idx = header.indexOf(field);
  if (idx === -1) return '';
  return row[idx] ?? '';
}

// ── Serialization ────────────────────────────────────────────────

export function serializeBudget(b: Budget): string[] {
  return [
    b.id,
    b.categoryId,
    b.period,
    String(b.amount),
    b.isDeleted ? 'TRUE' : 'FALSE',
    b.createdAt,
    b.updatedAt,
    '', // Checksum placeholder
  ];
}

// ── Deserialization ──────────────────────────────────────────────

export function deserializeBudget(row: string[], header: string[]): Budget {
  return {
    id: get(row, header, 'ID'),
    categoryId: get(row, header, 'Category ID'),
    period: get(row, header, 'Period'),
    amount: Number(get(row, header, 'Amount')) || 0,
    isDeleted: get(row, header, 'Is Deleted') === 'TRUE',
    createdAt: get(row, header, 'Created At'),
    updatedAt: get(row, header, 'Updated At') || get(row, header, 'Created At'),
  };
}
