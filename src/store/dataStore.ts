import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Source, PaymentMethod, Category, Transaction, Budget, UserSettings } from '../types';

// ── Default seed data for first-time users ──────────────────

const defaultSources: Source[] = [
  { id: 'src-1', name: 'Bank Account', type: 'Bank', initialBalance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
  { id: 'src-2', name: 'Cash Wallet', type: 'Cash', initialBalance: 0, currency: 'INR', isActive: true, createdAt: new Date().toISOString() },
];

const defaultMethods: PaymentMethod[] = [
  { id: 'met-1', name: 'UPI', linkedSourceId: 'src-1', isActive: true, createdAt: new Date().toISOString() },
  { id: 'met-2', name: 'Cash', linkedSourceId: 'src-2', isActive: true, createdAt: new Date().toISOString() },
  { id: 'met-3', name: 'Debit Card', linkedSourceId: 'src-1', isActive: true, createdAt: new Date().toISOString() },
  { id: 'met-4', name: 'Credit Card', isActive: true, createdAt: new Date().toISOString() },
  { id: 'met-5', name: 'Net Banking', linkedSourceId: 'src-1', isActive: true, createdAt: new Date().toISOString() },
];

const defaultCategories: Category[] = [
  // Needs
  { id: 'cat-1', group: 'Needs', head: 'Food', subHead: 'Groceries', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-2', group: 'Needs', head: 'Food', subHead: 'Dining Out', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-3', group: 'Needs', head: 'Transport', subHead: 'Fuel', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-4', group: 'Needs', head: 'Transport', subHead: 'Cab / Auto', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-5', group: 'Needs', head: 'Utilities', subHead: 'Electricity', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-6', group: 'Needs', head: 'Utilities', subHead: 'Internet', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-7', group: 'Needs', head: 'Housing', subHead: 'Rent', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-8', group: 'Needs', head: 'Health', subHead: 'Medicine', isActive: true, createdAt: new Date().toISOString() },
  // Wants
  { id: 'cat-9',  group: 'Wants', head: 'Entertainment', subHead: 'OTT/Streaming', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-10', group: 'Wants', head: 'Entertainment', subHead: 'Movies', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-11', group: 'Wants', head: 'Shopping', subHead: 'Clothing', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-12', group: 'Wants', head: 'Shopping', subHead: 'Electronics', isActive: true, createdAt: new Date().toISOString() },
  // Savings / Investment
  { id: 'cat-13', group: 'Savings',    head: 'Savings', subHead: 'Emergency Fund', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-14', group: 'Investment', head: 'Investment', subHead: 'Mutual Funds', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-15', group: 'Investment', head: 'Investment', subHead: 'Stocks', isActive: true, createdAt: new Date().toISOString() },
  // Debt
  { id: 'cat-16', group: 'Debt', head: 'Debt', subHead: 'Loan EMI', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-17', group: 'Debt', head: 'Debt', subHead: 'Credit Card Bill', isActive: true, createdAt: new Date().toISOString() },
  // Income
  { id: 'cat-18', group: 'Income', head: 'Income', subHead: 'Salary', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-19', group: 'Income', head: 'Income', subHead: 'Freelance', isActive: true, createdAt: new Date().toISOString() },
  { id: 'cat-20', group: 'Income', head: 'Income', subHead: 'Other', isActive: true, createdAt: new Date().toISOString() },
];

const defaultSettings: UserSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  fiscalYearStartMonth: 4, // April (common in India)
  dateFormat: 'dd/MM/yyyy',
};

// ── Store interface ──────────────────────────────────────────

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface DataState {
  sources: Source[];
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
  isSyncing: boolean;

  // Cloud Actions
  setUserProfile: (profile: UserProfile | null) => void;
  setSpreadsheetId: (id: string | null) => void;
  setSyncState: (lastSyncedAt: string | null, isSyncing: boolean) => void;

  // Sources
  addSource: (s: Omit<Source, 'id' | 'createdAt'>) => void;
  updateSource: (id: string, patch: Partial<Source>) => void;
  archiveSource: (id: string) => void;

  // Methods
  addMethod: (m: Omit<PaymentMethod, 'id' | 'createdAt'>) => void;
  updateMethod: (id: string, patch: Partial<PaymentMethod>) => void;
  archiveMethod: (id: string) => void;

  // Categories
  addCategory: (c: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  archiveCategory: (id: string) => void;

  // Transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'groupId' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  addTransactionGroup: (txns: Omit<Transaction, 'id' | 'groupId' | 'createdAt' | 'updatedAt' | 'isDeleted'>[]) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Budgets
  updateBudget: (categoryId: string, period: string, amount: number) => void;

  // Settings
  updateSettings: (patch: Partial<UserSettings>) => void;
  setAccessToken: (token: string | null) => void;
  triggerSync: () => Promise<void>;
}

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      sources: defaultSources,
      methods: defaultMethods,
      categories: defaultCategories,
      transactions: [],
      budgets: [],
      settings: defaultSettings,
      accessToken: null,
      userProfile: null,
      spreadsheetId: null,
      lastSyncedAt: null,
      isSyncing: false,

      // Cloud actions
      setUserProfile: (profile) => set({ userProfile: profile }),
      setSpreadsheetId: (id) => set({ spreadsheetId: id }),
      setSyncState: (lastSyncedAt, isSyncing) => set({ lastSyncedAt, isSyncing }),

      // Sources
      addSource: (s) => {
        set((state) => ({ sources: [...state.sources, { ...s, id: uuid(), createdAt: now() }] }));
        useDataStore.getState().triggerSync();
      },
      updateSource: (id, patch) => {
        set((state) => ({ sources: state.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
        useDataStore.getState().triggerSync();
      },
      archiveSource: (id) => {
        set((state) => ({ sources: state.sources.map((s) => (s.id === id ? { ...s, isActive: false } : s)) }));
        useDataStore.getState().triggerSync();
      },

      // Methods
      addMethod: (m) => {
        set((state) => ({ methods: [...state.methods, { ...m, id: uuid(), createdAt: now() }] }));
        useDataStore.getState().triggerSync();
      },
      updateMethod: (id, patch) => {
        set((state) => ({ methods: state.methods.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
        useDataStore.getState().triggerSync();
      },
      archiveMethod: (id) => {
        set((state) => ({ methods: state.methods.map((m) => (m.id === id ? { ...m, isActive: false } : m)) }));
        useDataStore.getState().triggerSync();
      },

      // Categories
      addCategory: (c) => {
        set((state) => ({ categories: [...state.categories, { ...c, id: uuid(), createdAt: now() }] }));
        useDataStore.getState().triggerSync();
      },
      updateCategory: (id, patch) => {
        set((state) => ({ categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        useDataStore.getState().triggerSync();
      },
      archiveCategory: (id) => {
        set((state) => ({ categories: state.categories.map((c) => (c.id === id ? { ...c, isActive: false } : c)) }));
        useDataStore.getState().triggerSync();
      },

      // Transactions
      addTransaction: (t) => {
        set((state) => ({
          transactions: [
            ...state.transactions,
            { ...t, id: uuid(), groupId: uuid(), isDeleted: false, createdAt: now(), updatedAt: now() },
          ],
        }));
        useDataStore.getState().triggerSync();
      },
      addTransactionGroup: (txns) => {
        const groupId = uuid();
        const ts = now();
        set((state) => ({
          transactions: [
            ...state.transactions,
            ...txns.map((t) => ({ ...t, id: uuid(), groupId, isDeleted: false, createdAt: ts, updatedAt: ts })),
          ],
        }));
        useDataStore.getState().triggerSync();
      },
      updateTransaction: (id, patch) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: now() } : t
          ),
        }));
        useDataStore.getState().triggerSync();
      },
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, isDeleted: true, updatedAt: now() } : t
          ),
        }));
        useDataStore.getState().triggerSync();
      },

      // Budgets
      updateBudget: (categoryId, period, amount) => {
        set((state) => {
          const existingIdx = state.budgets.findIndex(b => b.categoryId === categoryId && b.period === period);
          if (existingIdx >= 0) {
            const next = [...state.budgets];
            next[existingIdx] = { ...next[existingIdx], amount };
            return { budgets: next };
          }
          return { budgets: [...state.budgets, { id: uuid(), categoryId, period, amount, createdAt: now() }] };
        });
        useDataStore.getState().triggerSync();
      },

      // Settings
      updateSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
        useDataStore.getState().triggerSync();
      },
      setAccessToken: (token) =>
        set(() => ({ accessToken: token })),

      triggerSync: async () => {
        const state = useDataStore.getState();
        if (!state.accessToken || !state.spreadsheetId || state.isSyncing) return;
        
        const { syncDataToGoogleSheets } = await import('../api/google');
        
        set({ isSyncing: true });
        try {
          await syncDataToGoogleSheets(state.accessToken, state.spreadsheetId, state);
          set({ lastSyncedAt: new Date().toISOString(), isSyncing: false });
        } catch (err) {
          console.error("Auto-sync failed:", err);
          set({ isSyncing: false });
        }
      }
    }),
    { name: 'moniq-data' }
  )
);
