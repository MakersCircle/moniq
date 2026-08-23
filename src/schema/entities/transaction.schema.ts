import type { Transaction } from '@/types';

// ── Column Definition ────────────────────────────────────────────

export const TRANSACTION_COLUMNS = [
  'ID',
  'Group ID',
  'UI Type',
  'Entries JSON',
  'Amount',
  'Date',
  'Method ID',
  'Note',
  'Tags',
  'Is Deleted',
  'Created At',
  'Updated At',
  'Checksum',
] as const;

export type TransactionColumn = (typeof TRANSACTION_COLUMNS)[number];

// ── Defaults ─────────────────────────────────────────────────────

export const TRANSACTION_DEFAULTS: Partial<Transaction> = {
  isDeleted: false,
  note: '',
  tags: [],
  methodId: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Converts a Google Sheets serial date (number of days since 1899-12-30)
 * back into an ISO YYYY-MM-DD date string.
 *
 * Uses UTC math to avoid timezone-driven off-by-one errors.
 */
function unserialDate(val: string | unknown): string {
  if (!val || typeof val !== 'string' || !/^\d+(\.\d+)?$/.test(val.trim())) {
    return typeof val === 'string' ? val : '';
  }
  const serial = parseFloat(val.trim());
  if (serial < 30000 || serial > 60000) return val as string;

  // Google Sheets serial dates: days since Dec 30, 1899 (UTC)
  const MS_PER_DAY = 86400000;
  const BASE_UTC = Date.UTC(1899, 11, 30); // Dec 30, 1899 00:00:00 UTC
  const targetMs = BASE_UTC + Math.floor(serial) * MS_PER_DAY;
  const d = new Date(targetMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function get(row: string[], header: string[], field: TransactionColumn): string {
  const idx = header.indexOf(field);
  if (idx === -1) return '';
  return row[idx] ?? '';
}

// ── Serialization ────────────────────────────────────────────────

export function serializeTransaction(t: Transaction): string[] {
  return [
    t.id,
    t.groupId || '',
    t.uiType,
    JSON.stringify(t.entries),
    String(t.amount),
    t.date,
    t.methodId || '',
    t.note || '',
    (t.tags || []).join(','),
    t.isDeleted ? 'TRUE' : 'FALSE',
    t.createdAt,
    t.updatedAt,
    '', // Checksum placeholder
  ];
}

// ── Deserialization ──────────────────────────────────────────────

export function deserializeTransaction(row: string[], header: string[]): Transaction {
  const entriesRaw = get(row, header, 'Entries JSON');
  return {
    id: get(row, header, 'ID'),
    groupId: get(row, header, 'Group ID'),
    uiType: (get(row, header, 'UI Type') as Transaction['uiType']) || 'expense',
    entries: entriesRaw ? JSON.parse(entriesRaw) : [],
    amount: Number(get(row, header, 'Amount')) || 0,
    date: unserialDate(get(row, header, 'Date')),
    methodId: get(row, header, 'Method ID') || undefined,
    note: get(row, header, 'Note'),
    tags: get(row, header, 'Tags').split(',').filter(Boolean),
    isDeleted: get(row, header, 'Is Deleted') === 'TRUE',
    createdAt: get(row, header, 'Created At'),
    updatedAt: get(row, header, 'Updated At') || get(row, header, 'Created At'),
  };
}
