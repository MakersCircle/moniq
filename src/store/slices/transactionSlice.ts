import type { StateCreator } from 'zustand';
import type { DataState } from '../types';
import type { Transaction } from '../../types';
import { uuid, now, markDirty } from '../helpers';
import { put } from '../../lib/db';
import { LedgerEngine } from '../../lib/ledger';

export interface TransactionSlice {
  transactions: Transaction[];
  addTransaction: (params: {
    date: string;
    uiType: 'income' | 'expense' | 'transfer';
    amount: number;
    accountId: string;
    targetId: string; // categoryId or toAccountId
    methodId?: string;
    note: string;
    tags?: string[];
  }) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  reorderTransactions: (orderedIds: string[]) => void;
}

export const createTransactionSlice: StateCreator<DataState, [], [], TransactionSlice> = set => ({
  transactions: [],

  addTransaction: params => {
    const { date, uiType, amount, accountId, targetId, methodId, note, tags } = params;
    const entries = LedgerEngine.createEntries({ type: uiType, amount, accountId, targetId });
    const id = uuid();
    const t = now();

    // Compute next sortOrder for this date: max of existing same-date sortOrders + 1
    let nextSortOrder = 0;
    set(state => {
      const sameDayOrders = state.transactions
        .filter(tx => !tx.isDeleted && tx.date === date && tx.sortOrder !== undefined)
        .map(tx => tx.sortOrder as number);
      nextSortOrder = sameDayOrders.length > 0 ? Math.max(...sameDayOrders) + 1 : 0;
      return {};
    });

    const txn: Transaction = {
      id,
      groupId: uuid(),
      date,
      amount,
      entries,
      uiType,
      methodId,
      note,
      tags,
      sortOrder: nextSortOrder,
      isDeleted: false,
      createdAt: t,
      updatedAt: t,
    };

    set(state => ({
      transactions: [txn, ...state.transactions],
    }));
    put('transactions', txn);
    markDirty('transaction', id, 'create');
  },

  updateTransaction: (id, patch) => {
    set(state => {
      const next = state.transactions.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: now() } : t
      );
      const updated = next.find(x => x.id === id);
      if (updated) put('transactions', updated);
      return { transactions: next };
    });
    markDirty('transaction', id, 'update');
  },

  deleteTransaction: id => {
    set(state => {
      const next = state.transactions.map(t =>
        t.id === id ? { ...t, isDeleted: true, updatedAt: now() } : t
      );
      const updated = next.find(x => x.id === id);
      if (updated) put('transactions', updated);
      return { transactions: next };
    });
    markDirty('transaction', id, 'update');
  },

  reorderTransactions: orderedIds => {
    const updatedAt = now();
    set(state => {
      const next = state.transactions.map(t => {
        const idx = orderedIds.indexOf(t.id);
        if (idx === -1) return t;
        return { ...t, sortOrder: idx, updatedAt };
      });
      // Persist + queue sync for each re-ordered record
      for (const id of orderedIds) {
        const updated = next.find(t => t.id === id);
        if (updated) {
          put('transactions', updated);
          markDirty('transaction', id, 'update');
        }
      }
      return { transactions: next };
    });
  },
});
