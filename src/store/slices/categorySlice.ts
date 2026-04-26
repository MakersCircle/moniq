import type { StateCreator } from 'zustand';
import type { DataState } from '../types';
import type { Category, PaymentMethod } from '../../types';
import { uuid, now, markDirty } from '../helpers';
import { put } from '../../lib/db';

export interface CategorySlice {
  categories: Category[];
  methods: PaymentMethod[];
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  archiveCategory: (id: string) => void;
  deleteCategory: (id: string) => { success: boolean; reason?: string };

  addMethod: (m: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  updateMethod: (id: string, patch: Partial<PaymentMethod>) => void;
  archiveMethod: (id: string) => void;
  deleteMethod: (id: string) => { success: boolean; reason?: string };
}

export const createCategorySlice: StateCreator<DataState, [], [], CategorySlice> = (set, get) => ({
  categories: [],
  methods: [],

  addCategory: c => {
    const id = uuid();
    const t = now();
    const next = { ...c, id, isDeleted: false, createdAt: t, updatedAt: t } as Category;
    set(state => ({ categories: [...state.categories, next] }));
    put('categories', next);
    markDirty('category', id, 'create');
  },

  updateCategory: (id, patch) => {
    set(state => {
      const next = state.categories.map(c =>
        c.id === id ? { ...c, ...patch, updatedAt: now() } : c
      );
      const updated = next.find(x => x.id === id);
      if (updated) put('categories', updated);
      return { categories: next };
    });
    markDirty('category', id, 'update');
  },

  archiveCategory: id => {
    set(state => {
      const next = state.categories.map(c =>
        c.id === id ? { ...c, isActive: false, updatedAt: now() } : c
      );
      const updated = next.find(x => x.id === id);
      if (updated) put('categories', updated);
      return { categories: next };
    });
    markDirty('category', id, 'update');
  },

  deleteCategory: id => {
    const state = get();
    const hasTransactions = state.transactions.some(
      t => !t.isDeleted && t.entries.some(e => e.accountId === id)
    );
    if (hasTransactions)
      return { success: false, reason: 'This category is referenced by existing transactions.' };

    const hasBudgets = state.budgets.some(b => !b.isDeleted && b.categoryId === id);
    if (hasBudgets)
      return {
        success: false,
        reason: 'This category has a budget assigned. Remove the budget first.',
      };

    const t = now();
    set(s => ({
      categories: s.categories.map(c =>
        c.id === id ? { ...c, isDeleted: true, updatedAt: t } : c
      ),
    }));

    const updated = get().categories.find(c => c.id === id);
    if (updated) put('categories', updated);
    markDirty('category', id, 'update');
    return { success: true };
  },

  addMethod: m => {
    const id = uuid();
    const t = now();
    const newMethod = { ...m, id, isDeleted: false, createdAt: t, updatedAt: t } as PaymentMethod;
    set(state => ({ methods: [...state.methods, newMethod] }));
    put('methods', newMethod);
    markDirty('method', id, 'create');
  },

  updateMethod: (id, patch) => {
    set(state => {
      const next = state.methods.map(m => (m.id === id ? { ...m, ...patch, updatedAt: now() } : m));
      const updated = next.find(x => x.id === id);
      if (updated) put('methods', updated);
      return { methods: next };
    });
    markDirty('method', id, 'update');
  },

  archiveMethod: id => {
    set(state => {
      const next = state.methods.map(m =>
        m.id === id ? { ...m, isActive: false, updatedAt: now() } : m
      );
      const updated = next.find(x => x.id === id);
      if (updated) put('methods', updated);
      return { methods: next };
    });
    markDirty('method', id, 'update');
  },

  deleteMethod: id => {
    const state = get();
    const method = state.methods.find(m => m.id === id);
    if (!method || method.isDeleted) return { success: false, reason: 'Method not found.' };

    const hasTransactions = state.transactions.some(t => !t.isDeleted && t.methodId === id);
    if (hasTransactions)
      return {
        success: false,
        reason: 'This method is used in existing transactions. Archive it instead.',
      };

    if (method.linkedAccountId) {
      const otherMethods = state.methods.filter(
        m =>
          m.id !== id && m.linkedAccountId === method.linkedAccountId && m.isActive && !m.isDeleted
      );
      if (otherMethods.length === 0)
        return {
          success: false,
          reason:
            'This is the only active payment method for its linked account. Create another method first, or unlink and then delete.',
        };
    }

    const t = now();
    set(s => ({
      methods: s.methods.map(m => (m.id === id ? { ...m, isDeleted: true, updatedAt: t } : m)),
    }));

    const updated = get().methods.find(m => m.id === id);
    if (updated) put('methods', updated);
    markDirty('method', id, 'update');
    return { success: true };
  },
});
