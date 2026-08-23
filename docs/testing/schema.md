# Schema Versioning Test Coverage

This document details the test cases covering the dynamic schema versioning engine (`src/schema/*`).

## 1. Entity Serialization Tests
These tests run identically for all 5 Core Entities (`Account`, `Category`, `Transaction`, `PaymentMethod`, `Budget`) under `src/schema/entities/__tests__/`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| S-01 | Serialize valid entity | Returns an array of strings |
| S-02 | Column count | Array length exactly matches the `_COLUMNS` constant |
| S-03 | Strict string values | All array elements are strictly strings (no `null`/`undefined`) |
| S-04 | Boolean serialization | `true` becomes `"TRUE"`, `false` becomes `"FALSE"` |
| S-05 | Optional string missing | Undefined optional strings serialize to `""` (empty string) |
| S-06 | Numeric serialization | Numbers are converted directly to numeric strings |
| S-07 | Checksum placeholder | The last array element is always reserved as an empty string `""` |
| DF-01 | Defaults export | `_DEFAULTS` constant exists and contains sensible fallbacks |

## 2. Entity Deserialization Tests
These tests also run identically for all 5 Core Entities to ensure no data loss occurs when pulling from Google Sheets.

| ID | Scenario | Expected Outcome |
|---|---|---|
| D-01 | Round-trip validation | `deserialize(serialize(entity))` deeply equals the original entity |
| D-02 | True boolean coercion | String `"TRUE"` correctly coerces to boolean `true` |
| D-03 | False boolean coercion | String `"FALSE"` or any other string coerces to boolean `false` |
| D-04 | Numeric coercion | Valid numeric strings coerce back to `number` |
| D-05 | Optional empty strings | `""` coerces to `undefined` for optional properties |
| D-06 | Missing/short rows | Missing columns fallback to default values gracefully |
| D-07 | Header order independence | Shuffled or reversed header rows still parse data accurately |
| D-12 | Extra unknown columns | Unknown columns are silently ignored without throwing errors |

### Transaction-Specific Deserialization

| ID | Scenario | Expected Outcome |
|---|---|---|
| D-08 | Sheets serial dates | Serial numeric dates (e.g., `45306`) normalize via UTC to `YYYY-MM-DD` |
| D-09 | Standard ISO dates | Existing ISO date strings pass through unchanged |
| D-10 | Ledger Entry arrays | The stringified `Entries JSON` column parses cleanly back to `LedgerEntry[]` |
| D-11 | Tags string | Comma-separated tags split to `string[]`; empty tags fall back to `[]` |

## 3. Migration Registry Tests (`migrationRegistry.test.ts`)
Ensures the migration array exports are structured safely.

| ID | Scenario | Expected Outcome |
|---|---|---|
| MR-01 | IDB version sorting | `idbMigrations` is sorted ascending by version |
| MR-02 | IDB duplicate versions | `idbMigrations` contains no duplicate version numbers |
| MR-03 | Sheets version sorting | `sheetsMigrations` is sorted ascending by version |
| MR-04 | Sheets duplicate versions | `sheetsMigrations` contains no duplicate version numbers |
| MR-05 | Export contracts | Every migration exports a `version` (number) and an `up()` function |
| MR-06 | Base versions exist | Both registries contain at least one `v1` migration |

## 4. IndexedDB Migration Runner (`idbMigrationRunner.test.ts`)
Tests the local database instantiation lifecycle using `fake-indexeddb`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| IDB-01 | Database instantiation | `openMoniqDB()` resolves with a database at `CURRENT_SCHEMA_VERSION` |
| IDB-02 | Required stores | All 9 required object stores exist (accounts, methods, categories, etc.) |
| IDB-03 | Required indexes | All necessary indexes (`by-date`, `by-updatedAt`, etc.) exist |
| IDB-04 | Singleton pattern | Calling `openMoniqDB()` concurrently returns the identical DB instance |
| IDB-07 | Up-to-date skips | If the DB is already at version, migrations are skipped gracefully |
| IDB-10 | Reopening logic | `closeDB()` resets the singleton allowing fresh DB connections |

## 5. Google Sheets Migration Runner (`sheetsMigrationRunner.test.ts`)
Tests the remote upgrade logic using a fully mocked `SheetClient`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| SM-01 | Version match | If stored version matches `CURRENT_SCHEMA_VERSION`, no migrations run |
| SM-02 | Version 0 | Runs all available migrations sequentially |
| SM-04 | Meta Read | Execution reads `sheets_schema_version` via `getMeta()` on startup |
| SM-05 | Meta Write | The current migration version is committed to IDB immediately after `up()` finishes |
| SM-07 | Missing `_meta` tab | A missing remote meta tab treats the sheet as v0 and forces migrations |
| SM-08 | Error isolation | If an `up()` script throws an error, execution completely halts |
| SM-09 | Version protection | If an error occurs, the version number is *not* incremented in `_meta` |
| SM-10 | Argument passing | `up()` script correctly receives the injected `SheetClient` |

## 6. Multi-Tab Concurrency (`multiTabCoordination.test.ts`)
Tests the `MigrationChannel` wrapper around `BroadcastChannel`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| MT-01 | Start broadcasting | `broadcast({ type: 'MIGRATION_STARTED' })` calls `postMessage` |
| MT-02 | Start listening | Receiving `MIGRATION_STARTED` invokes all registered listener callbacks |
| MT-03 | Done broadcasting | `broadcast({ type: 'MIGRATION_DONE' })` calls `postMessage` |
| MT-04 | Unsubscribing | Invoking the unsubscribe callback prevents listeners from receiving future messages |
| MT-05 | Dead leader locking | IDB constants (`migration_status`, `migration_target_version`) are reserved for crash recovery |
