import type { StateCreator } from 'zustand';
import type { DataState, UserProfile } from '../types';
import type { UserSettings, Account, Category, PaymentMethod } from '../../types';
import { uuid, now, markDirty } from '../helpers';
import { detectLocalSettings, getCurrencySymbol } from '../../constants/currencies';
import { putMany, putSetting, setMeta, delMeta } from '../../lib/db';

const detected = detectLocalSettings();

export const defaultSettings: UserSettings = {
  currency: detected.currency,
  currencySymbol: detected.symbol,
  numberLocale: detected.locale,
  fiscalYearStartMonth: detected.currency === 'INR' ? 4 : 1,
  dateFormat: detected.currency === 'INR' ? 'dd/MM/yyyy' : 'MM/dd/yyyy',
  hasCompletedOnboarding: false,
};

export interface SettingsSlice {
  settings: UserSettings;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  userProfile: UserProfile | null;

  updateSettings: (patch: Partial<UserSettings>) => void;
  setAccessToken: (token: string | null, expiresAt?: number | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  completeOnboarding: (
    accounts?: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>[],
    categories?: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>[]
  ) => void;
}

export const createSettingsSlice: StateCreator<DataState, [], [], SettingsSlice> = (set, get) => ({
  settings: defaultSettings,
  accessToken: null,
  tokenExpiresAt: null,
  userProfile: null,

  updateSettings: patch => {
    set(state => {
      const nextSettings = { ...state.settings, ...patch };

      const currencyChanged = patch.currency && patch.currency !== state.settings.currency;
      const localeChanged =
        patch.numberLocale && patch.numberLocale !== state.settings.numberLocale;

      if (currencyChanged || localeChanged) {
        nextSettings.currencySymbol = getCurrencySymbol(
          nextSettings.currency,
          nextSettings.numberLocale
        );
        putSetting('currencySymbol', nextSettings.currencySymbol);
      }

      for (const [k, v] of Object.entries(patch)) {
        putSetting(k, String(v));
      }
      return { settings: nextSettings };
    });
    markDirty('settings', 'settings', 'update');
  },

  setAccessToken: (token, expiresAt) => {
    set(() => ({
      accessToken: token,
      tokenExpiresAt: expiresAt || null,
    }));
    if (token) {
      setMeta('accessToken', token);
      if (expiresAt) setMeta('tokenExpiresAt', String(expiresAt));
    } else {
      delMeta('accessToken');
      delMeta('tokenExpiresAt');
    }
    if (!token) {
      set({ isCloudInitialized: false });
    }
  },

  setUserProfile: profile => {
    set({ userProfile: profile });
    if (profile) setMeta('userProfile', JSON.stringify(profile));
    else delMeta('userProfile');
  },

  completeOnboarding: (accs, cats) => {
    set(state => {
      const t = now();
      const newAccounts = (accs || []).map(
        a =>
          ({
            ...a,
            id: uuid(),
            isActive: true,
            isDeleted: false,
            createdAt: t,
            updatedAt: t,
          }) as Account
      );
      const newCategories = (cats || []).map(
        c =>
          ({
            ...c,
            id: uuid(),
            isActive: true,
            isDeleted: false,
            createdAt: t,
            updatedAt: t,
          }) as Category
      );
      const newMethods = newAccounts.map(
        a =>
          ({
            id: uuid(),
            name: `${a.name}`,
            linkedAccountId: a.id,
            isActive: true,
            isDeleted: false,
            createdAt: t,
            updatedAt: t,
          }) as PaymentMethod
      );

      for (const a of newAccounts) markDirty('account', a.id, 'create');
      for (const c of newCategories) markDirty('category', c.id, 'create');
      for (const m of newMethods) markDirty('method', m.id, 'create');

      return {
        accounts: [...state.accounts, ...newAccounts],
        categories: [...state.categories, ...newCategories],
        methods: [...state.methods, ...newMethods],
        settings: { ...state.settings, hasCompletedOnboarding: true },
      };
    });

    const state = get();
    putMany('accounts', state.accounts);
    putMany('categories', state.categories);
    putMany('methods', state.methods);
    putSetting('hasCompletedOnboarding', 'true');

    markDirty('settings', 'hasCompletedOnboarding', 'update');
  },
});
