import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock IDB helpers before importing the runner
vi.mock('../../../lib/db', () => ({
  getMeta: vi.fn(),
  setMeta: vi.fn(),
  getAll: vi.fn().mockResolvedValue([]),
}));

import { getMeta, setMeta } from '../../../lib/db';
import { runSheetsMigrations } from '../../runner/sheetsMigrationRunner';
import { CURRENT_SCHEMA_VERSION } from '../../version';

/** Minimal SheetClient mock */
function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    readSheet: vi.fn().mockResolvedValue([]),
    writeHeader: vi.fn().mockResolvedValue(undefined),
    appendRows: vi.fn().mockResolvedValue(2),
    updateRow: vi.fn().mockResolvedValue(undefined),
    overwriteSheet: vi.fn().mockResolvedValue(undefined),
    ensureSheetTabs: vi.fn().mockResolvedValue(undefined),
    ensureHeaders: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    batchUpdateRows: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sheetsMigrationRunner', () => {
  describe('SM-01: Version match → no migrations run', () => {
    it('skips all migrations when stored version equals current', async () => {
      vi.mocked(getMeta).mockImplementation(async (key: string) => {
        if (key === 'sheets_schema_version') return String(CURRENT_SCHEMA_VERSION);
        return undefined;
      });

      const client = makeClient();

      // We use a spy on the migration's up() to verify it's not called
      // Import sheetsMigrations to spy on the first migration
      const { sheetsMigrations } = await import('../../migrations');
      const spy = vi.spyOn(sheetsMigrations[0], 'up');

      await runSheetsMigrations(client);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('SM-02: Version 0 → all migrations run', () => {
    it('runs all migrations when stored version is 0', async () => {
      vi.mocked(getMeta).mockResolvedValue('0');
      const client = makeClient();

      const { sheetsMigrations } = await import('../../migrations');
      const spies = sheetsMigrations.map(m => vi.spyOn(m, 'up').mockResolvedValue(undefined));

      await runSheetsMigrations(client);

      for (const spy of spies) {
        expect(spy).toHaveBeenCalledOnce();
        spy.mockRestore();
      }
    });
  });

  describe('SM-04: getMeta is called to read version', () => {
    it('reads sheets_schema_version from IDB meta on start', async () => {
      vi.mocked(getMeta).mockResolvedValue(String(CURRENT_SCHEMA_VERSION));
      await runSheetsMigrations(makeClient());
      expect(getMeta).toHaveBeenCalledWith('sheets_schema_version');
    });
  });

  describe('SM-05: setMeta is called after each migration', () => {
    it('writes the new version to IDB meta after each migration', async () => {
      vi.mocked(getMeta).mockResolvedValue('0');
      const client = makeClient();

      const { sheetsMigrations } = await import('../../migrations');
      const spies = sheetsMigrations.map(m => vi.spyOn(m, 'up').mockResolvedValue(undefined));

      await runSheetsMigrations(client);

      expect(setMeta).toHaveBeenCalledWith(
        'sheets_schema_version',
        String(sheetsMigrations[sheetsMigrations.length - 1].version)
      );

      spies.forEach(s => s.mockRestore());
    });
  });

  describe('SM-07: Missing _meta tab treated as version 0', () => {
    it('runs migrations when _meta readSheet returns empty array', async () => {
      vi.mocked(getMeta).mockResolvedValue(undefined); // no stored version
      const client = makeClient({
        readSheet: vi.fn().mockResolvedValue([]),
      });

      const { sheetsMigrations } = await import('../../migrations');
      const spies = sheetsMigrations.map(m => vi.spyOn(m, 'up').mockResolvedValue(undefined));

      await runSheetsMigrations(client);

      // At least migration v1 should run
      expect(spies[0]).toHaveBeenCalled();
      spies.forEach(s => s.mockRestore());
    });
  });

  describe('SM-08 & SM-09: If migration throws, version not updated and next migration not run', () => {
    it('stops and does not update version if migration throws', async () => {
      // Only test if there are at least 2 migrations
      const { sheetsMigrations } = await import('../../migrations');
      if (sheetsMigrations.length < 2) return;

      vi.mocked(getMeta).mockResolvedValue('0');
      const client = makeClient();

      const spy0 = vi.spyOn(sheetsMigrations[0], 'up').mockRejectedValue(new Error('fail'));
      const spy1 = vi.spyOn(sheetsMigrations[1], 'up').mockResolvedValue(undefined);

      await expect(runSheetsMigrations(client)).rejects.toThrow('fail');

      // Version should NOT have been updated for the failed migration
      expect(setMeta).not.toHaveBeenCalledWith('sheets_schema_version', expect.any(String));
      // Second migration should NOT have been called
      expect(spy1).not.toHaveBeenCalled();

      spy0.mockRestore();
      spy1.mockRestore();
    });
  });

  describe('SM-10: Migration up() receives SheetClient', () => {
    it('passes the client to migration.up()', async () => {
      vi.mocked(getMeta).mockResolvedValue('0');
      const client = makeClient();

      const { sheetsMigrations } = await import('../../migrations');
      const spy = vi.spyOn(sheetsMigrations[0], 'up').mockResolvedValue(undefined);

      await runSheetsMigrations(client);

      expect(spy).toHaveBeenCalledWith(client);
      spy.mockRestore();
    });
  });
});
