import type { Transaction } from '@/types';

export function patchTransaction(
  transactions: Transaction[],
  id: string,
  patch: Partial<Transaction>,
  updatedAt: string
): { transactions: Transaction[]; updated?: Transaction } {
  let updated: Transaction | undefined;
  const next = transactions.map(transaction => {
    if (transaction.id !== id) return transaction;
    updated = { ...transaction, ...patch, updatedAt };
    return updated;
  });
  return { transactions: next, updated };
}

export function softDeleteTransaction(transactions: Transaction[], id: string, updatedAt: string) {
  return patchTransaction(transactions, id, { isDeleted: true }, updatedAt);
}
