import type { StateCreator } from 'zustand';
import type { DataState } from '../types';
import type {
  SyncStatus,
  Account,
  PaymentMethod,
  Category,
  Transaction,
  Budget,
} from '../../types';
import { defaultSettings } from './settingsSlice';
import { getCurrencySymbol } from '../../constants/currencies';
import { getAll, getAllSettings, getMeta, setMeta, delMeta, clearStore } from '../../lib/db';

export interface SyncSlice {
  spreadsheetId: string | null;
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
  lastSyncedAt: null,
  syncStatus: 'idle',
  pendingCount: 0,
  lastSyncError: undefined,
  isHydrated: false,
  isCloudInitialized: false,

  setSpreadsheetId: id => {
    set({ spreadsheetId: id });
    if (id) setMeta('spreadsheetId', id);
    else delMeta('spreadsheetId');
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
          else if (key === 'hasCompletedOnboarding')
            current.hasCompletedOnboarding = String(value).toLowerCase() === 'true';
          else if (key === 'lastDailyBackup') current.lastDailyBackup = value;
          else if (key === 'lastWeeklyBackup') current.lastWeeklyBackup = value;
          else if (key === 'lastMonthlyBackup') current.lastMonthlyBackup = value;
          else if (key === 'lastYearlyBackup') current.lastYearlyBackup = value;
        }
        nextState.settings = current;
      }

      nextState.lastSyncedAt = new Date().toISOString();
      nextState.isCloudInitialized = true;
      return nextState;
    });
  },

  resetData: () => {
    [
      'accounts',
      'methods',
      'categories',
      'transactions',
      'budgets',
      'settings',
      'meta',
      'sync_queue',
      'remote_snapshot',
    ].forEach(s => clearStore(s as Parameters<typeof clearStore>[0]));

    set(() => ({
      accounts: [],
      methods: [],
      categories: [],
      transactions: [],
      budgets: [],
      settings: defaultSettings,
      spreadsheetId: null,
      lastSyncedAt: null,
      syncStatus: 'idle',
      pendingCount: 0,
      lastSyncError: undefined,
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
        if (settings.hasCompletedOnboarding) {
          userSettings.hasCompletedOnboarding =
            String(settings.hasCompletedOnboarding).toLowerCase() === 'true';
        }
        if (settings.lastDailyBackup) userSettings.lastDailyBackup = settings.lastDailyBackup;
        if (settings.lastWeeklyBackup) userSettings.lastWeeklyBackup = settings.lastWeeklyBackup;
        if (settings.lastMonthlyBackup) userSettings.lastMonthlyBackup = settings.lastMonthlyBackup;
        if (settings.lastYearlyBackup) userSettings.lastYearlyBackup = settings.lastYearlyBackup;
      }

      set({
        accounts,
        methods,
        categories,
        transactions,
        budgets: budgets as Budget[],
        settings: userSettings,
        spreadsheetId: spreadsheetId || null,
        lastSyncedAt: lastSyncedAt || null,
        accessToken: accessToken || null,
        tokenExpiresAt: tokenExpiresAt ? Number(tokenExpiresAt) : null,
        userProfile,
        isHydrated: true,
        isCloudInitialized: !!lastSyncedAt,
      });
    } catch (err) {
      console.error('Failed to initialize from DB:', err);
      set({ isHydrated: true, isCloudInitialized: true });
    }
  },
});
