import type { Account, Category, Transaction, TransactionType } from '@/types';
import { LedgerEngine } from './ledger';

export interface SplitAllocationLine {
  categoryId: string;
  amount: string;
}

export function computeSplitAllocation(totalAmount: number, splits: SplitAllocationLine[]) {
  const allocated = splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  const remaining = totalAmount - allocated;
  return { allocated, remaining, isFullyAllocated: Math.abs(remaining) < 0.01 };
}

export interface TransactionInput {
  amount: number;
  date: string;
  type: TransactionType;
  methodId: string;
  targetId: string;
  fromMethodId: string;
  toMethodId: string;
  isSplit: boolean;
  splits: SplitAllocationLine[];
}

export function isValidTransactionInput(input: TransactionInput): boolean {
  const { amount, date, type, methodId, targetId, fromMethodId, toMethodId, isSplit, splits } =
    input;
  if (!amount || amount <= 0) return false;
  if (!date || isNaN(Date.parse(date))) return false;

  if (type === 'transfer') return !!fromMethodId && !!toMethodId;
  if (!methodId) return false;
  if (isSplit) {
    return (
      computeSplitAllocation(amount, splits).isFullyAllocated &&
      splits.every(split => split.categoryId && parseFloat(split.amount) > 0)
    );
  }
  return !!targetId;
}

export function getPreviewBalances(
  accountIds: string[],
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  excludeTransactionId?: string
): Map<string, number> {
  const activeTransactions = transactions.filter(
    transaction => !transaction.isDeleted && transaction.id !== excludeTransactionId
  );
  const balances = new Map<string, number>();
  for (const id of accountIds) {
    if (id && !balances.has(id)) {
      balances.set(id, LedgerEngine.getNormalBalance(id, activeTransactions, accounts, categories));
    }
  }
  return balances;
}

export function computeExpectedBalance(
  currentBalance: number,
  amount: number,
  direction: 'increase' | 'decrease'
): number {
  return currentBalance + (direction === 'increase' ? amount : -amount);
}
