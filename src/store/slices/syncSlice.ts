import type { StateCreator } from 'zustand';
import { readAccessTokenSession, saveAccessTokenSession } from '@/lib/accessTokenStorage';
import { preserveLocalEdits } from '@/lib/localWorkspace';
import type { ReconciledWorkspace, DataState } from '../types';
import type { SyncStatus, Account, PaymentMethod, Category, Transaction, Budget } from '@/types';
import { defaultSettings } from './settingsSlice';
import { restoreUserSettings, serializeSettings } from '@/lib/userSettings';
import {
  getAll,
  getAllSettings,
  getMeta,
  setMeta,
  delMeta,
  getAllSyncQueue,
  putSetting,
} from '../../lib/db';

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

  // Demo Mode
  isDemoMode: boolean;
  startDemoMode: () => Promise<void>;
  exitDemoMode: () => void;

  setSpreadsheetId: (id: string | null) => void;
  setFolderId: (id: string | null) => void;
  setBackupFolderId: (id: string | null) => void;
  clearZustandData: () => void;
  setSyncStatus: (status: SyncStatus, pendingCount: number, error?: string) => void;
  setLastSyncedAt: (timestamp: string) => void;
  setCloudInitialized: (initialized: boolean) => void;

  hydrateFromSync: (data: ReconciledWorkspace) => void;
  resetData: () => Promise<void>;
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
  isDemoMode: false,

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
      const merge = <T extends { id: string }>(
        values: T[],
        before: T[] | undefined,
        current: T[]
      ) => (before ? preserveLocalEdits(values, before, current) : values);
      nextState.accounts = merge(data.accounts, data.localSnapshot?.accounts, state.accounts);
      nextState.methods = merge(data.methods, data.localSnapshot?.methods, state.methods);
      nextState.categories = merge(
        data.categories,
        data.localSnapshot?.categories,
        state.categories
      );
      nextState.transactions = merge(
        data.transactions,
        data.localSnapshot?.transactions,
        state.transactions
      );
      nextState.budgets = merge(data.budgets, data.localSnapshot?.budgets, state.budgets);

      if (
        Object.keys(data.settings).length > 0 &&
        (!data.localSnapshot || data.localSnapshot.settings === state.settings)
      ) {
        const current = { ...state.settings };
        for (const [key, value] of Object.entries(data.settings)) {
          if (key === 'currency') current.currency = value;
          else if (key === 'currencySymbol') current.currencySymbol = value;
          else if (key === 'numberLocale') current.numberLocale = value;
          else if (key === 'fiscalYearStartMonth') current.fiscalYearStartMonth = Number(value);
          else if (key === 'dateFormat') current.dateFormat = value;
        }
        nextState.settings = current;
      }

      nextState.lastSyncedAt = new Date().toISOString();
      nextState.isCloudInitialized = true;
      return nextState;
    });
  },

  startDemoMode: async () => {
    const { clearLocalData } = await import('../../lib/db');
    saveAccessTokenSession(null);
    await clearLocalData();
    await setMeta('isDemoMode', 'true');
    await Promise.all(
      Object.entries(serializeSettings(defaultSettings)).map(([key, value]) =>
        putSetting(key, value)
      )
    );

    set({
      isDemoMode: true,
      isCloudInitialized: true,
      isHydrated: true,
      accessToken: null,
      tokenExpiresAt: null,
      spreadsheetId: null,
      folderId: null,
      backupFolderId: null,
      userProfile: null,
      accounts: [],
      methods: [],
      categories: [],
      transactions: [],
      budgets: [],
      pendingCount: 0,
      syncStatus: 'idle',
      lastSyncError: undefined,
      settings: defaultSettings,
    });
  },

  exitDemoMode: () => {
    delMeta('isDemoMode');
    set({ isDemoMode: false });
  },

  resetData: async () => {
    const { clearLocalData } = await import('../../lib/db');
    saveAccessTokenSession(null);
    await clearLocalData();

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
      isDemoMode: false,
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
        userProfileStr,
        spreadsheetId,
        folderId,
        backupFolderId,
        syncQueue,
        isDemoModeMeta,
      ] = await Promise.all([
        getAll<Account>('accounts'),
        getAll<PaymentMethod>('methods'),
        getAll<Category>('categories'),
        getAll<Transaction>('transactions'),
        getAll<Budget>('budgets'),
        getAllSettings(),
        getMeta('lastSyncedAt'),
        getMeta('userProfile'),
        getMeta('spreadsheetId'),
        getMeta('folderId'),
        getMeta('backupFolderId'),
        getAllSyncQueue(),
        getMeta('isDemoMode'),
      ]);

      await Promise.all([delMeta('accessToken'), delMeta('tokenExpiresAt')]);
      const session = readAccessTokenSession();
      const userSettings = restoreUserSettings(settings, defaultSettings);
      // Canonicalize defaults once on this device; cloud settings still take
      // precedence on first connection unless the user explicitly edited them.
      await Promise.all(
        Object.entries(serializeSettings(userSettings)).map(([key, value]) =>
          settings[key] === undefined ? putSetting(key, value) : Promise.resolve()
        )
      );

      // If demo mode was active before reload, restore it immediately without
      // touching any Google APIs — just mark hydrated and let the router in.
      if (isDemoModeMeta === 'true') {
        set({
          isDemoMode: true,
          isHydrated: true,
          isCloudInitialized: true,
          accounts,
          methods,
          categories,
          transactions,
          budgets: budgets as Budget[],
          settings: userSettings,
        });
        return;
      }

      let userProfile = null;
      try {
        if (userProfileStr) userProfile = JSON.parse(userProfileStr);
      } catch {
        // Ignore JSON parse errors for user profile
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
        accessToken: session?.accessToken ?? null,
        tokenExpiresAt: session?.expiresAt ?? null,
        userProfile,
        pendingCount: syncQueue ? syncQueue.length : 0,
        isHydrated: true,
        // A prior sync timestamp does not mean this launch has reconciled cloud changes.
        isCloudInitialized: false,
        isDemoMode: false,
      });
    } catch (err) {
      console.error('Failed to initialize from DB:', err);
      set({ isHydrated: true, isCloudInitialized: true });
    }
  },
});
