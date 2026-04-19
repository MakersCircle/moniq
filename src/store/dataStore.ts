import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Account, PaymentMethod, Category, Transaction, Budget, UserSettings, SyncStatus } from '../types';
import { LedgerEngine } from '../lib/ledger';
import { detectLocalSettings, getCurrencySymbol } from '../constants/currencies';
import { idbStorage } from '../lib/idbStorage';
import { SyncEngine } from '../sync/SyncEngine';

// ── Default settings & helpers ─────────────────────────────────

const detected = detectLocalSettings();

const defaultSettings: UserSettings = {
  currency: detected.currency,
  currencySymbol: detected.symbol,
  numberLocale: detected.locale,
  fiscalYearStartMonth: detected.currency === 'INR' ? 4 : 1, // April for India, Jan for others
  dateFormat: detected.currency === 'INR' ? 'dd/MM/yyyy' : 'MM/dd/yyyy',
  hasCompletedOnboarding: false,
};

// ── Store interface ──────────────────────────────────────────

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface DataState {
  accounts: Account[];
  methods: PaymentMethod[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: UserSettings;
  accessToken: string | null;
  
  // Cloud Sync properties
  userProfile: UserProfile | null;
  spreadsheetId: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncError: string | undefined;

  // Cloud Actions
  setUserProfile: (profile: UserProfile | null) => void;
  setSpreadsheetId: (id: string | null) => void;
  setSyncStatus: (status: SyncStatus, pendingCount: number, error?: string) => void;
  setLastSyncedAt: (timestamp: string) => void;

  // Accounts
  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  archiveAccount: (id: string) => void;
  deleteAccount: (id: string) => { success: boolean; reason?: string };

  // Methods
  addMethod: (m: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMethod: (id: string, patch: Partial<PaymentMethod>) => void;
  archiveMethod: (id: string) => void;
  deleteMethod: (id: string) => { success: boolean; reason?: string };

  // Categories
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  archiveCategory: (id: string) => void;
  deleteCategory: (id: string) => { success: boolean; reason?: string };

  // Transactions
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

  // Budgets
  updateBudget: (categoryId: string, period: string, amount: number) => void;

  // Settings
  updateSettings: (patch: Partial<UserSettings>) => void;
  setAccessToken: (token: string | null) => void;
  completeOnboarding: (accounts?: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[], categories?: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[]) => void;

  // Sync Engine
  hydrateFromSync: (data: {
    accounts: Account[];
    methods: PaymentMethod[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    settings: Record<string, string>;
  }) => void;
  resetData: () => void;
}

export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/** Helper to notify the SyncEngine about a dirty entity */
const markDirty = (entity: 'transaction' | 'account' | 'method' | 'category' | 'budget' | 'settings', entityId: string, action: 'create' | 'update' | 'delete') => {
  try {
    SyncEngine.getInstance().markDirty(entity, entityId, action);
  } catch {
    // SyncEngine may not be initialized yet (before login)
  }
};

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      accounts: [] as Account[],
      methods: [] as PaymentMethod[],
      categories: [] as Category[],
      transactions: [] as Transaction[],
      budgets: [] as Budget[],
      settings: defaultSettings,
      accessToken: null,
      userProfile: null,
      spreadsheetId: null,
      lastSyncedAt: null,
      syncStatus: 'idle' as SyncStatus,
      pendingCount: 0,
      lastSyncError: undefined,

      // Cloud actions
      setUserProfile: (profile) => set({ userProfile: profile }),
      setSpreadsheetId: (id) => set({ spreadsheetId: id }),
      setSyncStatus: (syncStatus, pendingCount, lastSyncError) => set({ syncStatus, pendingCount, lastSyncError }),
      setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),

      completeOnboarding: (accs, cats) => {
        set((state) => {
          const t = now();
          const newAccounts = (accs || []).map(a => ({ ...a, id: uuid(), createdAt: t, updatedAt: t } as Account));
          const newCategories = (cats || []).map(c => ({ ...c, id: uuid(), createdAt: t, updatedAt: t } as Category));
          const newMethods = newAccounts.map(a => ({ id: uuid(), name: `${a.name}`, linkedAccountId: a.id, isActive: true, createdAt: t, updatedAt: t } as PaymentMethod));
          
          // Mark all new entities dirty
          for (const a of newAccounts) markDirty('account', a.id, 'create');
          for (const c of newCategories) markDirty('category', c.id, 'create');
          for (const m of newMethods) markDirty('method', m.id, 'create');

          return {
            accounts: [...state.accounts, ...newAccounts],
            categories: [...state.categories, ...newCategories],
            methods: [...state.methods, ...newMethods],
            settings: { ...state.settings, hasCompletedOnboarding: true }
          };
        });
        markDirty('settings', 'hasCompletedOnboarding', 'update');
      },

      addAccount: (a) => {
        const id = uuid();
        const t = now();
        const methodId = uuid();
        set((state) => ({ 
          accounts: [...state.accounts, { ...a, id, createdAt: t, updatedAt: t }],
          methods: [...state.methods, { id: methodId, name: a.name, linkedAccountId: id, isActive: true, createdAt: t, updatedAt: t }]
        }));
        markDirty('account', id, 'create');
        markDirty('method', methodId, 'create');
      },
      updateAccount: (id, patch) => {
        set((state) => ({ accounts: state.accounts.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now() } : s)) }));
        markDirty('account', id, 'update');
      },
      archiveAccount: (id) => {
        set((state) => ({ accounts: state.accounts.map((s) => (s.id === id ? { ...s, isActive: false, updatedAt: now() } : s)) }));
        markDirty('account', id, 'update');
      },
      deleteAccount: (id): { success: boolean; reason?: string } => {
        const state = useDataStore.getState();
        // Check if any non-deleted transaction references this account in its entries
        const hasTransactions = state.transactions.some(t => !t.isDeleted && t.entries.some(e => e.accountId === id));
        if (hasTransactions) return { success: false, reason: 'This account is referenced by existing transactions. Archive it instead.' };
        // Check if any linked payment methods are referenced by transactions
        const linkedMethods = state.methods.filter(m => m.linkedAccountId === id);
        const methodsInUse = linkedMethods.filter(m => state.transactions.some(t => !t.isDeleted && t.methodId === m.id));
        if (methodsInUse.length > 0) {
          const names = methodsInUse.map(m => m.name).join(', ');
          return { success: false, reason: `Linked payment method(s) "${names}" are used in transactions. Archive the account instead.` };
        }
        // Check if any budgets reference this account
        const hasBudgets = state.budgets.some(b => b.categoryId === id);
        if (hasBudgets) return { success: false, reason: 'This account is referenced by a budget. Remove the budget first.' };
        // Safe to delete — cascade-remove all linked payment methods too
        const deletedMethodIds = linkedMethods.map(m => m.id);
        set((s) => ({
          accounts: s.accounts.filter(a => a.id !== id),
          methods: s.methods.filter(m => m.linkedAccountId !== id),
        }));
        markDirty('account', id, 'delete');
        for (const mId of deletedMethodIds) markDirty('method', mId, 'delete');
        return { success: true };
      },

      // Methods
      addMethod: (m) => {
        const id = uuid();
        const t = now();
        set((state) => ({ methods: [...state.methods, { ...m, id, createdAt: t, updatedAt: t }] }));
        markDirty('method', id, 'create');
      },
      updateMethod: (id, patch) => {
        set((state) => ({ methods: state.methods.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now() } : m)) }));
        markDirty('method', id, 'update');
      },
      archiveMethod: (id) => {
        set((state) => ({ methods: state.methods.map((m) => (m.id === id ? { ...m, isActive: false, updatedAt: now() } : m)) }));
        markDirty('method', id, 'update');
      },
      deleteMethod: (id): { success: boolean; reason?: string } => {
        const state = useDataStore.getState();
        const method = state.methods.find(m => m.id === id);
        if (!method) return { success: false, reason: 'Method not found.' };
        // Check if any non-deleted transaction references this method
        const hasTransactions = state.transactions.some(t => !t.isDeleted && t.methodId === id);
        if (hasTransactions) return { success: false, reason: 'This method is used in existing transactions. Archive it instead.' };
        // If linked to an account, check if that account has at least one other active method
        if (method.linkedAccountId) {
          const otherMethods = state.methods.filter(m => m.id !== id && m.linkedAccountId === method.linkedAccountId && m.isActive);
          if (otherMethods.length === 0) return { success: false, reason: 'This is the only active payment method for its linked account. Create another method first, or unlink and then delete.' };
        }
        // Safe to delete
        set((s) => ({ methods: s.methods.filter(m => m.id !== id) }));
        markDirty('method', id, 'delete');
        return { success: true };
      },

      // Categories
      addCategory: (c) => {
        const id = uuid();
        const t = now();
        set((state) => ({ categories: [...state.categories, { ...c, id, createdAt: t, updatedAt: t }] }));
        markDirty('category', id, 'create');
      },
      updateCategory: (id, patch) => {
        set((state) => ({ categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)) }));
        markDirty('category', id, 'update');
      },
      archiveCategory: (id) => {
        set((state) => ({ categories: state.categories.map((c) => (c.id === id ? { ...c, isActive: false, updatedAt: now() } : c)) }));
        markDirty('category', id, 'update');
      },
      deleteCategory: (id): { success: boolean; reason?: string } => {
        const state = useDataStore.getState();
        // Check if any non-deleted transaction references this category in its entries
        const hasTransactions = state.transactions.some(t => !t.isDeleted && t.entries.some(e => e.accountId === id));
        if (hasTransactions) return { success: false, reason: 'This category is referenced by existing transactions.' };
        // Check if any budgets reference this category
        const hasBudgets = state.budgets.some(b => b.categoryId === id);
        if (hasBudgets) return { success: false, reason: 'This category has a budget assigned. Remove the budget first.' };
        // Safe to delete
        set((s) => ({ categories: s.categories.filter(c => c.id !== id) }));
        markDirty('category', id, 'delete');
        return { success: true };
      },

      // Transactions
      addTransaction: (params) => {
        const { date, uiType, amount, accountId, targetId, methodId, note, tags } = params;
        const entries = LedgerEngine.createEntries({ type: uiType, amount, accountId, targetId });
        const id = uuid();
        const t = now();
        
        set((state) => ({
          transactions: [
            ...state.transactions,
            { 
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
            },
          ],
        }));
        markDirty('transaction', id, 'create');
      },

      updateTransaction: (id, patch) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: now() } : t
          ),
        }));
        markDirty('transaction', id, 'update');
      },
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, isDeleted: true, updatedAt: now() } : t
          ),
        }));
        markDirty('transaction', id, 'update'); // Soft delete = update
      },

      // Budgets
      updateBudget: (categoryId, period, amount) => {
        set((state) => {
          const existingIdx = state.budgets.findIndex(b => b.categoryId === categoryId && b.period === period);
          const t = now();
          if (existingIdx >= 0) {
            const next = [...state.budgets];
            const existingId = next[existingIdx].id;
            next[existingIdx] = { ...next[existingIdx], amount, updatedAt: t };
            markDirty('budget', existingId, 'update');
            return { budgets: next };
          }
          const id = uuid();
          markDirty('budget', id, 'create');
          return { budgets: [...state.budgets, { id, categoryId, period, amount, createdAt: t, updatedAt: t }] };
        });
      },

      // Settings
      updateSettings: (patch) => {
        set((state) => {
          const nextSettings = { ...state.settings, ...patch };
          
          // Automatically update symbol if currency code changed
          if (patch.currency && patch.currency !== state.settings.currency) {
            nextSettings.currencySymbol = getCurrencySymbol(patch.currency, nextSettings.numberLocale);
          }
          
          return { settings: nextSettings };
        });
        markDirty('settings', 'settings', 'update');
      },
      setAccessToken: (token) =>
        set(() => ({ accessToken: token })),

      // Hydrate from SyncEngine reconciliation
      hydrateFromSync: (data) => {
        set((state) => {
          const nextState: Partial<DataState> = {};

          if (data.accounts.length > 0 || state.accounts.length === 0) {
            nextState.accounts = data.accounts;
          }
          if (data.methods.length > 0 || state.methods.length === 0) {
            nextState.methods = data.methods;
          }
          if (data.categories.length > 0 || state.categories.length === 0) {
            nextState.categories = data.categories;
          }
          if (data.transactions.length > 0 || state.transactions.length === 0) {
            nextState.transactions = data.transactions;
          }
          if (data.budgets.length > 0 || state.budgets.length === 0) {
            nextState.budgets = data.budgets;
          }

          // Merge remote settings if present
          if (Object.keys(data.settings).length > 0) {
            const remoteSettings: Partial<UserSettings> = {};
            for (const [key, value] of Object.entries(data.settings)) {
              if (key === 'currency') remoteSettings.currency = value;
              else if (key === 'currencySymbol') remoteSettings.currencySymbol = value;
              else if (key === 'numberLocale') remoteSettings.numberLocale = value;
              else if (key === 'fiscalYearStartMonth') remoteSettings.fiscalYearStartMonth = Number(value);
              else if (key === 'dateFormat') remoteSettings.dateFormat = value;
              else if (key === 'hasCompletedOnboarding') remoteSettings.hasCompletedOnboarding = value === 'true';
            }
            nextState.settings = { ...state.settings, ...remoteSettings };
          }

          nextState.lastSyncedAt = new Date().toISOString();

          return nextState;
        });
      },
      resetData: () => {
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
    }),
    { 
      name: 'moniq-data',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
