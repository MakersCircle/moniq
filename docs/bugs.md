# Moniq — UX & Reliability Bug Tracker

> Identified during flow audit (May 2026). Items 1 and 2 resolved in v0.7.0.

---

## 🔴 Critical

- [x] **#1 — Cross-device creates a fresh account instead of finding existing data**
  `api/google.ts` — Three-tier resolution (IndexedDB → Drive search → create) added. *(Fixed: v0.7.0)*

- [x] **#2 — Same-device logout + re-login creates a new spreadsheet**
  `Settings/index.tsx` — Drive IDs no longer cleared on logout. Account-switch detection added in `App.tsx`. *(Fixed: v0.7.0)*

- [x] **#3 — Infinite loading screen when silent refresh fails**
  `App.tsx` `initCloud()` — Changed the silent `return` to call `setCloudInitialized(true)` first, so the spinner always resolves. When the token can't be refreshed the Session Expired banner appears instead of a frozen screen. *(Fixed: v0.7.1)*

- [x] **#4 — Silent cloud failure shows fake idle status**
  `App.tsx` `initCloud()` catch block — Now catches error, sets an `initError` state, and displays a dedicated full-screen connection error state with "Retry Connection" and "Sign Out" actions. The app is no longer silently initialized into a broken state. *(Fixed)*

---

## 🟠 High

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

---

## 🟡 Medium

- [x] **#9 — Loading spinner shows wrong message at startup**
  `App.tsx` — While `accessToken && !isCloudInitialized`, the spinner displays *"Syncing your data…"* even before `SyncEngine.initialize()` starts (when `syncStatus` is still `'idle'`). The accurate *"Pulling your data…"* message only appears once the pull begins.
  **Fix:** Changed the fallback message logic in `App.tsx` to read "Connecting to Google Drive..." instead of "Syncing your data..." before the pull officially starts. *(Fixed)*

- [ ] **#10 — Onboarding modal cannot be dismissed or skipped**
  `LayoutShell.tsx` — The condition `accounts.length === 0 && !hasCompletedOnboarding` re-triggers the modal on every render until onboarding is completed. There is no "skip for now" path. Users who accidentally open the app before they're ready feel locked out.
  **Fix:** Add a "Skip for now" option that sets a session-scoped flag to suppress the modal until next login, without marking onboarding as complete.

- [ ] **#11 — "Sync Now" button runs a full pull instead of a targeted push**
  `Settings/index.tsx` `handleManualSync()` — Calls `engine.initialize(spreadsheetId)` which reads all 6 sheets, reconciles every entity, and clears the sync queue. Users expect a fast push of pending changes; instead they wait 2–5 seconds for a full bidirectional sync.
  **Fix:** Call `engine.forceSync()` (delta push) first; only fall back to `initialize()` if there are no pending ops and the user explicitly wants a full pull.

- [ ] **#12 — Backup cycle triggered after every single flush**
  `SyncEngine.ts` `flush()` — `BackupManager.runBackupCycle()` is called non-blocking after every successful sync, even if no backup tier is due. On first call of the day this makes a Drive API call to verify the backup folder.
  **Fix:** Track a session-scoped flag (`backupCheckedThisSession`) so the cycle runs at most once per session, not per flush.

- [ ] **#13 — No user feedback during first-ever Drive workspace setup**
  `App.tsx` / `api/google.ts` — On a true first run, `initializeDatabase` creates a folder and a spreadsheet before sync begins. The loading spinner just says *"Syncing your data…"* throughout, which is inaccurate and gives no sense of progress.
  **Fix:** Expose a setup phase (e.g., `initPhase: 'creating-workspace' | 'syncing' | ...`) and display *"Setting up your personal Drive workspace…"* during folder/sheet creation.

---

## ⚪ Low

- [x] **#14 — Logout doesn't clear folder IDs**
  Design decision in v0.7.0: Drive IDs are intentionally kept across logout as connection settings. Account-switch detection handles multi-user scenarios. *(Closed: v0.7.0)*

- [ ] **#15 — Hard reset: IndexedDB deletion may fail silently**
  `SyncEngine.ts` `performHardReset()` — `deleteMoniqDB()` uses `.catch(err => console.error(...))` which silently ignores failures. If the DB is not deleted, stale data re-uploads to the freshly wiped remote sheet on the next login.
  **Fix:** Surface the deletion error to the user and consider blocking the page reload until confirmed deleted (or show a warning that a manual browser cache clear may be needed).

---

## 🟡 From Drive Testing (May 2026)

- [x] **#16 — Orphaned "Sheet1" tab in Moniq Database spreadsheet**
  When a spreadsheet is created via `drive.files.create` with `mimeType=application/vnd.google-apps.spreadsheet`, Google automatically creates a default tab named "Sheet1". `SyncEngine.ensureSheetTabs()` adds the correct tabs (Transactions, Accounts, etc.) but never deletes "Sheet1". It persists visibly in the user's Drive as a confusing empty tab.
  **Fix:** After `ensureSheetTabs` provisions the required tabs, it now sends a `deleteSheet` batch request to prune the default "Sheet1". *(Fixed)*

- [x] **#17 — Duplicate "Moniq Backups" folders inside moniq/ (confirmed post-v0.7.0)**
  Both duplicate folders are inside `moniq/` — not a migration artifact. Two root causes identified and partially fixed:
  1. **Fire-and-forget setMeta**: `setBackupFolderId`, `setFolderId`, `setSpreadsheetId` called `setMeta` without `await`. If the page reloaded in the ~100ms window after the Zustand store updated but before IndexedDB committed, the ID was lost. On next load the ID appeared null → new folder created. **Fixed:** all three setters now `return setMeta(...)` so callers can `await` them, and all creation sites in `api/google.ts` and `BackupManager.ts` now `await` the setter.
  2. **No concurrency guard**: `runBackupCycle` could be called concurrently (e.g., manual "Backup Now" triggers a settings flush which triggers an auto backup cycle). Two concurrent calls could both enter `ensureBackupFolder` with `backupFolderId = null`. **Fixed:** `BackupManager` now has an `isRunning` guard that skips any concurrent invocation.
  **Fix:** `BackupManager` now explicitly runs a Drive search query restricted to the `folderId` to find any existing `Moniq Backups` folder before blindly creating a new one when `backupFolderId` is missing from the local store. *(Fixed)*

---

## Summary

| Status | Count |
|---|---|
| ✅ Fixed | 12 (items 1-9, 14, 16, 17) |
| 🔴 Critical remaining | 0 |
| 🟠 High remaining | 0 |
| 🟡 Medium remaining | 4 (items 10, 11, 12, 13) |
| ⚪ Low remaining | 1 (item 15) |
| **Total open** | **8** |


My Findings

1. I found a sheet with name sheet1 in the google drive moniq database
2. I see two Moniq Backups folders. One when i clicked backnow button and it contains all 4 backup tiers (updated time shows 23:32) and in another one, it contains only daily backup file(updated time shows 23:36). In ui, it shows only one backup. rest are shown NEVER. In drive, 