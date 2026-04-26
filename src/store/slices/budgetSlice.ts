import type { StateCreator } from 'zustand';
import type { DataState } from '../types';
import type { Budget } from '../../types';
import { uuid, now, markDirty } from '../helpers';
import { put } from '../../lib/db';

export interface BudgetSlice {
  budgets: Budget[];
  updateBudget: (categoryId: string, period: string, amount: number) => void;
}

export const createBudgetSlice: StateCreator<DataState, [], [], BudgetSlice> = set => ({
  budgets: [],

  updateBudget: (categoryId, period, amount) => {
    set(state => {
      const existingIdx = state.budgets.findIndex(
        b => b.categoryId === categoryId && b.period === period && !b.isDeleted
      );
      const t = now();
      if (existingIdx >= 0) {
        const next = [...state.budgets];
        next[existingIdx] = { ...next[existingIdx], amount, updatedAt: t };
        put('budgets', next[existingIdx]);
        markDirty('budget', next[existingIdx].id, 'update');
        return { budgets: next };
      }
      const id = uuid();
      const next = { id, categoryId, period, amount, isDeleted: false, createdAt: t, updatedAt: t };
      put('budgets', next);
      markDirty('budget', id, 'create');
      return { budgets: [...state.budgets, next] };
    });
  },
});
