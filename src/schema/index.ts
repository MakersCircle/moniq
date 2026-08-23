/**
 * Public API for the schema versioning system.
 *
 * Import from here instead of reaching into subdirectories.
 */

export { CURRENT_SCHEMA_VERSION } from './version';

// Entity schemas
export * from './entities/account.schema';
export * from './entities/method.schema';
export * from './entities/category.schema';
export * from './entities/transaction.schema';
export * from './entities/budget.schema';
export * from './entities/settings.schema';

// Runners
export { openMoniqDB, closeDB, setDbDeleting } from './runner/idbMigrationRunner';
export { runSheetsMigrations, migrateSheet } from './runner/sheetsMigrationRunner';
export { migrationChannel } from './runner/migrationChannel';

// Migration registries (for testing and introspection)
export { idbMigrations, sheetsMigrations } from './migrations';
