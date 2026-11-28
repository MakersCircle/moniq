import type { Transaction } from '../types';

/**
 * Sort transactions as they appear in the Ledger. A date group uses saved order
 * only when every active record in that group has one; legacy/mixed groups use
 * creation time consistently so the comparator stays transitive.
 */
export function sortLedgerTransactionsNewestFirst(
  transactions: Transaction[],
  orderingContext: Transaction[] = transactions
): Transaction[] {
  const hasCompleteSavedOrderByDate = new Map<string, boolean>();
  const grouped = new Map<string, Transaction[]>();

  for (const transaction of orderingContext) {
    if (transaction.isDeleted) continue;
    grouped.set(transaction.date, [...(grouped.get(transaction.date) ?? []), transaction]);
  }

  for (const [date, group] of grouped) {
    hasCompleteSavedOrderByDate.set(
      date,
      group.every(transaction => transaction.sortOrder !== undefined)
    );
  }

  return [...transactions].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    if (dateOrder !== 0) return dateOrder;

    if (hasCompleteSavedOrderByDate.get(a.date)) {
      const savedOrder = (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
      if (savedOrder !== 0) return savedOrder;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Return the exact reverse of Ledger display order for balance accumulation. */
export function sortLedgerTransactionsOldestFirst(transactions: Transaction[]): Transaction[] {
  return sortLedgerTransactionsNewestFirst(transactions).reverse();
}
