import { SyncEngine } from '../sync/SyncEngine';
import { useDataStore } from './dataStore';

export const uuid = () => crypto.randomUUID();
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
