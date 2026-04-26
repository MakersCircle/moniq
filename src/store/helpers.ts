import { SyncEngine } from '../sync/SyncEngine';

export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/** Helper to notify the SyncEngine about a dirty entity */
export const markDirty = (
  entity: 'transaction' | 'account' | 'method' | 'category' | 'budget' | 'settings',
  entityId: string,
  action: 'create' | 'update' | 'delete'
) => {
  try {
    SyncEngine.getInstance().markDirty(entity, entityId, action);
  } catch {
    // SyncEngine may not be initialized yet (before login)
  }
};
