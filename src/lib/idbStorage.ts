import type { StateStorage } from 'zustand/middleware';
import { getDB } from './db';

/**
 * Custom Zustand persist storage adapter backed by IndexedDB.
 * 
 * Zustand's persist middleware expects a StateStorage interface with
 * getItem / setItem / removeItem. This adapter stores the serialized
 * Zustand state in the IDB `meta` store under a single key.
 * 
 * This replaces the default localStorage adapter and removes the ~5MB cap.
 */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB();
      const result = await db.get('meta', name);
      return result?.value ?? null;
    } catch (err) {
      console.warn('[idbStorage] getItem failed, returning null:', err);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB();
      await db.put('meta', { key: name, value });
    } catch (err) {
      console.error('[idbStorage] setItem failed:', err);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB();
      await db.delete('meta', name);
    } catch (err) {
      console.error('[idbStorage] removeItem failed:', err);
    }
  },
};
