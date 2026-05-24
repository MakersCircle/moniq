# Moniq — Complete Application Flow

> Mapped directly from source code (App.tsx, api/google.ts, SyncEngine.ts, BackupManager.ts, ConflictResolver.ts, syncSlice.ts).

---

## 1. App Boot & Local Hydration

Every time the app loads, regardless of auth state:

```mermaid
flowchart TD
    A([Browser loads app]) --> B[App.tsx mounts]
    B --> C[initializeFromDB\nsynSlice.ts]
    C --> D[Read from IndexedDB in parallel:\naccounts · methods · categories\ntransactions · budgets · settings\naccessToken · tokenExpiresAt\nspreadsheetId · folderId · backupFolderId\nuserProfile · lastSyncedAt]
    D --> E{accessToken\nfound?}
    E -->|No| F[isHydrated = true\nRender → Home page]
    E -->|Yes| G[isHydrated = true\nRender → Loading spinner\nCloud init begins ↓]
```

---

## 2. Sign-In Flow

```mermaid
flowchart TD
    A([User clicks Sign in with Google]) --> B[useGoogleLogin fires\nHome.tsx]
    B --> C[OAuth consent screen\nScopes: drive.file\nuserinfo.profile · userinfo.email]
    C -->|User approves| D[access_token + expires_in received]
    D --> E[setAccessToken → store + IndexedDB]
    E --> F[Navigate to /dashboard\nCloud init effect triggers in App.tsx]
    C -->|User denies| Z([Stay on Home page])
```

---

## 3. Cloud Initialization — The Central Decision Point

This runs on every login (new device or returning session).

```mermaid
flowchart TD
    START([accessToken + isHydrated = true]) --> P[fetchUserProfile\nDisplay name + avatar]
    P --> INIT[initializeDatabase\napi/google.ts]

    INIT --> FID{folderId\nin IndexedDB?}
    FID -->|Yes| FVERIFY[GET /files/folderId?fields=id,trashed\nVerify still alive]
    FVERIFY -->|OK| SID{spreadsheetId\nin IndexedDB?}
    FVERIFY -->|Trashed / 404| FCREATE
    FID -->|No| FCREATE[POST /files\nmimeType: folder\nname: moniq]
    FCREATE --> FSAVE[Save folderId → IndexedDB]
    FSAVE --> SID

    SID -->|Yes| SVERIFY[GET /files/spreadsheetId?fields=id,trashed\nVerify still alive]
    SVERIFY -->|OK| ENGINE[SyncEngine.initialize spreadsheetId]
    SVERIFY -->|Trashed / 404| SCREATE
    SID -->|No| SCREATE[POST /files\nmimeType: application/vnd.google-apps.spreadsheet\nparents: folderId\nname: Moniq Database]
    SCREATE --> SSAVE[Save spreadsheetId → IndexedDB]
    SSAVE --> ENGINE

    ENGINE --> TABS[ensureSheetTabs\nTransactions · Accounts · Methods\nCategories · Budgets · Settings]
    TABS --> HEADERS[ensureHeaders on each tab\nRepair if column mismatch found]
    HEADERS --> PULL[Read all 6 sheets in parallel\nSheetClient.readSheet ×6]
    PULL --> RECONCILE[reconcile × 5 entity types\nConflictResolver.ts]
    RECONCILE --> MERGE[Merged result → IndexedDB\nputMany × 5 stores]
    MERGE --> PUSH[Push local-wins back to sheet\nbatchUpdateRows / appendRows]
    PUSH --> CLEAR[clearSyncQueue\nsetMeta lastSyncedAt]
    CLEAR --> HYDRATE[hydrateFromSync → Zustand store]
    HYDRATE --> ONBOARD{hasCompletedOnboarding?}
```

---

## 4A. New User — Onboarding Path

```mermaid
flowchart TD
    ONBOARD{hasCompletedOnboarding\n= false AND\naccounts.length = 0} -->|LayoutShell detects| MODAL[Onboarding modal appears\nLayoutShell.tsx]
    MODAL --> SUGGEST[Suggested accounts + categories\npresented to user]
    SUGGEST -->|User accepts / customises| COMPLETE[completeOnboarding\nsettingsSlice.ts]
    COMPLETE --> LOCAL[Write accounts + categories\nto IndexedDB via putMany]
    LOCAL --> MARK[markDirty for each entity\ncreate operations queued]
    MARK --> DIRTY[SyncEngine.markDirty\naddToSyncQueue]
    DIRTY --> DEBOUND[3 s debounce timer starts]
    DEBOUND --> FLUSH[flush → push to Google Sheet]
    FLUSH --> IDLE([syncStatus = idle\nDashboard visible])
```

---

## 4B. Returning User / Cross-Device Sync

> This is the key multi-device scenario. Device B logs in, sees empty local DB but full remote sheet.

```mermaid
flowchart TD
    START([Device B logs in\nIndexedDB empty]) --> INIT[Cloud init runs\nSame path as Section 3]
    INIT --> PULL[Pull all 6 sheets from remote]
    PULL --> RECONCILE[reconcile called:\nlocal = empty arrays\nremote = full data from sheet A]

    RECONCILE --> POLICY{For each entity\ncompare local vs remote}

    POLICY -->|Only in remote| DOWN[→ toDownload\nRemote wins]
    POLICY -->|Only in local| UP[→ toUpload\nLocal wins]
    POLICY -->|Both exist - checksum mismatch| MANUAL[Sheet was manually edited\nRemote wins\nAlso queued to toUpload\nto repair checksum]
    POLICY -->|Both exist - timestamp| TS{updatedAt comparison}
    TS -->|Local newer| UP
    TS -->|Remote newer or equal| DOWN

    DOWN --> MERGE[merged = all remote data\nwriten to IndexedDB]
    UP --> PUSH[Push local-wins to sheet]
    MERGE --> HYDRATE[hydrateFromSync → Zustand]
    HYDRATE --> DONE([Device B fully synced\nAll of Device A's data visible])
```

---

## 5. Live Mutation Delta Sync

Every time the user makes a change (add transaction, edit account, etc.):

```mermaid
flowchart TD
    A([User action:\nadd / edit / delete]) --> B[Zustand store mutation\nOptimistic UI update immediately]
    B --> C[IndexedDB write\nputMany / put]
    C --> D[SyncEngine.markDirty\nentityType · entityId · action]
    D --> E[addToSyncQueue\nIndexedDB sync_queue store]
    E --> F[pendingCount updates\nUI shows N changes pending]
    F --> G[3 s debounce timer\nscheduleDebouncedFlush]
    G -->|More mutations arrive| G
    G -->|3 s silence| FLUSH[flush]

    FLUSH --> CHECK{status = syncing\nor pulling?}
    CHECK -->|Yes| WAIT([Skip — already running])
    CHECK -->|No| DEDUP[Deduplicate queue:\nkeep latest op per entityId]
    DEDUP --> GROUP[Group by entity type]
    GROUP --> OPS[For each entity type:\nflushEntityOps]

    OPS --> EXISTS{Row index\nhas this ID?}
    EXISTS -->|Yes| UPDATE[batchUpdateRows\nwrite to known row number]
    EXISTS -->|No - new entity| APPEND[appendRows\nupdate row index map]

    UPDATE --> SUCCESS[clearSyncQueue\nsetMeta lastSyncedAt\nsyncStatus = idle]
    APPEND --> SUCCESS
    SUCCESS --> BACKUP[BackupManager.runBackupCycle\nnon-blocking]
    SUCCESS --> ERROR

    FLUSH -->|Network failure| ERROR[syncStatus = error\nscheduleRetry with\nexponential backoff\nup to 8 retries · max 60 s]
```

---

## 6. Backup System

Triggered automatically after every successful flush, and manually from Settings.

```mermaid
flowchart TD
    TRIGGER([After successful flush\nOR manual Backup Now]) --> BM[BackupManager.runBackupCycle]

    BM --> TIERS{Which tiers are due?}
    TIERS -->|Manual / force=true| ALL[All 4 tiers]
    TIERS -->|Auto| CHECK[Check settings:\nlastDailyBackup\nlastWeeklyBackup\nlastMonthlyBackup\nlastYearlyBackup]
    CHECK -->|Not backed up today| DAILY[daily tier]
    CHECK -->|Monday + not this week| WEEKLY[weekly tier]
    CHECK -->|1st of month + not this month| MONTHLY[monthly tier]
    CHECK -->|Fiscal year start + not this year| YEARLY[yearly tier]

    ALL --> FOLDER
    DAILY --> FOLDER
    WEEKLY --> FOLDER
    MONTHLY --> FOLDER
    YEARLY --> FOLDER

    FOLDER{backupFolderId\nin store?} -->|Yes| VERIFY[Verify folder alive\nGET /files/id]
    VERIFY -->|OK| COPY
    VERIFY -->|Stale| CREATE
    FOLDER -->|No| CREATE[POST /files\nmimeType: folder\nname: Moniq Backups\nparent: folderId\nSave backupFolderId → IndexedDB]

    COPY[Drive API: /files/spreadsheetId/copy\nnew name: moniq-backup-tier-YYYY-MM-DD\ninto backup folder] --> UPDATE[Update lastXxxBackup in settings\nmarkDirty settings → syncs to sheet]

    UPDATE --> CLEANUP[cleanupOldBackups\nlistFiles with prefix\ndelete oldest beyond limit]

    CLEANUP --> LIMITS["Retention:\nDaily → 7 copies\nWeekly → 5 copies\nMonthly → 12 copies\nYearly → unlimited"]
```

---

## 7. Token & Session Management

```mermaid
flowchart TD
    A([App running with token]) --> B[Proactive check every 60 s\nApp.tsx interval]
    B --> C{tokenExpiresAt\n- 5 min < now?}
    C -->|No| B
    C -->|Yes| D[googleService.silentRefresh\nprompt: none]
    D -->|Success| E[New token stored\nApp continues]
    D -->|Fails user_logged_out| F[setAccessToken null\nSession expired]

    F --> BANNER[SessionExpiredBanner shown\ntop of LayoutShell]
    BANNER -->|User clicks Reconnect| REAUTH[useGoogleLogin fires\nSame scopes]
    REAUTH -->|Success| E

    G([Any API call → 401]) --> H[Reactive refresh attempt\ngoogleService.fetch]
    H -->|Success| RETRY[Retry request once\nwith new token]
    H -->|Fail| F
```

---

## 8. Logout & Hard Reset

```mermaid
flowchart TD
    LOGOUT([User clicks Sign Out]) --> PENDING{pendingCount > 0?}
    PENDING -->|Yes| FORCE[forceSync\nflush immediately]
    FORCE --> CLEAR
    PENDING -->|No| CLEAR[googleLogout\nSyncEngine.reset\nsetAccessToken null\nsetUserProfile null\nsetSpreadsheetId null]
    CLEAR --> HOME([Redirect → Home page\nIndexedDB retained\nNext login re-syncs])

    RESET([User triggers Reset All Data]) --> CONFIRM[Must type exact phrase\nto confirm]
    CONFIRM --> REMOTE[SyncEngine.performHardReset:\nclearAllData on remote sheets]
    REMOTE --> LOCAL2[localStorage.clear\nsessionStorage.clear\ndeleteMoniqDB]
    LOCAL2 --> RELOAD([window.location.href = /\nFull page reload\nReturns to onboarding])
```

---

## Drive Folder Structure

```
Google Drive (root)
└── moniq/                          ← folderId persisted in IndexedDB
    ├── Moniq Database              ← spreadsheetId persisted in IndexedDB
    │   ├── Transactions tab
    │   ├── Accounts tab
    │   ├── Methods tab
    │   ├── Categories tab
    │   ├── Budgets tab
    │   └── Settings tab
    └── Moniq Backups/              ← backupFolderId persisted in IndexedDB
        ├── moniq-backup-daily-2026-05-18
        ├── moniq-backup-weekly-2026-05-12
        ├── moniq-backup-monthly-2026-05-01
        └── moniq-backup-yearly-2026-01-01
```

> All three IDs (`folderId`, `spreadsheetId`, `backupFolderId`) are stored in IndexedDB `meta` store
> and reloaded on every app start — no Drive search queries are needed.

---

## Gap Analysis & Issues Found

| # | Area | Current Behaviour | Issue / Risk |
|---|---|---|---|
| 1 | **Cross-device: new user on Device B** | If Device B has never logged in, `folderId` and `spreadsheetId` are `null` in its IndexedDB. `initializeDatabase` will create **new** empty folder + sheet instead of finding the existing ones from Device A. | **Critical** — Device B will create a second `moniq` folder. Data from Device A is inaccessible. See fix below ↓ |
| 2 | **Onboarding gate** | `LayoutShell` checks `isCloudInitialized && accounts.length === 0 && !hasCompletedOnboarding`. The onboarding modal fires. | If Device B syncs correctly (gap 1 fixed), accounts won't be zero and modal won't show. If gap 1 is not fixed, it shows incorrectly. |
| 3 | **Settings sheet on new device** | Settings (including `hasCompletedOnboarding`) are only read from the sheet during `initialize()`. If the sheet has them, they come down. | Works correctly once gap 1 is fixed. |
| 4 | **Backup folder nesting** | Backup folder is placed inside `moniq/` root. | Good structure. Matches your expectation. |
| 5 | **Concurrent write race** | Two devices open simultaneously, both flush different changes to same row. | Acknowledged as out of scope — last-write-wins via flush. Acceptable for now. |
| 6 | **Logout does not clear folderId** | `handleLogout` calls `setSpreadsheetId(null)` but not `setFolderId(null)` or `setBackupFolderId(null)`. | Minor — on next login, same device reuses the stored IDs correctly. But it should still be cleared for correctness. |

---

## Gap 1 Fix — Cross-Device Folder Discovery

The `drive.file` scope blocks search queries, but we need to find the existing folder on a new device.
The solution is to **store the IDs in the Google Sheet's own Settings tab**.

**Flow:**
1. After `spreadsheetId` is successfully resolved (verified alive), write `folderId` → Settings sheet as a key-value row.
2. On a new device where local `folderId` = null but `spreadsheetId` = null:
   - This is a true first-run → create folder + sheet → works fine.
3. But: on Device B, how do we know the spreadsheet ID if we can't search?
   - **Answer**: The spreadsheet ID needs to travel via the user's own data, not Drive search.
   - **Recommended approach**: Store the spreadsheet ID in the user's `localStorage` keyed by their Google email (`moniq:spreadsheetId:{email}`). On login, fetch the profile first, then look up the email-keyed ID before calling `initializeDatabase`. This gives cross-device lookup without any sensitive scope.

This is the **one remaining architectural gap** to address for a complete multi-device experience.
