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

- [ ] **#4 — Silent cloud failure shows fake idle status**
  `App.tsx` `initCloud()` catch block — Any Drive or Sheets error is swallowed and `setCloudInitialized(true)` is called silently. `SyncEngine` is never initialized, so subsequent mutations queue and flush but never reach the sheet. The sync indicator shows **idle** — no error, no retry.
  **Fix:** Surface the error to the user (toast/banner) with a retry action. Do not initialize the app into a broken sync state silently.

---

## 🟠 High

- [ ] **#5 — Remote data changes silently mid-session on returning device**
  `App.tsx` — On a device where `isCloudInitialized` is already true, the dashboard renders immediately from cache. `initCloud` then runs in the background, reconciles, and calls `hydrateFromSync`. Balances and transactions update with no visual indicator.
  **Fix:** Show a subtle "Synced" toast or indicator after `hydrateFromSync` is called with remote-wins data.

- [ ] **#6 — Unsaved changes lost on logout without warning**
  `Settings/index.tsx` `handleLogout()` — If `forceSync()` throws (network down), logout proceeds anyway and pending changes are discarded silently.
  **Fix:** If `forceSync` fails and `pendingCount > 0`, show a confirmation dialog: *"X changes couldn't be saved. Sign out anyway?"*

- [ ] **#7 — Onboarding modal fires incorrectly on returning user after cloud init failure**
  `LayoutShell.tsx` — If cloud init fails (catch → `setCloudInitialized(true)`), `accounts.length` is 0 and `hasCompletedOnboarding` is false (settings not pulled). The onboarding wizard appears for a returning user who already has data.
  **Note:** Largely resolves itself once #4 is fixed properly — a visible error state prevents the app from looking like a fresh install.

- [ ] **#8 — Re-auth via Session Expired banner triggers invisible full re-sync**
  `App.tsx` — Clicking "Reconnect" stores a new token, which re-triggers the `initCloud` effect. A full pull + reconcile runs with no loading state (since `isCloudInitialized` is already true). Data can change mid-interaction with no warning.
  **Fix:** Show a sync indicator (e.g., spinning icon in TopBar) whenever `initCloud` is running, regardless of `isCloudInitialized` state.

---

## 🟡 Medium

- [ ] **#9 — Loading spinner shows wrong message at startup**
  `App.tsx` — While `accessToken && !isCloudInitialized`, the spinner displays *"Syncing your data…"* even before `SyncEngine.initialize()` starts (when `syncStatus` is still `'idle'`). The accurate *"Pulling your data…"* message only appears once the pull begins.
  **Fix:** Drive the message from a dedicated `initPhase` state rather than `syncStatus`.

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

- [ ] **#16 — Orphaned "Sheet1" tab in Moniq Database spreadsheet**
  When a spreadsheet is created via `drive.files.create` with `mimeType=application/vnd.google-apps.spreadsheet`, Google automatically creates a default tab named "Sheet1". `SyncEngine.ensureSheetTabs()` adds the correct tabs (Transactions, Accounts, etc.) but never deletes "Sheet1". It persists visibly in the user's Drive as a confusing empty tab.
  **Fix:** After `ensureSheetTabs`, call the Sheets API to delete any tab whose name is not in `SHEET_NAMES`.

- [ ] **#17 — Duplicate "Moniq Backups" folders inside moniq/ (confirmed post-v0.7.0)**
  Both duplicate folders are inside `moniq/` — not a migration artifact. Two root causes identified and partially fixed:
  1. **Fire-and-forget setMeta**: `setBackupFolderId`, `setFolderId`, `setSpreadsheetId` called `setMeta` without `await`. If the page reloaded in the ~100ms window after the Zustand store updated but before IndexedDB committed, the ID was lost. On next load the ID appeared null → new folder created. **Fixed:** all three setters now `return setMeta(...)` so callers can `await` them, and all creation sites in `api/google.ts` and `BackupManager.ts` now `await` the setter.
  2. **No concurrency guard**: `runBackupCycle` could be called concurrently (e.g., manual "Backup Now" triggers a settings flush which triggers an auto backup cycle). Two concurrent calls could both enter `ensureBackupFolder` with `backupFolderId = null`. **Fixed:** `BackupManager` now has an `isRunning` guard that skips any concurrent invocation.
  **Remaining:** The duplicate folders already in the user's Drive need manual cleanup. Future runs will not create new duplicates.

---

## Summary

| Status | Count |
|---|---|
| ✅ Fixed | 4 (items 1, 2, 3, 14) |
| 🔴 Critical remaining | 1 (item 4) |
| 🟠 High remaining | 4 (items 5, 6, 7, 8) |
| 🟡 Medium remaining | 7 (items 9, 10, 11, 12, 13, 16, 17) |
| ⚪ Low remaining | 1 (item 15) |
| **Total open** | **13** |


My Findings

1. I found a sheet with name sheet1 in the google drive moniq database
2. I see two Moniq Backups folders. One when i clicked backnow button and it contains all 4 backup tiers (updated time shows 23:32) and in another one, it contains only daily backup file(updated time shows 23:36). In ui, it shows only one backup. rest are shown NEVER. In drive, 