// ============================================================
// Data types for all core moniq entities
// ============================================================

export type SourceType = 'Bank' | 'Wallet' | 'Cash' | 'Investment' | 'Receivable' | 'Payable' | 'Custom';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  initialBalance: number;
  currency: string;
  isActive: boolean;
  excludeFromNet?: boolean;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  linkedSourceId?: string; // Optional default source
  isActive: boolean;
  createdAt: string;
}

export type CategoryGroup = 'Needs' | 'Wants' | 'Savings' | 'Investment' | 'Debt' | 'Income' | 'Custom';

export interface Category {
  id: string;
  group: CategoryGroup;
  head: string;
  subHead?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionSplit {
  categoryId: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  id: string;
  groupId: string; // Same groupId = split transaction parts
  date: string;    // ISO date string
  type: TransactionType;
  amount: number;  // Total for splits; per-part for leaves
  sourceId: string;
  toSourceId?: string;    // Transfers only
  methodId?: string;
  categoryId?: string;    // Undefined for transfers
  note: string;
  tags?: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  fiscalYearStartMonth: number; // 1 = Jan
  dateFormat: string;
}
