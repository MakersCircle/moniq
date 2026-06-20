import type { StateCreator } from 'zustand';
import type { DataState } from '../types';
import type { SyncStatus, Account, PaymentMethod, Category, Transaction, Budget } from '@/types';
import { defaultSettings } from './settingsSlice';
import { getCurrencySymbol } from '../../constants/currencies';
import { getAll, getAllSettings, getMeta, setMeta, delMeta } from '../../lib/db';

export interface SyncSlice {
  spreadsheetId: string | null;
  /** ID of the root "moniq" folder in the user's Drive */
  folderId: string | null;
  /** ID of the "Moniq Backups" subfolder */
  backupFolderId: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncError: string | undefined;
  isHydrated: boolean;
  isCloudInitialized: boolean;

  setSpreadsheetId: (id: string | null) => void;
  setSyncStatus: (status: SyncStatus, pendingCount: number, error?: string) => void;
  setLastSyncedAt: (timestamp: string) => void;
  setCloudInitialized: (initialized: boolean) => void;

  hydrateFromSync: (data: {
    accounts: Account[];
    methods: PaymentMethod[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    settings: Record<string, string>;
  }) => void;
  resetData: () => void;
  initializeFromDB: () => Promise<void>;
}

export const createSyncSlice: StateCreator<DataState, [], [], SyncSlice> = set => ({
  spreadsheetId: null,
  folderId: null,
  backupFolderId: null,
  lastSyncedAt: null,
  syncStatus: 'idle',
  pendingCount: 0,
  lastSyncError: undefined,
  isHydrated: false,
  isCloudInitialized: false,

  setSpreadsheetId: id => {
    set({ spreadsheetId: id });
    if (id) return setMeta('spreadsheetId', id);
    else return delMeta('spreadsheetId');
  },
  setFolderId: id => {
    set({ folderId: id });
    if (id) return setMeta('folderId', id);
    else return delMeta('folderId');
  },
  setBackupFolderId: id => {
    set({ backupFolderId: id });
    if (id) return setMeta('backupFolderId', id);
    else return delMeta('backupFolderId');
  },
  setSyncStatus: (syncStatus, pendingCount, lastSyncError) =>
    set({ syncStatus, pendingCount, lastSyncError }),
  setLastSyncedAt: timestamp => set({ lastSyncedAt: timestamp }),
  setCloudInitialized: isCloudInitialized => set({ isCloudInitialized }),

  hydrateFromSync: data => {
    set(state => {
      const nextState: Partial<DataState> = {};
      if (data.accounts.length > 0) nextState.accounts = data.accounts;
      if (data.methods.length > 0) nextState.methods = data.methods;
      if (data.categories.length > 0) nextState.categories = data.categories;
      if (data.transactions.length > 0) nextState.transactions = data.transactions;
      if (data.budgets.length > 0) nextState.budgets = data.budgets;

      if (Object.keys(data.settings).length > 0) {
        const current = { ...state.settings };
        for (const [key, value] of Object.entries(data.settings)) {
          if (key === 'currency') current.currency = value;
          else if (key === 'currencySymbol') current.currencySymbol = value;
          else if (key === 'numberLocale') current.numberLocale = value;
          else if (key === 'fiscalYearStartMonth') current.fiscalYearStartMonth = Number(value);
          else if (key === 'dateFormat') current.dateFormat = value;
          else if (key === 'tourStep') current.tourStep = value;
          else if (key === 'hasCompletedOnboarding')
            current.hasCompletedOnboarding = String(value).toLowerCase() === 'true';
        }
        nextState.settings = current;
      }

      nextState.lastSyncedAt = new Date().toISOString();
      nextState.isCloudInitialized = true;
      return nextState;
    });
  },

  resetData: () => {
    import('../../lib/db').then(({ clearLocalData }) => {
      clearLocalData().catch(console.error);
    });

    set(() => ({
      accounts: [],
      methods: [],
      categories: [],
      transactions: [],
      budgets: [],
      settings: defaultSettings,
      spreadsheetId: null,
      folderId: null,
      backupFolderId: null,
      lastSyncedAt: null,
      syncStatus: 'idle',
      pendingCount: 0,
      lastSyncError: undefined,
      accessToken: null,
      userProfile: null,
      tokenExpiresAt: null,
      isCloudInitialized: false,
    }));
  },

  clearZustandData: () => {
    set(() => ({
      accounts: [],
      methods: [],
      categories: [],
      transactions: [],
      budgets: [],
      pendingCount: 0,
      syncStatus: 'idle',
      lastSyncError: undefined,
      spreadsheetId: null,
      folderId: null,
      backupFolderId: null,
    }));
  },

  initializeFromDB: async () => {
    try {
      const [
        accounts,
        methods,
        categories,
        transactions,
        budgets,
        settings,
        lastSyncedAt,
        accessToken,
        tokenExpiresAt,
        userProfileStr,
        spreadsheetId,
        folderId,
        backupFolderId,
        syncQueue,
      ] = await Promise.all([
        getAll<Account>('accounts'),
        getAll<PaymentMethod>('methods'),
        getAll<Category>('categories'),
        getAll<Transaction>('transactions'),
        getAll<Budget>('budgets'),
        getAllSettings(),
        getMeta('lastSyncedAt'),
        getMeta('accessToken'),
        getMeta('tokenExpiresAt'),
        getMeta('userProfile'),
        getMeta('spreadsheetId'),
        getMeta('folderId'),
        getMeta('backupFolderId'),
        getAllSyncQueue(),
      ]);

      let userProfile = null;
      try {
        if (userProfileStr) userProfile = JSON.parse(userProfileStr);
      } catch {
        // Ignore JSON parse errors for user profile
      }

      const userSettings = { ...defaultSettings };
      if (Object.keys(settings).length > 0) {
        if (settings.currency) userSettings.currency = settings.currency;
        if (settings.numberLocale) userSettings.numberLocale = settings.numberLocale;

        if (settings.currencySymbol) {
          userSettings.currencySymbol = settings.currencySymbol;
        } else if (settings.currency) {
          userSettings.currencySymbol = getCurrencySymbol(
            userSettings.currency,
            userSettings.numberLocale
          );
        }

        if (settings.fiscalYearStartMonth)
          userSettings.fiscalYearStartMonth = Number(settings.fiscalYearStartMonth);
        if (settings.dateFormat) userSettings.dateFormat = settings.dateFormat;
        if (settings.tourStep) userSettings.tourStep = settings.tourStep;
        if (settings.hasCompletedOnboarding !== undefined) {
          userSettings.hasCompletedOnboarding =
            String(settings.hasCompletedOnboarding).toLowerCase() === 'true';
        }
      }

      set({
        accounts,
        methods,
        categories,
        transactions,
        budgets: budgets as Budget[],
        settings: userSettings,
        spreadsheetId: spreadsheetId || null,
        folderId: folderId || null,
        backupFolderId: backupFolderId || null,
        lastSyncedAt: lastSyncedAt || null,
        accessToken: accessToken || null,
        tokenExpiresAt: tokenExpiresAt ? Number(tokenExpiresAt) : null,
        userProfile,
        pendingCount: syncQueue ? syncQueue.length : 0,
        isHydrated: true,
        isCloudInitialized: !!lastSyncedAt,
      });
    } catch (err) {
      console.error('Failed to initialize from DB:', err);
      set({ isHydrated: true, isCloudInitialized: true });
    }
  },
});
