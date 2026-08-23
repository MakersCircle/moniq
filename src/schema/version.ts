/**
 * Central schema version registry.
 *
 * Bump this number whenever you add a new migration file for either IDB or Sheets.
 * Both runners check this value on boot and execute any pending migrations in order.
 */
export const CURRENT_SCHEMA_VERSION = 1;
