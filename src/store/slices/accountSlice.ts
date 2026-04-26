import type { StateCreator } from 'zustand';
import type { DataState } from '../types';
import type { Account, PaymentMethod } from '../../types';
import { uuid, now, markDirty } from '../helpers';
import { put } from '../../lib/db';

export interface AccountSlice {
  accounts: Account[];
  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  archiveAccount: (id: string) => void;
  restoreAccount: (id: string) => void;
  deleteAccount: (id: string) => { success: boolean; reason?: string };
}

export const createAccountSlice: StateCreator<DataState, [], [], AccountSlice> = (set, get) => ({
  accounts: [],

  addAccount: a => {
    const id = uuid();
    const t = now();
    const methodId = uuid();
    const newAccount = { ...a, id, isDeleted: false, createdAt: t, updatedAt: t } as Account;
    const newMethod = {
      id: methodId,
      name: a.name,
      linkedAccountId: id,
      isActive: true,
      isDeleted: false,
      createdAt: t,
      updatedAt: t,
    } as PaymentMethod;

    set(state => ({
      accounts: [...state.accounts, newAccount],
      methods: [...state.methods, newMethod],
    }));

    put('accounts', newAccount);
    put('methods', newMethod);
    markDirty('account', id, 'create');
    markDirty('method', methodId, 'create');
  },

  updateAccount: (id, patch) => {
    set(state => {
      const next = state.accounts.map(s =>
        s.id === id ? { ...s, ...patch, updatedAt: now() } : s
      );
      const updated = next.find(a => a.id === id);
      if (updated) put('accounts', updated);
      return { accounts: next };
    });
    markDirty('account', id, 'update');
  },

  archiveAccount: id => {
    set(state => {
      const next = state.accounts.map(s =>
        s.id === id ? { ...s, isActive: false, updatedAt: now() } : s
      );
      const updated = next.find(a => a.id === id);
      if (updated) put('accounts', updated);
      return { accounts: next };
    });
    markDirty('account', id, 'update');
  },

  restoreAccount: id => {
    const t = now();
    set(state => {
      const nextAccounts = state.accounts.map(a =>
        a.id === id ? { ...a, isDeleted: false, updatedAt: t } : a
      );
      const nextMethods = state.methods.map(m =>
        m.linkedAccountId === id && m.isDeleted ? { ...m, isDeleted: false, updatedAt: t } : m
      );

      const updatedAcc = nextAccounts.find(a => a.id === id);
      if (updatedAcc) put('accounts', updatedAcc);

      nextMethods.forEach(m => {
        if (m.linkedAccountId === id && nextMethods.find(x => x.id === m.id && !x.isDeleted)) {
          put('methods', m);
          markDirty('method', m.id, 'update');
        }
      });

      return { accounts: nextAccounts, methods: nextMethods };
    });
    markDirty('account', id, 'update');
  },

  deleteAccount: id => {
    const state = get();
    const hasTransactions = state.transactions.some(
      t => !t.isDeleted && t.entries.some(e => e.accountId === id)
    );
    if (hasTransactions)
      return {
        success: false,
        reason: 'This account is referenced by existing transactions. Archive it instead.',
      };

    const linkedMethods = state.methods.filter(m => !m.isDeleted && m.linkedAccountId === id);
    const methodsInUse = linkedMethods.filter(m =>
      state.transactions.some(t => !t.isDeleted && t.methodId === m.id)
    );
    if (methodsInUse.length > 0) {
      const names = methodsInUse.map(m => m.name).join(', ');
      return {
        success: false,
        reason: `Linked payment method(s) "${names}" are used in transactions. Archive the account instead.`,
      };
    }
    const hasBudgets = state.budgets.some(b => !b.isDeleted && b.categoryId === id);
    if (hasBudgets)
      return {
        success: false,
        reason: 'This account is referenced by a budget. Remove the budget first.',
      };

    const t = now();
    const deletedMethodIds = linkedMethods.map(m => m.id);

    set(s => ({
      accounts: s.accounts.map(a => (a.id === id ? { ...a, isDeleted: true, updatedAt: t } : a)),
      methods: s.methods.map(m =>
        m.linkedAccountId === id ? { ...m, isDeleted: true, updatedAt: t } : m
      ),
    }));

    const newState = get();
    const account = newState.accounts.find(a => a.id === id);
    if (account) put('accounts', account);

    for (const mId of deletedMethodIds) {
      const method = newState.methods.find(m => m.id === mId);
      if (method) put('methods', method);
    }

    markDirty('account', id, 'update');
    for (const mId of deletedMethodIds) markDirty('method', mId, 'update');
    return { success: true };
  },
});
