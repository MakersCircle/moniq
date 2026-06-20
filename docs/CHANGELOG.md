# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed
- **Sync Now Performance** (`Settings/index.tsx`): Fixed an issue where clicking the "Sync Now" button always triggered a full bidirectional pull (which is slow). It now smartly performs a highly targeted "delta push" of pending changes, falling back to a full pull only if there are no pending operations.
- **Silent Cloud Failure** (`App.tsx`): Fixed a critical bug where cloud initialization errors were swallowed and the app was loaded in a broken sync state without user feedback. Added a dedicated full-screen connection error state with "Retry Connection" and "Sign Out" actions to properly surface Drive/Sheets errors to the user.
- **Authentication Resilience**: Fixed an issue where background token refresh timeouts could silently abort the initialization process, permanently locking the sync queue.
- **Cross-Account Data Leakage**: Added a safety measure to completely wipe local IndexedDB data if a different Google account logs in on the same browser, preventing cross-contamination of Drive spreadsheets.
- **Dismissible Onboarding**: Added a "Skip for now" button to the initial setup modal. This suppresses the modal for the remainder of the session without permanently marking onboarding as complete, preventing users from getting locked out if they aren't ready to set up accounts.
- **Duplicate Row Prevention**: The Sync Engine now employs strictly idempotent operations. If a background sync fails halfway through, the engine will safely resume and update existing rows instead of accidentally appending duplicate transactions.
- **O(N) Append Performance**: Modified the Sync Engine to extract row indexes directly from the Google Sheets API response when appending data, eliminating a massive O(N) network bottleneck where the entire sheet was re-downloaded just to count the rows.
- **Sync Engine Retries**: Properly destroy the Sync Engine background polling loop upon user logout, fixing a memory and API request leak.
- **Duplicate Backup Folders**: Prevented the creation of duplicate `Moniq Backups` folders across different devices by implementing a pre-creation folder search.
- **Orphaned Sheets**: The Sync Engine now automatically deletes the default, empty `Sheet1` tab when provisioning a new Google Spreadsheet.
- **Onboarding Navigation**: Fixed a routing loop that forced brand new accounts back to the landing page immediately after logging in, preventing them from seeing the onboarding wizard.

### Added
- **Detailed Sync Tooltips**: The pending changes indicator in Settings now displays a detailed list of all locally modified items waiting to be synced to the cloud.

### Changed
- **Onboarding UX**: Redesigned the onboarding flow. Replaced fragile DOM-spotlight navigation steps with a linear sequence of interactive, custom setup modals (`Welcome` → `Preferences` → `Accounts` → `Methods` → `Categories`). Users can fully edit Accounts and Categories inline before saving.
- **Tour Stability**: Fixed race conditions where the tour engine would silently abort by trying to highlight elements before the React router finished rendering them. Implemented robust DOM polling (`waitForElement`) for guaranteed, reliable step transitions.
- **Tour Styling**: Fixed a CSS conflict where a solid black background was painted over the `driver.js` SVG cutout, causing highlighted targets to appear dim. Highlighted elements now correctly shine through at 100% brightness. Separated custom button CSS from the built-in tour close button (`×`) to prevent layout distortions.

---

## [0.7.1] - 2026-05-25

### Fixed
- **Infinite Loading Screen** (`App.tsx`): Fixed a critical bug where a failed silent token refresh resulted in an infinite loading spinner. Now appropriately resolves the spinner to show the Session Expired banner.
- **Duplicate Backup Folders** (`api/google.ts`, `BackupManager.ts`):
  - Fixed a race condition causing multiple "Moniq Backups" folders. Google Drive IDs are now properly awaited before IndexedDB persistence, preventing null-ID bugs upon immediate page reload.
  - Added a concurrency guard (`isRunning`) to `BackupManager` to prevent overlapping auto-backup cycles when `forceSync` is manually triggered.
- **Housekeeping**: Moved `todo.md` to `docs/` and added temporary files/folders (`lint_report.txt`, `scratch/`) to `.gitignore`.

---

## [0.7.0] - 2026-05-24

### Changed
- **Security / OAuth Scopes**: Dropped the `spreadsheets` (sensitive) scope entirely. Moniq now
  requests only `drive.file` + `userinfo.profile` + `userinfo.email` — all classified as
  **non-sensitive** by Google. This eliminates the need for a security assessment or demo video
  for OAuth verification.
- **Drive Initialization Architecture** (`api/google.ts`): Replaced the single-strategy
  approach with a **three-tier resolution** for both the root folder and the spreadsheet:
  (1) Persisted IndexedDB ID — fast path, same device; (2) `drive.file`-scoped `files.list`
  search — recovers the existing file on a new device or after cache loss; (3) Create new —
  true first-run only. This fully resolves the cross-device data loss bug.
- **Spreadsheet Creation**: Uses `driveRequest('/files')` with
  `mimeType: application/vnd.google-apps.spreadsheet` (Drive API), which is compatible with
  `drive.file` scope without needing the `spreadsheets` scope.
- **BackupManager** (`sync/BackupManager.ts`): `ensureBackupFolder()` now uses the persisted
  `backupFolderId` from the store. The backup folder is nested inside `moniq/` and its ID is
  persisted to IndexedDB after creation.
- **Logout Behavior** (`Settings/index.tsx`): Drive IDs (`spreadsheetId`, `folderId`,
  `backupFolderId`) are no longer cleared on logout. They are connection settings that must
  survive the logout/login cycle so the same user reconnects to their existing sheet immediately
  without an unnecessary Drive API search.
- **Account-Switch Detection** (`App.tsx`): On every login, the signed-in user's email is
  compared to a persisted `userEmail` key in IndexedDB. If a different Google account is
  detected on the same device, all Drive IDs are cleared before `initializeDatabase` runs,
  ensuring each user connects only to their own data.
- **Store** (`store/slices/syncSlice.ts`, `store/types.ts`): Added `folderId` and
  `backupFolderId` fields to the sync slice with full persist/rehydrate support via
  `setMeta` / `getMeta` in IndexedDB.
- **Privacy Policy**: Updated Google API Permissions section to accurately reflect only the
  three non-sensitive scopes with explanatory copy.

## [0.6.1] - 2026-05-04

### Added
- **UI Polish**: Added premium "Beta" tags near the application name in both the top and bottom sections of the sidebar for better status visibility.
- **Legal**: Implemented standalone `/privacy-policy` and `/terms-of-service` pages with a premium glassmorphic design and Grainient backgrounds.
- **Documentation**: Made the documentation (`/docs`) accessible without authentication and added a direct link to the landing page footer.

## [0.6.0] - 2026-05-03

### Added
- **Custom Ordering**: Implemented drag-and-drop reordering for Payment Methods and Categories in Settings.
  - Manual sort order is now persisted to Google Sheets ('Sort Order' column).
  - Custom order is automatically reflected in transaction modal dropdowns and budget views.
  - Refined UX: Enhanced drag-and-drop feedback with opaque backgrounds, dynamic shadows, and high-z-index layering to prevent sidebar overlap.
- **Category UX**: Replaced the native `datalist` for Category Head with a custom, searchable `Popover` dropdown in the Add Category modal.
  - Supports filtering existing heads as you type.
  - Allows typing a completely new head if it doesn't exist.
  - Removes the separate info tooltip in favor of a cleaner, integrated dropdown experience.
  - Fixed interaction issues where typing was blocked by PopoverTrigger event interception.
- **Documentation**: Updated `README.md` to accurately reflect the v0.5.0 status, core features, and technical architecture (IndexedDB + Delta Sync).
  - Cleaned up broken documentation links and added `Code Quality` guide to the main documentation list.

### Fixed
- **Linting**: Resolved unused `PopoverTrigger` in `Categories.tsx` that was causing pre-commit hook failures.

## [0.5.0] - 2026-05-03

### Added
- **Speed Entry Overhaul**: Implemented a streamlined transaction entry workflow designed for bulk data entry.
  - **Save & Add Another**: Support for `Cmd/Ctrl + Enter` to save a transaction and immediately start a new one without closing the modal.
  - **Continuous Context**: Automatically persists `Date` and `Payment Method` between entries during a single session.
  - **Smart Defaults**: The modal now defaults to the most recently used payment method upon first opening.
  - **Focus Flow Optimization**: Refined tab order (`Amount` → `Date` → `Method` → `Category` → `Sub-category` → `Note`) and automatic field focusing for zero-mouse operation.
  - **Keyboard Shortcuts**: Native `Enter` key support for saving, and `Alt/Cmd + 1/2/3` for rapid switching between Expense, Income, and Transfer tabs.
- **Enhanced Validation**: The "Save" button now remains disabled until all required fields (Amount, Date, Method, Category) are valid.
- **Negative Amount Prevention**: Restricted the amount input to positive numbers and blocked non-numeric symbols (`e`, `+`, `-`).
- **Dropdown Keyboard Navigation**: Added "type-to-select" support to all payment method and category dropdowns for high-speed, keyboard-driven selection.
- **Notes Shortcut**: Updated `Enter` in the Notes field to trigger a save, while `Shift + Enter` is now used for new lines. Added a visual hint to the UI.
- **Save & Stay UX**: Enhanced the `Cmd/Ctrl + Enter` workflow with a 'Saved' visual indicator and automatic focus resetting. Now clears all fields (Amount, Note, Category, Transfers) except for Date and Payment Method to support rapid, varied entry.
- **Global Shortcuts**: Added `Alt + N` to open the modal, and `Shift + E/I/T` to instantly open and switch to a specific transaction type from any page.
- **Shortcut Documentation**: Created a dedicated Keyboard Shortcuts page in the Help Center.

### Fixed
- **Sync Reliability**: Resolved a lifecycle issue where background synchronization could stop responding due to stale subscriptions or race conditions.
- **Immediate Sync Visibility**: Fixed a bug where pending change counts were not immediately reflected in the UI upon transaction entry.
- **DatePicker Initialization**: Fixed an issue where the date picker would appear empty or fail to initialize when opening the modal.
- **Smart Date Entry**: Added support for shorthand date entry (`ddmm` for current year) and flexible formatting (`ddmmyyyy`, `dd-mm-yyyy`, etc.).

---


## [0.4.0] - 2026-05-02

### Added
- **Dashboard Breakdown**: Added a "Liquidity vs Savings" breakdown in the Net Worth stat card to better utilize the `isSavings` account flag.

### Fixed
- **Cleanup & Reliability**: 
  - Silenced all diagnostic `console.log` calls in `BackupManager` for a cleaner production console.
  - Verified and confirmed that `excludeFromNet` and `isSavings` flags are correctly integrated into the application logic.
  - Conducted a code audit to ensure all recent React Hook and `setState` lint warnings have been resolved.

- **Code Quality**: Conducted a comprehensive pass to resolve all remaining TypeScript warnings and ESLint errors across the codebase.
- **Backups**: Clicking "Backup Now" in Settings was silently doing nothing if a backup had already run automatically earlier that day. It now always creates a fresh backup immediately, regardless of schedule. Each manual backup creates a new copy in your "Moniq Backups" Drive folder.

---

## [0.3.2] - 2026-04-26

### Added
- **Environment Stabilization**: Integrated ESLint, Prettier, Husky, and lint-staged for consistent code quality.
- **Type Safety Pass**: Conducted a comprehensive pass to remove `any` types and improve TypeScript definitions (Step 2).

### Changed
- **Zustand Refactor**: Sliced the monolithic `dataStore` into domain-specific slices (`transactionSlice`, `budgetSlice`, `categorySlice`, etc.).

### Fixed
- **Store Initialization**: Restored missing transactions and `spreadsheetId` in the database initialization routine.
- **Testing**: Fixed missing `isDeleted` property in `LedgerEngine` mock data for unit tests.

---

## [0.3.1] - 2026-04-25

### Added
- **Project Audit**: Completed a comprehensive code audit and updated technical documentation.

---

## [0.3.0] - 2026-04-25

### Added
- **Trash Management**: Enhanced the "Recently Deleted" page with a tabbed interface and cascading restoration.
- **Soft-Delete Logic**: Implemented the core soft-delete architecture and synchronization logic.
- **UI Filtering**: Updated UI components to filter out soft-deleted entities by default.

### Changed
- **Milestone Update**: Updated documentation and roadmap to reflect the v0.3.0 release.

---

## [0.2.9] - 2026-04-24

### Added
- **Backups**: Implemented the automated tiered backup system.

---

## [0.2.8] - 2026-04-24

### Added
- **Security**: Implemented proactive Google OAuth refresh and session expired UI.
- **Roadmap**: Updated the roadmap with onboarding and synchronization improvements.

### Fixed
- **Onboarding**: Prevented the onboarding modal from appearing before cloud sync completes.

---

## [0.2.6] - 2026-04-19

### Changed
- **Cleanup**: Pruned unused variables in `TransactionDetailPanel.tsx`.
- **Roadmap**: Updated the roadmap and version to 0.2.8.

### Fixed
- **State Store**: Restored missing function signatures in `dataStore.ts`.
- **TypeScript**: Resolved TS2339 errors and pruned unused code.

---

## [0.2.4] - 2026-04-19

### Added
- **UX**: Added contextual help and a head-category combobox to the Categories page.
- **UI**: Refactored `InfoTooltip` into a reusable component.
- **Ordering**: Added optional `sortOrder` field to Payment Methods and Categories.

### Fixed
- **Localization**: Recalculated and persisted currency symbols on updates to currency or locale.

---

## [0.2.3] - 2026-04-19

### Added
- **Google API**: Centralized Google API logic and implemented silent token refresh.

---

## [0.2.1] - 2026-04-19

### Fixed
- **UX**: Removed required validation for initial balance and added a placeholder.

---

## [0.2.0] - 2026-04-19

### Added
- **Sync**: Implemented self-healing sync client initialization.
- **Data Safety**: Implemented hard reset and greenfield data cleanup.
- **Sync v3**: Implemented dynamic column mapping, header repair, and serial date recovery.
- **Trash**: Implemented the "Recently Deleted" workspace with restoration and sorting.
- **Engine**: Replaced `localStorage` with an IndexedDB delta-sync engine.

---

## [0.1.2] - 2026-04-19

### Added
- **UI**: Restructured the transaction modal - method-only for income/expense and head/subhead categories.
- **UX**: Added `InfoTooltips` to the Payment Methods page.
- **Aesthetics**: Added dynamic display of app version from `package.json`.
- **Safety**: Implemented safe deletion with an archive-first flow for accounts, methods, and categories.

### Changed
- **Strategy**: Updated architecture, roadmap, and vision to reflect recent changes.

### Fixed
- **UI**: Updated the destructive color for better visual clarity.
- **UX**: Updated the default method name to match the account name.

---

## [0.1.1] - 2026-04-18

### Added
- **Onboarding**: Implemented curated defaults and an interactive onboarding modal.
- **UX**: Refined the account modal, added tooltips, and switched to description-over-subType.
- **Engine**: Implemented the double-entry ledger engine and refactored types.
- **Engine**: Updated the data store to use ledger entries and refactored computed hooks.
- **UI**: Added a checkbox UI component and updated category grouping.
- **Sync**: Updated Google Sheets sync and CSV export for the ledger schema.
- **Testing**: Setup Vitest and implemented ledger engine unit tests.

### Changed
- **Architecture**: Renamed "Sources" to "Accounts" and updated relationship models.
- **Strategy**: Updated architecture and vision for double-entry accounting.

### Fixed
- **Auth**: Handled expired tokens and redirected to the dashboard on login.
- **Localization**: Improved currency selection and regional number formatting.
- **UI**: Resolved scoping and state regressions in `AddTransactionModal`.

---

## [0.1.0] - 2026-04-11

### Added
- **UX**: Optimized the Home page layout and improved content structure.
- **Aesthetics**: Implemented a dynamic animated background using the `Grainient` component.
- **Aesthetics**: Conducted a brutalist redesign of the login page with Radlush typography.
- **UI**: Overhauled the Add Transaction modal and implemented a hybrid DatePicker.
- **Docs**: Added user flow and desktop UI prototype documentation.
- **UI**: Improved navigation with back-buttons and fixed UI regressions.
- **Platform**: Added global error boundary and PWA support.
- **UI**: Initialized `shadcn/ui` and utility library.
- **Style**: Migrated to Tailwind CSS v4 and cleaned up legacy CSS.
- **Auth**: Integrated Google OAuth and defined data stores.
- **Sync**: Implemented the Google Sheets data sync routine.
- **Initial**: Initial commit for Moniq MVP (Vite, React, Zustand).

### Changed
- **Aesthetics**: Replaced `hover-gradient-brand` with `hover-primary-brand` for consistency.
- **Aesthetics**: Replaced the Login page with the Home page and added conditional navigation.
- **Cleanup**: Removed font files from the root directory.
- **UI**: Streamlined the sidebar and cleaned up profile UI redundancy.
- **UI**: Fine-tuned settings dual-pane scrolling and application scrollbars.
- **UI**: Contained the scrollbar below the top header in the global layout.
- **Docs**: Updated README and restructured documentation into the `docs/` folder.
- **Docs**: Added future scale and UX optimizations to the features list.
- **Environment**: Added `.gitignore` for `.env` files and community standards.
