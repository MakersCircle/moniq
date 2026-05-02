/**
 * Data types for all core Moniq entities.
 * These types define the structure of data stored in IndexedDB and synced with Google Sheets.
 *
 * @module Types
 */

/**
 * Classification for accounts to determine their nature in the ledger.
 */
export type AccountType = 'Asset' | 'Liability';

/**
 * Represents a financial account where money resides (e.g., Bank, Wallet, Stash).
 */
export interface Account {
  /** Unique UUID for the account */
  id: string;
  /** Display name of the account */
  name: string;
  /** Whether the account is an Asset (Cash, Bank) or Liability (Credit Card, Loan) */
  type: AccountType;
  /** Optional descriptive text */
  description?: string;
  /** If true, this account is included in savings calculations */
  isSavings: boolean;
  /** The balance the account started with upon creation in Moniq */
  initialBalance: number;
  /** Whether the account is currently selectable in the UI */
  isActive: boolean;
  /** Soft delete flag for synchronization logic */
  isDeleted: boolean;
  /** If true, this account balance is ignored in Net Worth calculation */
  excludeFromNet?: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
}

/**
 * Represents a payment channel bound to an Account (e.g., UPI, Debit Card, Cash).
 */
export interface PaymentMethod {
  /** Unique UUID for the payment method */
  id: string;
  /** Display name (e.g., "HDFC Debit Card") */
  name: string;
  /** ID of the Account this method draws from */
  linkedAccountId?: string;
  /** Whether the method is active */
  isActive: boolean;
  /** Soft delete flag */
  isDeleted: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
  /** Custom display order */
  sortOrder?: number;
}

/**
 * High-level groups for financial categorization.
 */
export type CategoryGroup = 'Income' | 'Needs' | 'Wants' | 'Invest' | 'Lend' | 'Borrow';

/**
 * A category used to label transactions for budgeting and reporting.
 */
export interface Category {
  /** Unique UUID */
  id: string;
  /** The top-level group this category belongs to */
  group: CategoryGroup;
  /** The main category header (e.g., "Food") */
  head: string;
  /** The optional sub-category (e.g., "Groceries") */
  subHead?: string;
  /** Opening balance for tracking external items like Investments or Loans */
  initialBalance?: number;
  /** Hex color code for UI visualization */
  color?: string;
  /** Whether the category is active */
  isActive: boolean;
  /** Soft delete flag */
  isDeleted: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  /** Custom display order */
  sortOrder?: number;
  updatedAt: string;
}

/**
 * Accounting entry type.
 */
export type EntryType = 'DEBIT' | 'CREDIT';

/**
 * A single balanced entry in the double-entry ledger.
 */
export interface LedgerEntry {
  /** References an Account.id or Category.id */
  accountId: string;
  /** Whether this is a DEBIT or CREDIT */
  type: EntryType;
  /** The absolute amount for this entry */
  amount: number;
}

/**
 * UI-level classification for transactions.
 */
export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * The core transaction object representing a financial event.
 */
export interface Transaction {
  /** Unique UUID */
  id: string;
  /** ID used to group related entries (essential for split transactions) */
  groupId: string;
  /** Transaction date in YYYY-MM-DD format */
  date: string;
  /** Total transaction amount */
  amount: number;
  /** List of balanced ledger entries comprising this transaction */
  entries: LedgerEntry[];

  /** UI classification: income, expense, or transfer */
  uiType: TransactionType;
  /** The primary payment method ID used (if applicable) */
  methodId?: string;
  /** User-provided memo or note */
  note: string;
  /** Optional categorization tags */
  tags?: string[];
  /** Soft delete flag */
  isDeleted: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
}

/**
 * Monthly budget allocation for a specific category.
 */
export interface Budget {
  /** Unique UUID */
  id: string;
  /** Reference to the Category.id */
  categoryId: string;
  /** Allocated amount for the period */
  amount: number;
  /** The month the budget applies to (Format: YYYY-MM) */
  period: string;
  /** Soft delete flag */
  isDeleted: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
}

/**
 * Global application and user preference settings.
 */
export interface UserSettings {
  /** ISO currency code (e.g., INR, USD) */
  currency: string;
  /** Visual currency symbol (e.g., ₹, $) */
  currencySymbol: string;
  /** Locale for number formatting (e.g., en-IN) */
  numberLocale: string;
  /** The month the fiscal year begins (1-12) */
  fiscalYearStartMonth: number;
  /** Preferred date display format */
  dateFormat: string;
  /** Whether the user has completed the first-run onboarding */
  hasCompletedOnboarding?: boolean;

  /** Timestamp of the last successful daily backup to Google Drive */
  lastDailyBackup?: string;
  /** Timestamp of the last successful weekly backup */
  lastWeeklyBackup?: string;
  /** Timestamp of the last successful monthly backup */
  lastMonthlyBackup?: string;
  /** Timestamp of the last successful yearly backup */
  lastYearlyBackup?: string;
}

/**
 * Current state of the synchronization engine.
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'pulling';

/**
 * List of entities that can be synchronized.
 */
export type SyncEntityType =
  | 'transaction'
  | 'account'
  | 'method'
  | 'category'
  | 'budget'
  | 'settings';

/**
 * Represents a single modification that needs to be synced to Google Sheets.
 */
export interface SyncOperation {
  /** Unique UUID for the sync task */
  id: string;
  /** Type of entity being modified */
  entity: SyncEntityType;
  /** Action performed on the entity */
  action: 'create' | 'update' | 'delete';
  /** ID of the actual entity being changed */
  entityId: string;
  /** When the operation was queued */
  timestamp: string;
  /** Number of failed sync attempts */
  retryCount: number;
  /** The last error message encountered if sync failed */
  lastError?: string;
}
