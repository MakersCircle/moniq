import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Account, PaymentMethod, Category, Transaction, Budget, UserSettings, SyncStatus } from '../types';
import { LedgerEngine } from '../lib/ledger';
import { detectLocalSettings, getCurrencySymbol } from '../constants/currencies';
import { SyncEngine } from '../sync/SyncEngine';
import { 
  getAll, put, del, putMany,
  getSetting, putSetting, getAllSettings,
  getMeta, setMeta, delMeta, clearStore
} from '../lib/db';

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
  initializeFromDB: () => Promise<void>;
  isHydrated: boolean;
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
    isHydrated: false,

    // Cloud actions
    setSpreadsheetId: (id) => set({ spreadsheetId: id }),
    setSyncStatus: (syncStatus, pendingCount, lastSyncError) => set({ syncStatus, pendingCount, lastSyncError }),
    setLastSyncedAt: (timestamp) => set({ lastSyncedAt: timestamp }),

    initializeFromDB: async () => {
      try {
        const [accounts, methods, categories, transactions, budgets, settings, lastSyncedAt, accessToken, userProfileStr] = await Promise.all([
          getAll<Account>('accounts'),
          getAll<PaymentMethod>('methods'),
          getAll<Category>('categories'),
          getAll<Transaction>('transactions'),
          getAll<Budget>('budgets'),
          getAllSettings(),
          getMeta('lastSyncedAt'),
          getMeta('accessToken'),
          getMeta('userProfile'),
        ]);

        let userProfile = null;
        try {
          if (userProfileStr) userProfile = JSON.parse(userProfileStr);
        } catch {}

        const userSettings = { ...defaultSettings };
        if (Object.keys(settings).length > 0) {
          if (settings.currency) userSettings.currency = settings.currency;
          if (settings.currencySymbol) userSettings.currencySymbol = settings.currencySymbol;
          if (settings.numberLocale) userSettings.numberLocale = settings.numberLocale;
          if (settings.fiscalYearStartMonth) userSettings.fiscalYearStartMonth = Number(settings.fiscalYearStartMonth);
          if (settings.dateFormat) userSettings.dateFormat = settings.dateFormat;
          if (settings.hasCompletedOnboarding) userSettings.hasCompletedOnboarding = settings.hasCompletedOnboarding === 'true';
        }

        set({
          accounts,
          methods,
          categories,
          budgets: budgets as Budget[],
          settings: userSettings,
          lastSyncedAt: lastSyncedAt || null,
          accessToken: accessToken || null,
          userProfile,
          isHydrated: true,
        });
      } catch (err) {
        console.error('Failed to initialize from DB:', err);
        set({ isHydrated: true });
      }
    },

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

      // Persist to DB
      const state = useDataStore.getState();
      putMany('accounts', state.accounts);
      putMany('categories', state.categories);
      putMany('methods', state.methods);
      putSetting('hasCompletedOnboarding', 'true');

      markDirty('settings', 'hasCompletedOnboarding', 'update');
    },

    addAccount: (a) => {
      const id = uuid();
      const t = now();
      const methodId = uuid();
      const newAccount = { ...a, id, createdAt: t, updatedAt: t };
      const newMethod = { id: methodId, name: a.name, linkedAccountId: id, isActive: true, createdAt: t, updatedAt: t };
      
      set((state) => ({ 
        accounts: [...state.accounts, newAccount],
        methods: [...state.methods, newMethod]
      }));

      put('accounts', newAccount);
      put('methods', newMethod);
      markDirty('account', id, 'create');
      markDirty('method', methodId, 'create');
    },
    updateAccount: (id, patch) => {
      set((state) => {
        const next = state.accounts.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now() } : s));
        const updated = next.find(a => a.id === id);
        if (updated) put('accounts', updated);
        return { accounts: next };
      });
      markDirty('account', id, 'update');
    },
    archiveAccount: (id) => {
      set((state) => {
        const next = state.accounts.map((s) => (s.id === id ? { ...s, isActive: false, updatedAt: now() } : s));
        const updated = next.find(a => a.id === id);
        if (updated) put('accounts', updated);
        return { accounts: next };
      });
      markDirty('account', id, 'update');
    },
    deleteAccount: (id): { success: boolean; reason?: string } => {
      const state = useDataStore.getState();
      const hasTransactions = state.transactions.some(t => !t.isDeleted && t.entries.some(e => e.accountId === id));
      if (hasTransactions) return { success: false, reason: 'This account is referenced by existing transactions. Archive it instead.' };
      const linkedMethods = state.methods.filter(m => m.linkedAccountId === id);
      const methodsInUse = linkedMethods.filter(m => state.transactions.some(t => !t.isDeleted && t.methodId === m.id));
      if (methodsInUse.length > 0) {
        const names = methodsInUse.map(m => m.name).join(', ');
        return { success: false, reason: `Linked payment method(s) "${names}" are used in transactions. Archive the account instead.` };
      }
      const hasBudgets = state.budgets.some(b => b.categoryId === id);
      if (hasBudgets) return { success: false, reason: 'This account is referenced by a budget. Remove the budget first.' };
      
      const deletedMethodIds = linkedMethods.map(m => m.id);
      set((s) => ({
        accounts: s.accounts.filter(a => a.id !== id),
        methods: s.methods.filter(m => m.linkedAccountId !== id),
      }));

      del('accounts', id);
      for (const mId of deletedMethodIds) del('methods', mId);
      markDirty('account', id, 'delete');
      for (const mId of deletedMethodIds) markDirty('method', mId, 'delete');
      return { success: true };
    },

    // Methods
    addMethod: (m) => {
      const id = uuid();
      const t = now();
      const newMethod = { ...m, id, createdAt: t, updatedAt: t };
      set((state) => ({ methods: [...state.methods, newMethod] }));
      put('methods', newMethod);
      markDirty('method', id, 'create');
    },
    updateMethod: (id, patch) => {
      set((state) => {
        const next = state.methods.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now() } : m));
        const updated = next.find(x => x.id === id);
        if (updated) put('methods', updated);
        return { methods: next };
      });
      markDirty('method', id, 'update');
    },
    archiveMethod: (id) => {
      set((state) => {
        const next = state.methods.map((m) => (m.id === id ? { ...m, isActive: false, updatedAt: now() } : m));
        const updated = next.find(x => x.id === id);
        if (updated) put('methods', updated);
        return { methods: next };
      });
      markDirty('method', id, 'update');
    },
    deleteMethod: (id): { success: boolean; reason?: string } => {
      const state = useDataStore.getState();
      const method = state.methods.find(m => m.id === id);
      if (!method) return { success: false, reason: 'Method not found.' };
      const hasTransactions = state.transactions.some(t => !t.isDeleted && t.methodId === id);
      if (hasTransactions) return { success: false, reason: 'This method is used in existing transactions. Archive it instead.' };
      if (method.linkedAccountId) {
        const otherMethods = state.methods.filter(m => m.id !== id && m.linkedAccountId === method.linkedAccountId && m.isActive);
        if (otherMethods.length === 0) return { success: false, reason: 'This is the only active payment method for its linked account. Create another method first, or unlink and then delete.' };
      }
      set((s) => ({ methods: s.methods.filter(m => m.id !== id) }));
      del('methods', id);
      markDirty('method', id, 'delete');
      return { success: true };
    },

    // Categories
    addCategory: (c) => {
      const id = uuid();
      const t = now();
      const next = { ...c, id, createdAt: t, updatedAt: t };
      set((state) => ({ categories: [...state.categories, next] }));
      put('categories', next);
      markDirty('category', id, 'create');
    },
    updateCategory: (id, patch) => {
      set((state) => {
        const next = state.categories.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c));
        const updated = next.find(x => x.id === id);
        if (updated) put('categories', updated);
        return { categories: next };
      });
      markDirty('category', id, 'update');
    },
    archiveCategory: (id) => {
      set((state) => {
        const next = state.categories.map((c) => (c.id === id ? { ...c, isActive: false, updatedAt: now() } : c));
        const updated = next.find(x => x.id === id);
        if (updated) put('categories', updated);
        return { categories: next };
      });
      markDirty('category', id, 'update');
    },
    deleteCategory: (id): { success: boolean; reason?: string } => {
      const state = useDataStore.getState();
      const hasTransactions = state.transactions.some(t => !t.isDeleted && t.entries.some(e => e.accountId === id));
      if (hasTransactions) return { success: false, reason: 'This category is referenced by existing transactions.' };
      const hasBudgets = state.budgets.some(b => b.categoryId === id);
      if (hasBudgets) return { success: false, reason: 'This category has a budget assigned. Remove the budget first.' };
      
      set((s) => ({ categories: s.categories.filter(c => c.id !== id) }));
      del('categories', id);
      markDirty('category', id, 'delete');
      return { success: true };
    },

    // Transactions
    addTransaction: (params) => {
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

      set((state) => ({
        transactions: [txn, ...state.transactions],
      }));
      put('transactions', txn);
      markDirty('transaction', id, 'create');
    },

    updateTransaction: (id, patch) => {
      set((state) => {
        const next = state.transactions.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: now() } : t
        );
        const updated = next.find(x => x.id === id);
        if (updated) put('transactions', updated);
        return { transactions: next };
      });
      markDirty('transaction', id, 'update');
    },
    deleteTransaction: (id) => {
      set((state) => {
        const next = state.transactions.map((t) =>
          t.id === id ? { ...t, isDeleted: true, updatedAt: now() } : t
        );
        const updated = next.find(x => x.id === id);
        if (updated) put('transactions', updated);
        return { transactions: next };
      });
      markDirty('transaction', id, 'update');
    },

    // Budgets
    updateBudget: (categoryId, period, amount) => {
      set((state) => {
        const existingIdx = state.budgets.findIndex(b => b.categoryId === categoryId && b.period === period);
        const t = now();
        if (existingIdx >= 0) {
          const next = [...state.budgets];
          next[existingIdx] = { ...next[existingIdx], amount, updatedAt: t };
          put('budgets', next[existingIdx]);
          markDirty('budget', next[existingIdx].id, 'update');
          return { budgets: next };
        }
        const id = uuid();
        const next = { id, categoryId, period, amount, createdAt: t, updatedAt: t };
        put('budgets', next);
        markDirty('budget', id, 'create');
        return { budgets: [...state.budgets, next] };
      });
    },

    // Settings
    updateSettings: (patch) => {
      set((state) => {
        const nextSettings = { ...state.settings, ...patch };
        if (patch.currency && patch.currency !== state.settings.currency) {
          nextSettings.currencySymbol = getCurrencySymbol(patch.currency, nextSettings.numberLocale);
        }
        for (const [k, v] of Object.entries(patch)) {
          putSetting(k, String(v));
        }
        return { settings: nextSettings };
      });
      markDirty('settings', 'settings', 'update');
    },
    setAccessToken: (token) => {
      set(() => ({ accessToken: token }));
      if (token) setMeta('accessToken', token);
      else delMeta('accessToken'); // Assuming we have or will add delMeta
    },
    setUserProfile: (profile) => {
      set({ userProfile: profile });
      if (profile) setMeta('userProfile', JSON.stringify(profile));
      else delMeta('userProfile');
    },

    // Hydrate from SyncEngine reconciliation
    hydrateFromSync: (data) => {
      set((state) => {
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
            else if (key === 'hasCompletedOnboarding') current.hasCompletedOnboarding = value === 'true';
          }
          nextState.settings = current;
        }

        nextState.lastSyncedAt = new Date().toISOString();
        return nextState;
      });
    },
    resetData: () => {
      ['accounts', 'methods', 'categories', 'transactions', 'budgets', 'settings', 'meta', 'sync_queue', 'remote_snapshot'].forEach(s => clearStore(s as any));
      
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
  })
);
