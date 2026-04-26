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
}

export const createTransactionSlice: StateCreator<DataState, [], [], TransactionSlice> = set => ({
  transactions: [],

  addTransaction: params => {
    const { date, uiType, amount, accountId, targetId, methodId, note, tags } = params;
    const entries = LedgerEngine.createEntries({ type: uiType, amount, accountId, targetId });
    const id = uuid();
    const t = now();
    const txn = {
      id,
      groupId: uuid(),
      date,
      amount,
      entries,
      uiType,
      methodId,
      note,
      tags,
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
});
