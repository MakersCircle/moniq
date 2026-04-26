import { create } from 'zustand';
import type { DataState } from './types';
import { createAccountSlice } from './slices/accountSlice';
import { createCategorySlice } from './slices/categorySlice';
import { createTransactionSlice } from './slices/transactionSlice';
import { createBudgetSlice } from './slices/budgetSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createSyncSlice } from './slices/syncSlice';
import { uuid, now } from './helpers';

export const useDataStore = create<DataState>()((...a) => ({
  ...createAccountSlice(...a),
  ...createCategorySlice(...a),
  ...createTransactionSlice(...a),
  ...createBudgetSlice(...a),
  ...createSettingsSlice(...a),
  ...createSyncSlice(...a),
}));

// Export helpers that might be imported by other files
export { uuid, now };

// Expose store for debugging
if (import.meta.env.DEV) {
  (window as unknown as { useDataStore: typeof useDataStore }).useDataStore = useDataStore;
}
