import type {
  Account,
  PaymentMethod,
  Category,
  Transaction,
  Budget,
  UserSettings,
  SyncStatus,
} from '../types';

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export interface DataState {
  accounts: Account[];
  methods: PaymentMethod[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: UserSettings;
  accessToken: string | null;
  tokenExpiresAt: number | null;

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
  setCloudInitialized: (initialized: boolean) => void;

  // Accounts
  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  archiveAccount: (id: string) => void;
  restoreAccount: (id: string) => void;
  deleteAccount: (id: string) => { success: boolean; reason?: string };

  // Methods
  addMethod: (m: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
  updateMethod: (id: string, patch: Partial<PaymentMethod>) => void;
  archiveMethod: (id: string) => void;
  deleteMethod: (id: string) => { success: boolean; reason?: string };

  // Categories
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
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
  setAccessToken: (token: string | null, expiresAt?: number | null) => void;
  completeOnboarding: (
    accounts?: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>[],
    categories?: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>[]
  ) => void;

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
  isCloudInitialized: boolean;
}
