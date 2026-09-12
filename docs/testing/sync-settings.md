# Sync Engine, Backups, Trash & Settings Test Coverage

This document details test cases covering `src/sync/SyncEngine.ts`, `src/sync/ConflictResolver.ts`,
`src/sync/BackupManager.ts`, `src/pages/Settings/index.tsx`, and `src/pages/Settings/Trash.tsx`.

## 1. Unit Tests

### 1.1 `SyncEngine.test.ts` — Dirty Tracking & Debounced Flush

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-01 | `markDirty('transaction', id, 'update')` called once | Adds op to sync queue via `addToSyncQueue`, calls `updatePendingCount`, schedules a debounced flush |
| U-02 | `markDirty` called 3 times within `debounceMs` (3000ms) window | Only one `flush()` executes; timer is reset (cleared + rescheduled) on each call |
| U-03 | `markDirty` called, then debounce timer expires | `flush()` invoked automatically after 3000ms with no further calls |
| U-04 | Queue contains multiple ops for same entity (e.g. 2 updates to same account) | `deduplicateQueue` keeps only the op with the latest `timestamp` |
| U-05 | Queue contains ops for different entity types | `flush()` groups ops by `entity` into a `Map` and calls `flushEntityOps` once per entity type |
| U-06 | `flush()` called while `status === 'migrating'` | Returns immediately, no client calls made |
| U-07 | `flush()` called while `status === 'syncing'` or `'pulling'` | Returns immediately (re-entrancy guard) |
| U-08 | `flush()` called with empty queue | Sets status to `'idle'`, no network calls |
| U-09 | `flush()` succeeds | Clears sync queue, persists `lastSyncedAt` via `setMeta`, resets `flushRetryCount` to 0, sets status `'idle'`, calls `useDataStore.setLastSyncedAt`, calls `triggerBackupCycle()` |
| U-10 | `flush()` throws (network error) | Sets status to `'error'` with message, increments `flushRetryCount`, queue is NOT cleared |
| U-11 | `flushEntityOps` for entity not found in local store (e.g. already deleted before flush) | Skips that op silently, no row written |
| U-12 | `flushEntityOps` for entity found in `rowIndex` | Pushed into `updateBatch`, `batchUpdateRows` called, entity removed from `pendingAppendIds` |
| U-13 | `flushEntityOps` for entity NOT found in `rowIndex` | Marked in `pendingAppendIds` BEFORE the network call, pushed into `newRows`, `appendRows` called |
| U-14 | `appendRows` resolves after being marked pending | Row index updated with returned start row, entity ID cleared from `pendingAppendIds` |
| U-15 | Entity has a pending (unconfirmed) append from a prior flush | `rebuildRowIndexForStore` is called to re-read the live sheet BEFORE processing the batch, to avoid duplicate append |
| U-16 | `rebuildRowIndexForStore` re-read finds the row already present | Op is routed to `updateBatch` instead of re-appending |
| U-17 | `entityType === 'settings'` | Routed to `flushSettings()` — full overwrite of Settings sheet, not row-indexed update/append |

### 1.2 `SyncEngine.test.ts` — Manual "Sync Now" / `forceSync`

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-18 | `forceSync()` called | Clears any pending debounce timer, calls `flush()` immediately (bypasses debounce wait) |
| U-19 | `forceSync()` after successful flush (`pendingCount === 0`, `status !== 'error'`) | Resolves without throwing |
| U-20 | `forceSync()` after failed flush (`pendingCount > 0`) | Throws `Error` with `_lastError` message (or `'Sync failed'` fallback) |
| U-21 | Settings page "Sync Now" clicked with `pendingCount > 0` | Calls `engine.forceSync()` (push-only path), does NOT call `initialize()` |
| U-22 | Settings page "Sync Now" clicked with `pendingCount === 0` | Calls `engine.initialize(spreadsheetId)` (full pull path) and `hydrateFromSync(reconciledData)` on success |
| U-23 | "Sync Now" clicked with no `accessToken` or `spreadsheetId` | Handler returns immediately, no engine call made |
| U-24 | "Sync Now" initialize() returns `null` (e.g. auth failure) | `hydrateFromSync` is NOT called |
| U-25 | "Sync Now" throws | Shows `toast.error('Manual sync failed')` |

### 1.3 `SyncEngine.test.ts` — Retry / Backoff

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-26 | `scheduleRetry()` called with `flushRetryCount` below `maxRetries` (8) | Schedules retry with delay `baseRetryDelayMs * 2^(attempt-1)`, capped at `maxRetryDelayMs` (60000ms) |
| U-27 | `scheduleRetry()` called when `flushRetryCount` exceeds `maxRetries` | Sets permanent `'error'` status with "Sync failed after 8 retries..." message, resets counter to 0, stops retrying |
| U-28 | Successive retries | Delay grows exponentially: 1000ms, 2000ms, 4000ms... capped at 60000ms |

### 1.4 `SyncEngine.test.ts` — Hard Reset (`performHardReset`)

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-29 | `performHardReset()` happy path | Calls `deleteMoniqDB()` FIRST, then `client.clearAllData()`, then `localStorage.clear()` and `sessionStorage.clear()`, then resets in-memory `rowIndexes`/`pendingAppendIds`/`flushRetryCount`/`client`, ends with status `'idle'` |
| U-30 | `deleteMoniqDB()` throws (DB locked by another tab) | Remote wipe and local storage clear are SKIPPED; status set to `'error'` with "Reset failed..." message |
| U-31 | Local IndexedDB delete succeeds but remote `clearAllData` throws | Error is swallowed (caught internally); local wipe (`localStorage.clear()`, `sessionStorage.clear()`) still proceeds |
| U-32 | No client and no `spreadsheetId` available for `ensureClient()` | Remote wipe step is skipped entirely; local wipe still proceeds and reset completes successfully |
| U-33 | Ordering verification | `deleteMoniqDB` call is verified to occur strictly before any `client.clearAllData` call (local-then-remote, not remote-then-local) |

### 1.5 `SyncEngine.test.ts` — Initialize / Reconcile / Row Indexing

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-34 | `initialize()` with no spreadsheetId resolvable | Returns `null` without setting status |
| U-35 | `initialize()` — sheet tabs not yet verified this session (`sessionTabsKey` unset) | Calls `ensureSheetTabs` + `ensureHeaders` for every sheet before fetching, then marks session verified |
| U-36 | `initialize()` — tabs already verified, but `batchGetSheets` throws | Clears the verified flag, re-runs `ensureSheetTabs`/`ensureHeaders`, retries fetch |
| U-37 | `initialize()` — migration step throws | Sets status `'error'` with migration error message, returns `null` (does not proceed to reconcile) |
| U-38 | `initialize()` — header row mismatch detected for a sheet | Queues `overwriteSheet` repair call for that sheet; repairs run in parallel via `Promise.all` |
| U-39 | `initialize()` success | Persists `accResult.merged`/`metResult.merged`/etc. via `putMany`, saves settings via `putSetting`, clears sync queue, updates `lastSyncedAt` meta, sets status `'idle'`, returns merged entity sets |
| U-40 | `buildIndex()` given sheet rows | Returns 1-based row-number map keyed by entity ID (skips header row, skips rows with empty ID) |
| U-41 | `deduplicate()` given two entities with same `id` but different `updatedAt` | Keeps only the entity with the later `updatedAt` |
| U-42 | `triggerBackupCycle()` called twice in the same session | `BackupManager.runBackupCycle()` invoked only once (guarded by static `backupCheckedThisSession` flag) |
| U-43 | `triggerBackupCycle()` — dynamic import/backup cycle rejects | Resets `backupCheckedThisSession` to `false` so a later flush can retry |

### 1.6 `ConflictResolver.test.ts` — `computeChecksum`

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-44 | Same fields array passed twice | Returns identical checksum string both times (deterministic) |
| U-45 | Fields differ by a single character | Returns a different checksum |
| U-46 | Field order changed (same values, different order) | Returns a different checksum (order-sensitive, joined with `\|`) |
| U-47 | Empty fields array | Returns a valid base-36 string without throwing |

### 1.7 `ConflictResolver.test.ts` — `reconcile` Policy

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-48 | Entity exists only in remote | Added to `merged` and `toDownload`; not in `toUpload` |
| U-49 | Entity exists only in local | Added to `merged` and `toUpload`; not in `toDownload` |
| U-50 | Entity in both, remote's computed checksum ≠ stored sheet checksum (manual edit detected) | Remote wins regardless of `updatedAt`: added to `merged`, `toDownload`, AND `toUpload` (to repair the stale checksum on the sheet) |
| U-51 | Entity in both, checksums match, only local `updatedAt` > `syncedAt` | Local wins: added to `merged` and `toUpload` only |
| U-52 | Entity in both, checksums match, only remote `updatedAt` > `syncedAt` | Remote wins: added to `merged` and `toDownload` only |
| U-53 | Entity in both, checksums match, BOTH local and remote `updatedAt` > `syncedAt` (true conflict) | Falls back to highest raw timestamp; if local timestamp is greater, local wins and is added to `toUpload` |
| U-54 | Entity in both, checksums match, NEITHER `updatedAt` changed since `syncedAt`, remote timestamp is greater | Remote wins by tie-break rule, added to `toDownload` |
| U-55 | Entity in both, checksums match, timestamps identical | Neither `toUpload` nor `toDownload` receives the entity; only `merged` (no-op case) |
| U-56 | `syncedAt` is `null` (first-ever sync) | Both `localChanged`/`remoteChanged` computed against epoch 0, so any real timestamp counts as "changed" |
| U-57 | `storedChecksum` is `undefined` for an entity id (e.g. legacy row before checksum column existed) | Checksum-mismatch branch is skipped entirely; falls through to standard timestamp comparison |

### 1.8 `BackupManager.test.ts` — Tiered Due-Date Logic (`getRequiredTiers`)

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-58 | No backups exist yet (fresh account) | All four tiers (`daily`, `weekly`, `monthly`, `yearly`) are returned as due |
| U-59 | Daily backup already exists with today's date | `daily` is excluded from the due list |
| U-60 | Daily backup exists but dated yesterday | `daily` is included as due |
| U-61 | Weekly backup exists from the current ISO week | `weekly` excluded from due list |
| U-62 | Weekly backup exists from the previous ISO week | `weekly` included as due |
| U-63 | Monthly backup exists with `createdTime` in the current calendar month | `monthly` excluded from due list |
| U-64 | Monthly backup exists dated last month | `monthly` included as due |
| U-65 | Yearly backup exists, `fiscalYearStartMonth = 1` (calendar year), current date in same calendar year as last yearly backup | `yearly` excluded from due list |
| U-66 | Yearly backup exists, `fiscalYearStartMonth = 4` (April start), current date is March and last backup's fiscal year rolled over already | `yearly` included as due (still same or new fiscal year depending on `getFiscalYearString`) |
| U-67 | `getFiscalYearString`, date month < `fiscalYearStartMonth` | Returns `year - 1` as the fiscal year label |
| U-68 | `getFiscalYearString`, date month >= `fiscalYearStartMonth` | Returns `year` as the fiscal year label |
| U-69 | `fiscalYearStartMonth = 1` and current date is December 31 vs next backup on January 1 | Fiscal year string changes across the boundary, so `yearly` becomes due again on Jan 1 |
| U-70 | `runBackupCycle()` called while `isRunning` is already `true` | Returns immediately without starting a second cycle (re-entrancy guard) |
| U-71 | `runBackupCycle(force=true)` | Bypasses `getRequiredTiers`, runs only the `manual` tier |
| U-72 | `runBackupCycle()` with no `spreadsheetId` in store | Returns immediately, no backup performed |
| U-73 | `runBackupCycle()` — one tier's `performBackup` throws mid-loop | Error is caught and logged; `isRunning` reset to `false` in `finally` (does not leave the manager stuck) |

### 1.9 `BackupManager.test.ts` — Backup Folder & Retention

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-74 | `ensureBackupFolder()` — stored `backupFolderId` exists and is not trashed | Returns the stored ID without searching or creating |
| U-75 | `ensureBackupFolder()` — stored ID's file lookup returns `trashed: true` | Clears the stored ID (`setBackupFolderId(null)`), falls through to search/create |
| U-76 | `ensureBackupFolder()` — no stored ID, but a "Moniq Backups" folder is found under the parent `folderId` | Persists the found ID via `setBackupFolderId`, returns it (no duplicate folder created) |
| U-77 | `ensureBackupFolder()` — no stored ID and no existing folder found | Creates a new folder (nested under `folderId` if known), persists and returns the new ID |
| U-78 | `cleanupOldBackups('daily', folderId)` — 9 daily backups exist, limit is 7 | Deletes the oldest 2 (indices beyond the retention limit, since `listFiles` is sorted newest-first) |
| U-79 | `cleanupOldBackups('yearly', folderId)` — any count | No-op: `yearly` limit (999) exceeds the `> 100` guard, so cleanup is skipped |
| U-80 | `cleanupOldBackups` — backup count under the tier's limit | No files deleted |
| U-81 | `getLatestBackups()` — files include multiple backups per tier | Returns only the first (newest, per sorted order) match per tier |
| U-82 | `getLatestBackups()` — a file name doesn't match the `moniq-backup-<tier>-<suffix>` pattern | File is ignored, does not populate any tier |
| U-83 | `getLatestBackups()` — a tier has no matching file at all | That tier's value in the result map is `null` |

## 2. Component Tests (`Settings.test.tsx` / `Trash.test.tsx`)

### 2.1 Settings — Cloud Sync Section

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-01 | `isDemoMode: true` | Renders "Currently in Demo Mode" card with "Sign in to Sync" button; Profile/Cloud Sync/Backups sections are NOT rendered |
| C-02 | Demo mode "Sign in to Sync" clicked | Opens `DemoExitDialog` |
| C-03 | `syncStatus: 'idle'`, `lastSyncedAt` set | Status icon is emerald `RefreshCw` (not spinning); text reads "Last synced {formatted date}" |
| C-04 | `syncStatus: 'syncing'` | Icon spins (`animate-spin`), text reads "Syncing changes…"; "Sync Now" button is disabled |
| C-05 | `syncStatus: 'pulling'` | Icon spins, text reads "Pulling from sheets…"; "Sync Now" button is disabled |
| C-06 | `syncStatus: 'error'`, `lastSyncError` set | Red `AlertCircle` icon shown, text reads "Sync error", error message box renders below with the raw error text |
| C-07 | `syncStatus: 'offline'` | Zinc `CloudOff` icon, text reads "Offline" |
| C-08 | `pendingCount: 0` | No "N changes pending" line, no `InfoTooltip` rendered |
| C-09 | `pendingCount: 1` | Renders "1 change pending" (singular, no trailing "s") |
| C-10 | `pendingCount: 3` | Renders "3 changes pending" (plural) |
| C-11 | `pendingCount > 0`, hovering the info icon | Tooltip lists each pending op as `{ACTION} {ENTITY}` on one line and a resolved detail label below it |
| C-12 | Pending op is `entity: 'settings'` | Tooltip detail shows "App Settings" regardless of `entityId` |
| C-13 | Pending op `action: 'delete'` | Tooltip detail shows "Deleted item" (entity is not looked up since it may no longer exist in the store) |
| C-14 | Pending op is a transaction create/update, transaction has a `note` | Tooltip detail shows `{note} ({formatted currency amount})` |
| C-15 | Pending op is a transaction with no `note` and `uiType: 'transfer'` | Tooltip detail label falls back to "Transfer" |
| C-16 | Pending op is a transaction with no `note`, not a transfer, resolvable category | Tooltip detail falls back to `{category.head} - {category.subHead}` (or just `head` if no `subHead`) |
| C-17 | Pending op is `entity: 'account'`/`'method'`/`'category'`/`'budget'` with a resolvable record | Tooltip detail shows that entity's display name (account/method name, category head, or "{category} Budget") |
| C-18 | "Sync Now" clicked | Calls the manual sync handler (see U-21/U-22) |
| C-19 | Sign out clicked, `pendingCount === 0` | Calls `googleLogout()`, `SyncEngine.reset()`, `resetData()`, closes modal, clears `skipOnboarding` session flag |
| C-20 | Sign out clicked, `pendingCount > 0`, `forceSync()` succeeds | Proceeds directly to logout without showing the "Unsaved Changes" dialog |
| C-21 | Sign out clicked, `pendingCount > 0`, `forceSync()` throws | Shows `toast.error`, opens "Unsaved Changes" confirmation dialog with the pending count baked in |
| C-22 | "Unsaved Changes" dialog — "Sign Out Anyway" clicked | Proceeds with logout despite unsynced changes |
| C-23 | "Unsaved Changes" dialog — "Cancel" clicked | Closes dialog, resets `isLoggingOut` to false, no logout occurs |

### 2.2 Settings — Backups Section

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-24 | "Backup Now" clicked | Button shows spinner + "Backing up..." while in flight; calls `BackupManager.getInstance().runBackupCycle(true)` |
| C-25 | "Backup Now" completes | Button reverts to "Backup Now" label, re-enabled |
| C-26 | "View Latest Snapshots" clicked first time | Toggles panel open, lazily fetches `getLatestBackups()` and renders "Fetching from Google Drive..." until resolved |
| C-27 | "View Latest Snapshots" clicked again after data loaded | Toggles closed without refetching (cached `latestBackups` state reused) |
| C-28 | Snapshot data loaded, a tier has a snapshot | Renders formatted timestamp (`MMM d, yyyy • h:mm a`) and truncated file name for that tier row |
| C-29 | Snapshot data loaded, a tier has no snapshot (`null`) | Renders "No snapshot yet" in muted styling for that row |
| C-30 | All five tier rows (`manual`, `daily`, `weekly`, `monthly`, `yearly`) | Each renders its static retention label ("Retains last 5", "Retains last 7 days", "Retains last 5 weeks", "Retains last 12 months", "Retained indefinitely") regardless of actual snapshot data |

### 2.3 Settings — Regional Preferences (Currency / Locale / Date Format)

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-31 | Currency popover opened | Renders full currency list from `getAllCurrencies()`; currently selected currency is visually highlighted |
| C-32 | Typing in currency search box | List filters to currencies whose name or code includes the search text (case-insensitive) |
| C-33 | Currency search matches nothing | Renders "No currencies found." empty state |
| C-34 | Selecting a currency from the list | Calls `updateSettings({ currency: code })`, closes the popover |
| C-35 | Currency trigger button label | Shows `"{code} — {name}"` for the selected currency, or "Select currency" if unresolved |
| C-36 | "Selected:" preview line below currency picker | Shows `{symbol} ({name})` computed from `currentCurrency` memo |
| C-37 | Number format popover — selecting a locale | Calls `updateSettings({ numberLocale: code })`, closes popover |
| C-38 | Number format live preview | "Preview: {formatCurrency(1234567.89, settings)}" updates immediately after a locale is selected (reflects new `numberLocale`) |
| C-39 | Number format search filters list | Same filter behavior as currency search, scoped to `COMMON_LOCALES` names |
| C-40 | Date Format `Select` opened | Renders 4 options (`MMM d, yyyy`, `dd/MM/yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`), each rendered as today's date formatted with that pattern (live preview inline in the option itself) |
| C-41 | Selecting a date format option | Calls `updateSettings({ dateFormat: val })` |
| C-42 | No `dateFormat` set in settings | `Select` defaults its displayed value to `'MMM d, yyyy'` |
| C-43 | "Locale Info" footer row | Displays raw `settings.numberLocale` code in a highlighted badge |

### 2.4 Settings — Danger Zone / Hard Reset Modal

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-44 | "Reset Data" clicked | Clears `resetConfirmText`, opens the hard-reset confirmation `Dialog` |
| C-45 | Reset modal opened | Renders the exact required phrase `"I UNDERSTAND THIS WILL PERMANENTLY WIPE ALL MY DATA"` in a read-only display block |
| C-46 | Confirm input empty | "Delete Everything" button is disabled |
| C-47 | Confirm input has a near-match (wrong case, extra space, partial text) | Button remains disabled (exact string equality required) |
| C-48 | Confirm input exactly matches `RESET_PHRASE` | Button becomes enabled |
| C-49 | "Delete Everything" clicked with correct phrase | Calls `SyncEngine.getInstance().performHardReset()`, closes modal, sets `window.location.href = '/'` on success |
| C-50 | "Delete Everything" clicked, `performHardReset()` throws | Shows `toast.error('Hard reset failed')`, opens the error dialog with a message referencing a locked database and the raw error, does NOT navigate away |
| C-51 | Reset in progress (`isResetting: true`) | Both "Cancel" and "Delete Everything" buttons are disabled; button shows spinner instead of "Delete Everything" label |
| C-52 | "Cancel" clicked in reset modal | Closes modal without calling `performHardReset` |

### 2.5 Trash — Restore Guards & Rendering

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-53 | Tab counts in `TabsList` | Each tab label shows a live count, e.g. "Transactions (N)", matching `deletedTxns.length` etc. |
| C-54 | A tab's deleted list is empty | Renders `renderEmpty(label)` placeholder ("No deleted {label}") instead of a table |
| C-55 | Restore clicked for a payment method whose linked account is deleted | Sets an error message naming the method and the deleted account, does NOT call `updateMethod` |
| C-56 | Restore clicked for a payment method whose linked account is NOT deleted (or has none) | No error; proceeds to restore after the 150ms `restoring` animation delay, calls `updateMethod(id, { isDeleted: false })` |
| C-57 | Restore clicked for a transaction whose relevant account (debit/credit leg matching `uiType`) is deleted | Sets an error naming the transaction's account, blocks restore |
| C-58 | Restore clicked for a non-transfer transaction whose category is deleted (account is fine) | Sets an error naming the deleted category, blocks restore |
| C-59 | Restore clicked for a transfer-type transaction | Category-deleted check is skipped entirely (only account check applies), since transfers have no category entry |
| C-60 | Restore clicked for a transaction with both account and category valid | Proceeds to restore, calls `updateTransaction(id, { isDeleted: false })` |
| C-61 | Restore clicked for an account | No cross-entity guard applies; always calls `restoreAccount(id)` directly |
| C-62 | Restore clicked for a category | No cross-entity guard applies; always calls `updateCategory(id, { isDeleted: false })` |
| C-63 | Restore in progress for a row | Row gets `opacity-0 scale-95` classes applied (fade-out) during the 150ms window before the item disappears from the list |
| C-64 | An error is set from a failed restore attempt | Error banner renders above the tab content with the exact message text; clicking restore again on a different row clears the previous error (`setError(null)` at top of `handleRestore`) |

### 2.6 Trash — Sort-By Control (Transactions-only wiring)

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-65 | Transactions tab, `sortBy = 'deleted'` | Rows ordered by `updatedAt` descending (most recently deleted first) |
| C-66 | Transactions tab, `sortBy = 'created'` | Rows ordered by transaction `date` descending — sort actually changes when the control is toggled |
| C-67 | Accounts tab, toggling sort-by between "Recently Deleted" and "Date Created" | **No visible change**: `AccountsTable` ignores its `sortBy` prop entirely and always sorts by `updatedAt` descending. This test documents current (arguably buggy) behavior and will fail loudly if a future fix wires `sortBy` through without updating this test — a deliberate tripwire |
| C-68 | Methods tab, toggling sort-by | Same as C-67: `MethodsTable` always sorts by `updatedAt` descending regardless of `sortBy` value |
| C-69 | Categories tab, toggling sort-by | Same as C-67: `CategoriesTable` always sorts by `updatedAt` descending regardless of `sortBy` value |
| C-70 | Sort-by `Select` control itself | Renders and updates its own displayed value correctly on all four tabs (the control's UI state is fully wired — only the three non-Transactions tables fail to consume it) |

## 3. End-to-End Tests

Full sync round-trips against real Google Sheets/Drive APIs are not practical to exercise in E2E:
OAuth requires a live human-consented Google account, API quotas make repeated CI runs unreliable,
and the reconcile/backup logic already has deterministic unit coverage above. E2E here is scoped to
UI flows that can be driven entirely against **local/demo-mode data** (no real Google API calls),
plus a small number of smoke checks against a seeded test Google account where unavoidable.

### 3.1 Settings Page (Demo Mode / Local Data)

| ID | Scenario | Expected Outcome |
|---|---|---|
| E-01 | Load `/settings` in demo mode | "Currently in Demo Mode" banner is visible; Cloud Sync and Backups sections are absent |
| E-02 | Currency picker end-to-end | Search "yen", select "JPY — Japanese Yen", preview line and "Selected:" text update without a page reload |
| E-03 | Date format picker end-to-end | Select `yyyy-MM-dd`, navigate to a page showing dates (e.g. Trash), confirm dates render in the newly selected format |
| E-04 | Number format picker end-to-end | Select a locale using comma decimal separators, confirm the currency preview string updates its separator style live |

### 3.2 Hard Reset Confirmation Flow (Local Data)

| ID | Scenario | Expected Outcome |
|---|---|---|
| E-05 | Click "Reset Data" | Confirmation modal opens showing the exact required phrase |
| E-06 | Type an incorrect phrase | "Delete Everything" stays disabled; clicking it (forced) does nothing |
| E-07 | Type the exact required phrase | "Delete Everything" becomes enabled |
| E-08 | Confirm hard reset (against demo/local data, no real Google account attached) | Modal shows a spinner, then the app redirects to `/` and returns to the onboarding/demo landing state |
| E-09 | Cancel out of the modal, reopen it | Confirmation text field is reset to empty (not remembered from the previous attempt) |

### 3.3 Trash Restore Flow (Local/Demo Data)

| ID | Scenario | Expected Outcome |
|---|---|---|
| E-10 | Seed demo data with a deleted account and a deleted payment method linked to it | Trash page shows both in their respective tabs with correct counts |
| E-11 | Attempt to restore the payment method first | Inline error banner appears naming the method and the still-deleted linked account; method remains in the Trash list |
| E-12 | Restore the account, then retry restoring the payment method | Account row fades out and disappears from Accounts tab; method restore now succeeds without error and disappears from Methods tab |
| E-13 | Seed a deleted transaction whose category is also deleted | Attempting restore shows the category-specific error message; restoring the category first unblocks the transaction restore |
| E-14 | Switch between Trash tabs (Transactions/Accounts/Methods/Categories) | Tab content and counts update immediately; previously shown error banner clears when a new restore attempt begins on another row |
| E-15 | Empty a tab of all deleted items via restores | Tab renders the "No deleted {label}" empty state |

### 3.4 Out of Scope for E2E (documented, not automated)

| ID | Scenario | Why Excluded |
|---|---|---|
| E-16 | Full push/pull sync against live Google Sheets | Requires a persistent OAuth-consented test account; flaky under CI due to Sheets API quotas/latency; already covered by SyncEngine/ConflictResolver unit tests (U-01 – U-57) |
| E-17 | Tiered backup creation actually appearing in Google Drive on schedule | Time-dependent (daily/weekly/monthly/yearly boundaries) and requires real Drive folder access; covered by BackupManager due-date unit tests (U-58 – U-83) instead |
| E-18 | "Sync Now" full pull reconciling real manual Sheet edits (checksum-mismatch path) | Requires manually editing a live spreadsheet mid-test; covered by `reconcile()` unit tests (U-50) |
