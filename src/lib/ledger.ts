import type { Account, Category, Transaction, LedgerEntry, EntryType } from '../types';

/**
 * LedgerEngine handles the core professional accounting logic.
 * It follows standard Double-Entry principles while providing 
 * easy-to-use helpers for the UI.
 */
export class LedgerEngine {
  /**
   * Calculates the 'normal' balance for a specific node (Account or Category).
   * 
   * Assets (Cash, Bank) -> Debit(+) Credit(-)
   * Liabilities (Loans, Credit Card) -> Credit(+) Debit(-)
   * Revenue/Income -> Credit(+) Debit(-)
   * Expenses/Payments -> Debit(+) Credit(-)
   */
  static getNormalBalance(
    id: string,
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[]
  ): number {
    const account = accounts.find((a) => a.id === id);
    const category = categories.find((c) => c.id === id);

    let balance = 0;

    // 1. Incorporate Initial Balances
    if (account) balance = account.initialBalance;
    if (category?.initialBalance) balance = category.initialBalance;

    // 2. Aggregate Ledger Entries
    const activeTxns = transactions.filter((t) => !t.isDeleted);
    for (const t of activeTxns) {
      for (const entry of t.entries) {
        if (entry.accountId === id) {
          balance += this.calculateEntryImpact(entry, account, category);
        }
      }
    }

    return balance;
  }

  /**
   * Internal helper to determine if an entry adds or subtracts from the balance
   * based on the Class of the account.
   */
  private static calculateEntryImpact(
    entry: LedgerEntry,
    account?: Account,
    category?: Category
  ): number {
    const isDebit = entry.type === 'DEBIT';

    // ASSETS & EXPENSES: Debit increases, Credit decreases
    if (account?.type === 'Asset' || (category && this.isExpenseCategory(category))) {
      return isDebit ? entry.amount : -entry.amount;
    }

    // LIABILITIES & INCOME: Credit increases, Debit decreases
    if (account?.type === 'Liability' || (category && this.isIncomeCategory(category))) {
      return isDebit ? -entry.amount : entry.amount;
    }

    return 0;
  }

  private static isExpenseCategory(c: Category): boolean {
    return ['Needs', 'Wants', 'Invest', 'Lend'].includes(c.group);
  }

  private static isIncomeCategory(c: Category): boolean {
    return ['Income', 'Borrow'].includes(c.group);
  }

  /**
   * Validates that a transaction is 'balanced' (Sum of debits === Sum of credits).
   */
  static validate(entries: LedgerEntry[]): boolean {
    const debits = entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    const credits = entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    
    // Using a small epsilon for floating point safety if we ever move to complex decimals,
    // though for currency we usually use integers or fixed precision.
    return Math.abs(debits - credits) < 0.001;
  }

  /**
   * Helper to generate a standardized set of LedgerEntries for common UI flows.
   */
  static createEntries(params: {
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    accountId: string;
    targetId: string; // CategoryId for income/expense, or another AccountId for transfer
  }): LedgerEntry[] {
    const { type, amount, accountId, targetId } = params;

    if (type === 'expense') {
      return [
        { accountId: targetId, type: 'DEBIT', amount },  // Expense increased
        { accountId: accountId, type: 'CREDIT', amount }, // Asset decreased
      ];
    }

    if (type === 'income') {
      return [
        { accountId: accountId, type: 'DEBIT', amount },  // Asset increased
        { accountId: targetId, type: 'CREDIT', amount }, // Revenue increased
      ];
    }

    if (type === 'transfer') {
      return [
        { accountId: targetId, type: 'DEBIT', amount },   // Destination Asset increased
        { accountId: accountId, type: 'CREDIT', amount }, // Source Asset decreased
      ];
    }

    return [];
  }
}
