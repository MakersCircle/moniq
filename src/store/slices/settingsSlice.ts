import type { StateCreator } from 'zustand';
import type { DataState, UserProfile } from '../types';
import type { UserSettings } from '@/types';
import { markDirty } from '../helpers';
import { detectLocalSettings, getCurrencySymbol } from '@/constants/currencies';
import { putSetting, setMeta, delMeta } from '@/lib/db';

const detected = detectLocalSettings();

export const defaultSettings: UserSettings = {
  currency: detected.currency,
  currencySymbol: detected.symbol,
  numberLocale: detected.locale,
  fiscalYearStartMonth: detected.currency === 'INR' ? 4 : 1,
  dateFormat: detected.currency === 'INR' ? 'dd/MM/yyyy' : 'MM/dd/yyyy',
};

export interface SettingsSlice {
  settings: UserSettings;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  userProfile: UserProfile | null;

  updateSettings: (patch: Partial<UserSettings>) => void;
  setAccessToken: (token: string | null, expiresAt?: number | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
}

export const createSettingsSlice: StateCreator<DataState, [], [], SettingsSlice> = set => ({
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
});
