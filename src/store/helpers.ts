import { SyncEngine } from '../sync/SyncEngine';
import { useDataStore } from './dataStore';

export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for insecure contexts (like mobile local network testing over HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
export const now = () => new Date().toISOString();

/** Helper to notify the SyncEngine about a dirty entity */
export const markDirty = (
  entity: 'transaction' | 'account' | 'method' | 'category' | 'budget' | 'settings',
  entityId: string,
  action: 'create' | 'update' | 'delete'
) => {
  // In demo mode, the SyncEngine is never initialized and must not be.
  // Calling getInstance() would create it and start its 12-hour backup polling timer.
  if (useDataStore.getState().isDemoMode) return;
  try {
    SyncEngine.getInstance().markDirty(entity, entityId, action);
  } catch {
    // SyncEngine may not be initialized yet (before login)
  }
};
