import type { StateCreator } from 'zustand';
import type { DataState, UserProfile } from '../types';
import type { UserSettings } from '@/types';
import { markDirty } from '../helpers';
import { getCurrencySymbol } from '@/constants/currencies';
import { putSetting, setMeta, delMeta } from '@/lib/db';

import { saveAccessTokenSession } from '@/lib/accessTokenStorage';
import { createDefaultSettings } from '@/lib/userSettings';

export const defaultSettings = createDefaultSettings();

export interface SettingsSlice {
  settings: UserSettings;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  verifiedAccessToken: string | null;
  isWorkspaceUnlocked: boolean;
  isDeviceTrusted: boolean;
  setDeviceTrusted: (trusted: boolean) => Promise<void>;
  setVerifiedAccessToken: (token: string) => void;
  userProfile: UserProfile | null;

  updateSettings: (patch: Partial<UserSettings>) => void;
  setAccessToken: (token: string | null, expiresAt?: number | null) => void;
  expireSession: () => void;
  setUserProfile: (profile: UserProfile | null) => void;
}

export const createSettingsSlice: StateCreator<DataState, [], [], SettingsSlice> = (set, get) => ({
  settings: defaultSettings,
  accessToken: null,
  tokenExpiresAt: null,
  verifiedAccessToken: null,
  isWorkspaceUnlocked: false,
  isDeviceTrusted: false,
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
      verifiedAccessToken: null,
      isCloudInitialized: false,
    }));
    saveAccessTokenSession(token && expiresAt ? { accessToken: token, expiresAt } : null);
    // Remove durable credentials left by releases before session-scoped storage.
    void delMeta('accessToken');
    void delMeta('tokenExpiresAt');
  },

  expireSession: () => {
    set(() => ({
      accessToken: null,
      tokenExpiresAt: null,
      verifiedAccessToken: null,
      isCloudInitialized: false,
    }));
    saveAccessTokenSession(null);
    void delMeta('accessToken');
    void delMeta('tokenExpiresAt');
  },

  setVerifiedAccessToken: token => {
    if (get().accessToken === token) set({ verifiedAccessToken: token, isWorkspaceUnlocked: true });
  },

  setDeviceTrusted: async trusted => {
    const state = get();
    if (trusted && (!state.isWorkspaceUnlocked || !state.userProfile?.email)) return;
    set({ isDeviceTrusted: trusted });
    try {
      if (trusted) await setMeta('trustedDeviceEmail', state.userProfile!.email);
      else await delMeta('trustedDeviceEmail');
    } catch (error) {
      if (get().userProfile?.email === state.userProfile?.email) {
        set({ isDeviceTrusted: state.isDeviceTrusted });
      }
      throw error;
    }
  },

  setUserProfile: profile => {
    set({
      userProfile: profile,
      ...(profile ? {} : { verifiedAccessToken: null, isWorkspaceUnlocked: false }),
    });
    if (profile) setMeta('userProfile', JSON.stringify(profile));
    else delMeta('userProfile');
  },
});
