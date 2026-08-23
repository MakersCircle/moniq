import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { idbMigrations, sheetsMigrations } from '../../migrations';
import { CURRENT_SCHEMA_VERSION } from '../../version';

describe('migrationRegistry', () => {
  describe('IDB Migration Registry', () => {
    it('MR-01: IDB migrations are ordered by version ascending', () => {
      const versions = idbMigrations.map(m => m.version);
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBeGreaterThan(versions[i - 1]);
      }
    });

    it('MR-02: No duplicate IDB migration versions', () => {
      const versions = idbMigrations.map(m => m.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });

    it('MR-05: All IDB migrations export version (number) and up() (function)', () => {
      for (const m of idbMigrations) {
        expect(typeof m.version).toBe('number');
        expect(m.version).toBeGreaterThan(0);
        expect(typeof m.up).toBe('function');
      }
    });

    it('MR-06: At least one IDB migration exists (v1)', () => {
      const v1 = idbMigrations.find(m => m.version === 1);
      expect(v1).toBeDefined();
    });

    it('highest IDB migration version <= CURRENT_SCHEMA_VERSION', () => {
      const max = Math.max(...idbMigrations.map(m => m.version));
      expect(max).toBeLessThanOrEqual(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('Sheets Migration Registry', () => {
    it('MR-03: Sheets migrations are ordered by version ascending', () => {
      const versions = sheetsMigrations.map(m => m.version);
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBeGreaterThan(versions[i - 1]);
      }
    });

    it('MR-04: No duplicate Sheets migration versions', () => {
      const versions = sheetsMigrations.map(m => m.version);
      const unique = new Set(versions);
      expect(unique.size).toBe(versions.length);
    });

    it('MR-05: All Sheets migrations export version (number) and up() (function)', () => {
      for (const m of sheetsMigrations) {
        expect(typeof m.version).toBe('number');
        expect(m.version).toBeGreaterThan(0);
        expect(typeof m.up).toBe('function');
      }
    });

    it('MR-06: At least one Sheets migration exists (v1)', () => {
      const v1 = sheetsMigrations.find(m => m.version === 1);
      expect(v1).toBeDefined();
    });

    it('highest Sheets migration version <= CURRENT_SCHEMA_VERSION', () => {
      const max = Math.max(...sheetsMigrations.map(m => m.version));
      expect(max).toBeLessThanOrEqual(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('Version Consistency', () => {
    it('IDB and Sheets registries cover the same version range', () => {
      const idbMax = Math.max(...idbMigrations.map(m => m.version));
      const sheetsMax = Math.max(...sheetsMigrations.map(m => m.version));
      // Both should be at or below CURRENT_SCHEMA_VERSION
      expect(idbMax).toBeLessThanOrEqual(CURRENT_SCHEMA_VERSION);
      expect(sheetsMax).toBeLessThanOrEqual(CURRENT_SCHEMA_VERSION);
    });
  });
});
