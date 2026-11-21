import type { DataState } from '@/store/types';

/** Local access survives Google authorization expiry, until an explicit sign-out. */
export function hasLocalWorkspace(
  state: Pick<DataState, 'userProfile' | 'spreadsheetId' | 'lastSyncedAt'>
): boolean {
  return !!(state.userProfile?.email && state.spreadsheetId && state.lastSyncedAt);
}

/** Preserve edits made after a background sync took its local snapshot. */
export function preserveLocalEdits<T extends { id: string }>(
  merged: T[],
  snapshot: T[],
  current: T[]
): T[] {
  const before = new Map(snapshot.map(item => [item.id, item]));
  const result = new Map(merged.map(item => [item.id, item]));
  for (const item of current) {
    if (before.get(item.id) !== item) result.set(item.id, item);
  }
  const currentIds = new Set(current.map(item => item.id));
  for (const item of snapshot) {
    if (!currentIds.has(item.id)) result.delete(item.id);
  }
  return [...result.values()];
}
