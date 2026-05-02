import type { SyncEntityType, SyncOperation, SyncStatus } from '../types';

// ── Row Index ───────────────────────────────────────────────────

/** Maps entity IDs to their 1-based row number in Google Sheets */
export type RowIndex = Map<string, number>;

/** Row indexes for all entity sheets */
export interface RowIndexMap {
  transactions: RowIndex;
  accounts: RowIndex;
  methods: RowIndex;
  categories: RowIndex;
  budgets: RowIndex;
  settings: RowIndex;
}

// ── Sync Config ─────────────────────────────────────────────────

export interface SyncConfig {
  /** Debounce window in ms before flushing dirty operations */
  debounceMs: number;
  /** Max retry attempts for a single operation */
  maxRetries: number;
  /** Base delay for exponential backoff (in ms) */
  baseRetryDelayMs: number;
  /** Maximum backoff delay cap (in ms) */
  maxRetryDelayMs: number;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  debounceMs: 3000,
  maxRetries: 8,
  baseRetryDelayMs: 1000,
  maxRetryDelayMs: 60000,
};

// ── Sheet Definitions ───────────────────────────────────────────

export const SHEET_NAMES: Record<SyncEntityType, string> = {
  transaction: 'Transactions',
  account: 'Accounts',
  method: 'Methods',
  category: 'Categories',
  budget: 'Budgets',
  settings: 'Settings',
};

/** Column headers for each sheet tab */
export const SHEET_HEADERS: Record<string, string[]> = {
  Transactions: [
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
  ],
  Accounts: [
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
  ],
  Methods: [
    'ID',
    'Name',
    'Linked Account ID',
    'Is Active',
    'Is Deleted',
    'Sort Order',
    'Created At',
    'Updated At',
    'Checksum',
  ],
  Categories: [
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
  ],
  Budgets: [
    'ID',
    'Category ID',
    'Period',
    'Amount',
    'Is Deleted',
    'Created At',
    'Updated At',
    'Checksum',
  ],
  Settings: ['Key', 'Value', 'Checksum'],
};

// ── Reconciliation Result ───────────────────────────────────────

export interface ReconcileResult<T> {
  /** The final merged dataset */
  merged: T[];
  /** Items that need to be uploaded to the sheet (local wins or new local) */
  toUpload: T[];
  /** Items that were pulled from the sheet (remote wins or new remote) */
  toDownload: T[];
}

// ── Re-exports for convenience ──────────────────────────────────

export type { SyncEntityType, SyncOperation, SyncStatus };
