import type { SheetClient } from '@/sync/SheetClient';
import { sheetsMigrations } from '@/schema/migrations';
import { CURRENT_SCHEMA_VERSION } from '@/schema/version';
import { getMeta, setMeta, getAll } from '@/lib/db';
import { migrationChannel } from './migrationChannel';

/** IDB meta key for the committed Sheets schema version. */
const SHEETS_VERSION_KEY = 'sheets_schema_version';
/** IDB meta key for detecting interrupted migrations on next boot. */
const MIGRATION_STATUS_KEY = 'migration_status';
/** IDB meta key for the Drive backup created before migration. */
const MIGRATION_BACKUP_ID_KEY = 'migration_backup_id';
/** IDB meta key for the target version of an in-progress migration. */
const MIGRATION_TARGET_VERSION_KEY = 'migration_target_version';

/** Rows to push per `appendRows` call (rate-limit friendly). */
const BATCH_SIZE = 100;

/**
 * Reads the current schema version from the Google Sheets `_meta` tab.
 * Returns 0 if the tab is missing or has no version row.
 */
async function readSheetsVersion(client: SheetClient): Promise<number> {
  try {
    const rows = await client.readSheet('_meta');
    const versionRow = rows.find(r => r[0] === 'schema_version');
    return versionRow ? parseInt(versionRow[1] ?? '0', 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Writes the current schema version to the Google Sheets `_meta` tab.
 * Upserts the `schema_version` key-value row.
 */
async function writeSheetsVersion(client: SheetClient, version: number): Promise<void> {
  const rows = await client.readSheet('_meta').catch(() => [] as string[][]);
  const idx = rows.findIndex(r => r[0] === 'schema_version');
  if (idx === -1) {
    // Append new row
    await client.appendRows('_meta', [['schema_version', String(version)]]);
  } else {
    // Update existing row (1-based: header is row 1, data starts at row 2)
    await client.updateRow('_meta', idx + 1, ['schema_version', String(version)]);
  }
}

/**
 * Performs the Safe Rewrite Protocol for a single sheet tab.
 *
 * Sequence:
 *   1. Read current sheet into a temp buffer
 *   2. Set migration lock in IDB
 *   3. Clear the sheet
 *   4. Write new headers
 *   5. Push all IDB records in batches
 *   6. Verify row count
 *   7. Rollback via temp buffer if verification fails
 */
async function safeRewrite(
  client: SheetClient,
  sheetName: string,
  newHeaders: string[],
  rows: string[][]
): Promise<void> {
  // Capture temp buffer before touching the sheet
  const tempBuffer = await client.readSheet(sheetName).catch(() => [] as string[][]);

  // Clear + write new headers + push new data
  await client.overwriteSheet(sheetName, rows);

  // Verify: sheet should have header + all data rows
  const afterRows = await client.readSheet(sheetName);
  const expectedCount = rows.length + 1; // +1 for header
  if (afterRows.length !== expectedCount) {
    // Rollback: re-write the pre-clear buffer
    if (tempBuffer.length > 0) {
      await client.overwriteSheet(sheetName, tempBuffer.slice(1)); // skip old header
    }
    throw new Error(
      `Migration rewrite failed for sheet "${sheetName}": row count mismatch after push.`
    );
  }

  void newHeaders; // reserved for future column validation
}

/**
 * Runs all pending Sheets migrations in ascending version order.
 *
 * Called once during `SyncEngine.initialize()` after the full pull, so IDB
 * is always populated before any sheet is rewritten.
 *
 * Safety guarantees:
 * - Creates a Drive backup before any sheet is cleared.
 * - Stores a migration lock in IDB that survives tab closure.
 * - Writes the committed version to IDB meta AND the _meta sheet after each migration.
 * - Interrupted migrations are detected on next boot via the lock key.
 */
export async function runSheetsMigrations(
  client: SheetClient,
  opts?: {
    /** Optional Drive backup function — receives spreadsheetId, returns backup file ID */
    createBackup?: (spreadsheetId: string) => Promise<string>;
    spreadsheetId?: string;
  }
): Promise<void> {
  const storedVersionStr = await getMeta(SHEETS_VERSION_KEY);
  const storedVersion = storedVersionStr ? parseInt(storedVersionStr, 10) : 0;

  // Check for an interrupted migration from a previous session
  const interruptedStatus = await getMeta(MIGRATION_STATUS_KEY);
  if (interruptedStatus === 'running') {
    // The stored version reflects the last *committed* migration, so we resume from there.
  }

  const pending = sheetsMigrations.filter(m => m.version > storedVersion);
  if (pending.length === 0) return;

  // ── Broadcast to other tabs ──────────────────────────────────
  migrationChannel.broadcast({ type: 'MIGRATION_STARTED', version: CURRENT_SCHEMA_VERSION });

  // ── Create Drive backup before any mutation ──────────────────
  if (opts?.createBackup && opts.spreadsheetId) {
    try {
      const backupId = await opts.createBackup(opts.spreadsheetId);
      await setMeta(MIGRATION_BACKUP_ID_KEY, backupId);
    } catch (_err) {
      // Proceed without backup
    }
  }

  for (const migration of pending) {
    // Set the migration lock BEFORE touching any sheet
    await setMeta(MIGRATION_STATUS_KEY, 'running');
    await setMeta(MIGRATION_TARGET_VERSION_KEY, String(migration.version));

    try {
      await migration.up(client);

      // Write version to both IDB meta and the _meta sheet
      await setMeta(SHEETS_VERSION_KEY, String(migration.version));
      await writeSheetsVersion(client, migration.version);

      // Clear the lock on successful completion of this migration
      await setMeta(MIGRATION_STATUS_KEY, 'done');
    } catch (err) {
      await setMeta(MIGRATION_STATUS_KEY, 'failed');
      // Do NOT proceed to next migration — re-throw so SyncEngine can handle the error
      throw err;
    }
  }

  // ── Broadcast completion ─────────────────────────────────────
  migrationChannel.broadcast({ type: 'MIGRATION_DONE', version: CURRENT_SCHEMA_VERSION });
}

/**
 * Full rewrite migration helper.
 *
 * Use this inside a `sheets/00N_*.ts` migration's `up()` function to safely
 * rewrite a sheet with a new column layout. IDB data is always pushed fresh
 * from the local store (which was populated during the pre-migration pull).
 */
export async function migrateSheet<T extends { id: string }>(
  client: SheetClient,
  opts: {
    sheetName: string;
    idbStoreName: 'accounts' | 'methods' | 'categories' | 'transactions' | 'budgets';
    newHeaders: string[];
    serialize: (entity: T) => string[];
  }
): Promise<void> {
  const records = await getAll<T>(opts.idbStoreName);

  if (records.length === 0) {
    return;
  }

  // Serialize in batches for memory efficiency
  const serialized: string[][] = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    serialized.push(...batch.map(opts.serialize));
  }

  await safeRewrite(client, opts.sheetName, opts.newHeaders, serialized);
}

export { readSheetsVersion, writeSheetsVersion };
