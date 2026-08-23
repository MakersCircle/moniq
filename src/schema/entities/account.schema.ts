import type { Account } from '../../types';

// ── Column Definition ────────────────────────────────────────────
// IMPORTANT: Never reorder existing columns. Only append new ones to the end
// (before 'Checksum'). Reordering breaks the rewrite protocol for existing sheets.

export const ACCOUNT_COLUMNS = [
  'ID',
  'Name',
  'Type',
  'Description',
  'Is Savings',
  'Initial Balance',
  'Exclude Net',
  'Is Active',
  'Is Deleted',
  'Created At',
  'Updated At',
  'Checksum',
] as const;

export type AccountColumn = (typeof ACCOUNT_COLUMNS)[number];

// ── Defaults ─────────────────────────────────────────────────────

/** Used to backfill IDB records that are missing fields added in later migrations. */
export const ACCOUNT_DEFAULTS: Partial<Account> = {
  excludeFromNet: false,
  isSavings: false,
  isActive: true,
  isDeleted: false,
  description: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────

function col(header: string[], field: AccountColumn): string {
  const idx = header.indexOf(field);
  return idx === -1 ? '' : (header[idx] ?? '');
}

function get(row: string[], header: string[], field: AccountColumn): string {
  const idx = header.indexOf(field);
  if (idx === -1) return '';
  return row[idx] ?? '';
}

// ── Serialization ────────────────────────────────────────────────

/** Converts an Account entity to a string[] row for Google Sheets. */
export function serializeAccount(a: Account): string[] {
  return [
    a.id,
    a.name,
    a.type,
    a.description || '',
    a.isSavings ? 'TRUE' : 'FALSE',
    String(a.initialBalance),
    a.excludeFromNet ? 'TRUE' : 'FALSE',
    a.isActive ? 'TRUE' : 'FALSE',
    a.isDeleted ? 'TRUE' : 'FALSE',
    a.createdAt,
    a.updatedAt,
    '', // Checksum placeholder — filled by SyncEngine
  ];
}

// ── Deserialization ──────────────────────────────────────────────

/** Parses a string[] row + header into an Account entity. */
export function deserializeAccount(row: string[], header: string[]): Account {
  return {
    id: get(row, header, 'ID'),
    name: get(row, header, 'Name'),
    type: (get(row, header, 'Type') as Account['type']) || 'Asset',
    description: get(row, header, 'Description') || undefined,
    isSavings: get(row, header, 'Is Savings') === 'TRUE',
    initialBalance: Number(get(row, header, 'Initial Balance')) || 0,
    excludeFromNet: get(row, header, 'Exclude Net') === 'TRUE',
    isActive: get(row, header, 'Is Active') === 'TRUE',
    isDeleted: get(row, header, 'Is Deleted') === 'TRUE',
    createdAt: get(row, header, 'Created At'),
    updatedAt: get(row, header, 'Updated At') || get(row, header, 'Created At'),
  };
}

// Suppress unused variable warning for col helper (used in future migrations)
void col;
