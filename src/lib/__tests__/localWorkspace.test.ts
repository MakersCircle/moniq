import { describe, expect, it } from 'vitest';
import { hasLocalWorkspace, preserveLocalEdits } from '../localWorkspace';

describe('local workspace continuity', () => {
  it('requires an established account and prior sync, independently of Google tokens', () => {
    const workspace = {
      userProfile: { name: 'User', email: 'user@example.test', picture: '' },
      spreadsheetId: 'sheet',
      lastSyncedAt: '2026-10-22',
      isWorkspaceUnlocked: false,
      isDeviceTrusted: true,
    };
    expect(hasLocalWorkspace(workspace)).toBe(true);
    expect(hasLocalWorkspace({ ...workspace, isDeviceTrusted: false })).toBe(false);
    expect(
      hasLocalWorkspace({ ...workspace, isDeviceTrusted: false, isWorkspaceUnlocked: true })
    ).toBe(true);
    expect(hasLocalWorkspace({ ...workspace, userProfile: null })).toBe(false);
    expect(hasLocalWorkspace({ ...workspace, lastSyncedAt: null })).toBe(false);
    expect(hasLocalWorkspace({ ...workspace, spreadsheetId: null })).toBe(false);
  });

  it('keeps edits and additions during sync while accepting unchanged remote updates', () => {
    const original = { id: 'one', name: 'Old' };
    const unchanged = { id: 'two', name: 'Unchanged' };
    const edited = { ...original, name: 'Edited locally' };
    const added = { id: 'three', name: 'Added locally' };
    const remote = { id: 'four', name: 'Remote only' };
    expect(
      preserveLocalEdits(
        [{ ...original, name: 'Remote' }, { ...unchanged, name: 'Updated remotely' }, remote],
        [original, unchanged],
        [edited, unchanged, added]
      )
    ).toEqual([edited, { ...unchanged, name: 'Updated remotely' }, remote, added]);
  });

  it('does not resurrect a record removed during sync', () => {
    const removed = { id: 'one' };
    expect(preserveLocalEdits([removed], [removed], [])).toEqual([]);
  });
});
