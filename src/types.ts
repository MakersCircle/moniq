// ============================================================
// Data types for all core moniq entities
// ============================================================

export type AccountType = 'Asset' | 'Liability';

export interface Account {
  id: string;
  name: string;
  type: AccountType;       // Strictly Asset or Liability
  description?: string;    // Optional description (e.g. Bank name, 'Receivable', etc.)
  isSavings: boolean;      // ✅ Flag to designate saving accounts
  initialBalance: number;
  isActive: boolean;
  isDeleted: boolean;      // ✅ Soft delete flag for sync
  excludeFromNet?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  linkedAccountId?: string; // Links to Account
  isActive: boolean;
  isDeleted: boolean;      // ✅ Soft delete flag for sync
  createdAt: string;
  updatedAt: string;
}

export type CategoryGroup = 'Income' | 'Needs' | 'Wants' | 'Invest' | 'Lend' | 'Borrow';

export interface Category {
  id: string;
  group: CategoryGroup;
  head: string;
  subHead?: string;
  initialBalance?: number; // ✅ For Invest, Lend, Borrow opening balances
  color?: string;
  isActive: boolean;
  isDeleted: boolean;      // ✅ Soft delete flag for sync
  createdAt: string;
  updatedAt: string;
}

export type EntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  accountId: string;     // References an Account.id OR Category.id
  type: EntryType;
  amount: number;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  groupId: string;        // For grouping related entries if needed (split txns)
  date: string;           // ISO date string
  amount: number;         // Total transaction amount
  entries: LedgerEntry[]; // ✅ Standard Double-Entry system
  
  // UI-Helper Fields (to maintain logic simplicity in the UI)
  uiType: TransactionType;
  methodId?: string;
  note: string;
  tags?: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: string; // "YYYY-MM"
  isDeleted: boolean; // ✅ Soft delete flag for sync
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  numberLocale: string;         // e.g. 'en-IN' or 'en-US'
  fiscalYearStartMonth: number; // 1 = Jan
  dateFormat: string;
  hasCompletedOnboarding?: boolean;

  // Backup Metadata
  lastDailyBackup?: string;
  lastWeeklyBackup?: string;
  lastMonthlyBackup?: string;
  lastYearlyBackup?: string;
}

// ============================================================
// Sync Engine types
// ============================================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'pulling';

export type SyncEntityType = 'transaction' | 'account' | 'method' | 'category' | 'budget' | 'settings';

export interface SyncOperation {
  id: string;
  entity: SyncEntityType;
  action: 'create' | 'update' | 'delete';
  entityId: string;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}
