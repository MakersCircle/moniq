# Moniq — UX & Reliability Bug Tracker

> Identified during flow audit (May 2026). Items 1 and 2 resolved in v0.7.0.

---

## 📝 TODO

### 🟡 Medium Priority






### ⚪ Low Priority

- [ ] **#21 — Schema Version tracking**
  Future schema changes require a way to detect outdated remote schemas to perform data migrations before syncing.
  **Fix:** Add `schemaVersion: 1` to the Settings sheet tab so older versions can be properly detected during `initialize()`.



- [ ] **#23 — Transaction modal openable without required prerequisites**
  Users can open the "Create Transaction" modal even if they have no Accounts, Payment Methods, or Categories set up yet, leading to confusion or errors when they try to save.
  **Fix:** Show a helper state, disabled button, or a tooltip advising the user to set up at least one Account, Method, and Category before adding transactions.

- [ ] **#24 — "Initial Balance" field missing in Category UI**
  The `Categories` sheet contains an `Initial Balance` column intended for tracking starting balances of Investments, Loans, and Debts. However, the UI does not expose an input field for this value, even when creating or editing a category under the "Invest", "Lend", or "Borrow" groups.
  **Fix:** Add an `Initial Balance` number input to the Category creation/edit modal that conditionally appears when the selected Group is "Invest", "Lend", or "Borrow".

- [ ] **#25 — Date Format setting is unused globally**
  The `dateFormat` preference stored in Settings is completely orphaned. The `formatDateShort` utility function hardcodes `en-IN` instead of using the setting, and `TransactionModal` uses a standard HTML5 date input that uses the OS locale instead of the configured format.
  **Fix:** Wire up `settings.dateFormat` throughout the UI using a library like `date-fns` for text dates, and consider custom date pickers for inputs to respect the user's preference.

---

## ✅ DONE

### 🔴 Critical

- [x] **#13 — No user feedback during first-ever Drive workspace setup**
- [x] **#15 — Hard reset: IndexedDB deletion may fail silently**
- [x] **#26 — "Ghost" DB connections blocking reset**
- [x] **#20 — Conflict Resolution clock drift gap**
- [x] **#22 — API Rate limiting awareness**
  `App.tsx` / `api/google.ts` — Implemented `initPhase` state to provide accurate feedback (`"Setting up your personal Drive folder…"` and `"Initializing your Moniq database…"`) during first-run Google Drive setup instead of hanging on generic text. *(Fixed)*

- [x] **#1 — Cross-device creates a fresh account instead of finding existing data**
  `api/google.ts` — Three-tier resolution (IndexedDB → Drive search → create) added. *(Fixed: v0.7.0)*

- [x] **#2 — Same-device logout + re-login creates a new spreadsheet**
  `Settings/index.tsx` — Drive IDs no longer cleared on logout. Account-switch detection added in `App.tsx`. *(Fixed: v0.7.0)*

- [x] **#3 — Infinite loading screen when silent refresh fails**
  `App.tsx` `initCloud()` — Changed the silent `return` to call `setCloudInitialized(true)` first, so the spinner always resolves. When the token can't be refreshed the Session Expired banner appears instead of a frozen screen. *(Fixed: v0.7.1)*

- [x] **#4 — Silent cloud failure shows fake idle status**
  `App.tsx` `initCloud()` catch block — Now catches error, sets an `initError` state, and displays a dedicated full-screen connection error state with "Retry Connection" and "Sign Out" actions. The app is no longer silently initialized into a broken state. *(Fixed)*

### 🟠 High

- [x] **#5 — Remote data changes silently mid-session on returning device**
  `App.tsx` — On a device where `isCloudInitialized` is already true, the dashboard renders immediately from cache. `initCloud` then runs in the background, reconciles, and calls `hydrateFromSync`. Balances and transactions update with no visual indicator.
  **Fix:** Added a `showSyncToast` state to `App.tsx`. A "Data synced from cloud" toast now appears for 3.5 seconds when `hydrateFromSync` runs on an already-initialized client. *(Fixed)*

- [x] **#6 — Unsaved changes lost on logout without warning**
  `Settings/index.tsx` `handleLogout()` — If `forceSync()` throws (network down), logout proceeds anyway and pending changes are discarded silently.
  **Fix:** Added a custom warning modal that intercepts the logout process if `forceSync` throws and `pendingCount > 0`. Users must explicitly click "Sign Out Anyway" to discard changes, or "Cancel" to retain them locally until connection returns. *(Fixed)*

- [x] **#7 — Onboarding modal fires incorrectly on returning user after cloud init failure**
  `LayoutShell.tsx` — If cloud init fails (catch → `setCloudInitialized(true)`), `accounts.length` is 0 and `hasCompletedOnboarding` is false (settings not pulled). The onboarding wizard appears for a returning user who already has data.
  **Note:** Fully resolved as a side effect of #4. Since `initCloud` now halts the app and shows a full-screen Connection Error instead of silencing the error, `LayoutShell.tsx` (and the onboarding modal) are completely unmounted during a failure. *(Fixed)*

- [x] **#8 — Re-auth via Session Expired banner triggers invisible full re-sync**
  `App.tsx` — Clicking "Reconnect" stores a new token, which re-triggers the `initCloud` effect. A full pull + reconcile runs with no loading state (since `isCloudInitialized` is already true). Data can change mid-interaction with no warning.
  **Fix:** Added a global "Syncing" indicator with a spinning icon directly into `TopBar.tsx` that appears whenever `syncStatus` is `'syncing'` or `'pulling'`, giving the user full visibility during background operations. *(Fixed)*

- [x] **#18 — Duplicate rows created on partial sync batch failure (Idempotent Appends)**
  `SyncEngine.ts` `flush()` processes all entity sheets via `Promise.all`. If one sheet fails, the sync queue is NOT cleared. The next sync retries all ops in the queue. For `create` ops, `flushEntityOps` currently pushes them directly to `newRows` without checking if the entity's ID already exists in `this.rowIndexes`. This results in duplicate row appends on Google Sheets.
  **Fix:** `flushEntityOps` was refactored to treat `create` ops identically to updates. It now checks `rowIndex.get(op.entityId)` before appending, converting redundant appends into safe updates. *(Fixed)*

- [x] **#19 — O(N) performance degradation on row appends**
  `SyncEngine.ts` `flushEntityOps` calls `this.client.getRowCount(sheetName)` after appending rows to calculate the new row indexes. `getRowCount` uses `readSheet()`, which downloads the *entire* sheet contents over the network. For a user with 5,000 transactions, every single new transaction triggers a 5,000-row download.
  **Fix:** `SheetClient.appendRows` was modified to directly parse and return the `updates.updatedRange` provided by the Google Sheets API response, allowing O(1) performance and removing the need to download the sheet. *(Fixed)*

### 🟡 Medium & ⚪ Low

- [x] **#12 — Backup cycle triggered after every single flush**
  `SyncEngine.ts` `flush()` — `BackupManager.runBackupCycle()` is called non-blocking after every successful sync, even if no backup tier is due. On first call of the day this makes a Drive API call to verify the backup folder.
  **Fix:** Tracked a session-scoped static flag (`SyncEngine.backupCheckedThisSession`) so the cycle runs at most once per session, not per flush. *(Fixed)*

- [x] **#11 — "Sync Now" button runs a full pull instead of a targeted push**
  `Settings/index.tsx` `handleManualSync()` — Calls `engine.initialize(spreadsheetId)` which reads all 6 sheets, reconciles every entity, and clears the sync queue. Users expect a fast push of pending changes; instead they wait 2–5 seconds for a full bidirectional sync.
  **Fix:** Modified `handleManualSync` to call `engine.forceSync()` (fast push) if `pendingCount > 0`. It only falls back to the slow `initialize()` pull if there are no pending ops. *(Fixed)*

- [x] **#10 — Onboarding modal cannot be dismissed or skipped**
  `LayoutShell.tsx` — The condition `accounts.length === 0 && !hasCompletedOnboarding` re-triggers the modal on every render until onboarding is completed. There is no "skip for now" path. Users who accidentally open the app before they're ready feel locked out.
  **Fix:** Added a "Skip for now" option to `OnboardingModal` that sets a `sessionStorage` flag (`skipOnboarding`) to suppress the modal until the next login, without marking onboarding as permanently complete. *(Fixed)*

- [x] **#9 — Loading spinner shows wrong message at startup**
  `App.tsx` — While `accessToken && !isCloudInitialized`, the spinner displays *"Syncing your data…"* even before `SyncEngine.initialize()` starts (when `syncStatus` is still `'idle'`). The accurate *"Pulling your data…"* message only appears once the pull begins.
  **Fix:** Changed the fallback message logic in `App.tsx` to read "Connecting to Google Drive..." instead of "Syncing your data..." before the pull officially starts. *(Fixed)*

- [x] **#14 — Logout doesn't clear folder IDs**
  Design decision in v0.7.0: Drive IDs are intentionally kept across logout as connection settings. Account-switch detection handles multi-user scenarios. *(Closed: v0.7.0)*

- [x] **#16 — Orphaned "Sheet1" tab in Moniq Database spreadsheet**
  When a spreadsheet is created via `drive.files.create` with `mimeType=application/vnd.google-apps.spreadsheet`, Google automatically creates a default tab named "Sheet1". `SyncEngine.ensureSheetTabs()` adds the correct tabs (Transactions, Accounts, etc.) but never deletes "Sheet1". It persists visibly in the user's Drive as a confusing empty tab.
  **Fix:** After `ensureSheetTabs` provisions the required tabs, it now sends a `deleteSheet` batch request to prune the default "Sheet1". *(Fixed)*

- [x] **#17 — Duplicate "Moniq Backups" folders inside moniq/ (confirmed post-v0.7.0)**
  Both duplicate folders are inside `moniq/` — not a migration artifact. Two root causes identified and partially fixed:
  1. **Fire-and-forget setMeta**: `setBackupFolderId`, `setFolderId`, `setSpreadsheetId` called `setMeta` without `await`. If the page reloaded in the ~100ms window after the Zustand store updated but before IndexedDB committed, the ID was lost. On next load the ID appeared null → new folder created. **Fixed:** all three setters now `return setMeta(...)` so callers can `await` them, and all creation sites in `api/google.ts` and `BackupManager.ts` now `await` the setter.
  2. **No concurrency guard**: `runBackupCycle` could be called concurrently (e.g., manual "Backup Now" triggers a settings flush which triggers an auto backup cycle). Two concurrent calls could both enter `ensureBackupFolder` with `backupFolderId = null`. **Fixed:** `BackupManager` now has an `isRunning` guard that skips any concurrent invocation.
  **Remaining:** The duplicate folders already in the user's Drive need manual cleanup. Future runs will not create new duplicates.

---

## Summary

| Status | Count |
|---|---|
| ✅ Fixed | 17 (items 1-12, 14, 16, 17, 18, 19) |
| 🔴 Critical remaining | 0 |
| 🟠 High remaining | 0 |
| 🟡 Medium remaining | 2 (items 13, 20) |
| ⚪ Low remaining | 5 (items 15, 21, 22, 23, 24) |
| **Total open** | **6** |