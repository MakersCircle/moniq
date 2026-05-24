# Moniq Task List

## To-Do

### High Priority (P0) - Mobile & UX

- [ ] **Mobile Experience & PWA.**
    - [ ] Ensure entire webapp is mobile-friendly with responsive layouts.
    - [ ] Create a dedicated layout optimized for mobile devices.
    - [ ] Implement "Add to Home Screen" (PWA) installation prompts for mobile users.

- [ ] **Advanced Analytics & Custom Dashboards.**
    - [ ] Improve usability of Dashboard and Insights pages.
    - [ ] Implement Custom Dashboard feature allowing users to create charts.
    - [ ] Provide variables/filters (month, date range, etc.) for dynamic chart generation.

### Medium Priority (P1) - Core Features

- [ ] **Budgeting System.**
    - [ ] Implement budget setting for categories (monthly/annual).
    - [ ] Create Budget vs. Actual tracking logic.
    - [ ] Add budgeting insights to the Dashboard (progress bars, alerts).
    - [ ] Create a dedicated Budgets page for detailed management.

### Low Priority (P2) - Polish & Future

- [ ] **Monetization & Roadmap.**
    - [ ] Find ways to monetize (analytics with AI?).
    - [ ] Keep usable/reliable free version without data collection.
    - **Context:**
        - Product vision emphasizes privacy and direct Google Sheets storage (`docs/product_vision.md`).
        - Roadmap Phase 6/7 mentions "Intelligent Auto-Categorization" which could be an AI-powered entry point.

- [ ] **Testing Cases.**
    - [ ] i paid money for team lunch, got split from friends. food category shoud show final amt of only my share
    - [ ] took a loan, paid some amount
    - [ ] find use cases for each category types

- [ ] **SEO Optimization.**
    - [ ] Do everything possible for SEO (meta tags, descriptions, titles, semantic HTML, structured data, performance optimization).

---

## Completed

### High Priority (P0) - Data Integrity & Core Logic

- [x] **Data Conflict Resolution.** *(Implemented in SyncEngine v0.2.0)*
    - [x] Establish Google Sheet as the absolute source of truth.
    - [x] Create a mechanism to detect and fix conflicts between the local DB and the sheet during sync (checksum + updatedAt comparison, auto-resolve with sheet-wins policy).

- [x] **Sync Optimization & Rate Limiting.** *(Implemented in SyncEngine v0.2.0)*
    - [x] Debounced sync (3s window) — only sends dirty entities, not full state.
    - [x] Row-level writes (append/update) instead of clear-all + dump-all.
    - [x] Implement exponential backoff for rate limit errors in the background (save locally first, then sync to Google Sheets).

- [x] **Automated Tiered Backup System (Google Drive).**
    - [x] Implementation Plan: [backups_implementation_plan.md](file:///home/don/.gemini/antigravity/brain/a8eda8c6-0b26-4832-9c05-536f03537399/backups_implementation_plan.md)
    - [x] Create `BackupManager` to handle Drive folder discovery and file cloning.
    - [x] Implement tiered retention logic (Daily: 7 days, Weekly: 5 weeks, Monthly: 12 months, Yearly: infinite).
    - [x] Integrate into `SyncEngine` post-sync callback for intelligent triggering.
    - [x] Add "Last Backup" status to Settings UI.

- [x] **Storage Verification.** *(Implemented in SyncEngine v0.2.0)*
    - [x] Migrated to IndexedDB via `idb` library + custom Zustand persist adapter.
    - [x] Local-first: all mutations save to IDB immediately, then SyncEngine pushes deltas to Sheets.
    - **Context:**
        - `dataStore.ts` uses `zustand/persist` with `idbStorage` adapter (IndexedDB `moniq-db`).
        - Sync via `SyncEngine.markDirty()` → debounced flush → `SheetClient` row-level writes.
        - Old `syncDataToGoogleSheets` (clear+dump) has been removed.

- [x] **Phase 1: Enhanced Deletion & Archiving (v0.3.0)**
    - [x] Refactor Transaction, Account, Method, and Category storage to support `isDeleted` key (soft delete).
    - [x] Create centralized "Recently Deleted" (Trash) workspace in Settings.
    - [x] Refine Trash UI with a Tabbed interface (Transactions, Accounts, Methods, Categories).
    - [x] Implement Restore logic with dependency safety (Account restoration cascades to Methods).
    - [x] Add restoration validation (preventing orphaned entries).

- [x] **Phase 2: Sync Engine Reliability & Migration**
    - [x] Implement Master Repair (Header correction)
    - [x] Implement Dynamic Mapping (Index-independent parsing)
    - [x] Handle Google Sheets serial dates (46130 style)
    - [x] Migrate legacy "Sources" to "Methods"

- [x] **Phase 3: Greenfield Audit & Cleanup**
    - [x] Silence sync diagnostic logs for production cleanliness
    - [x] Isolate legacy migration helpers in Sync Engine
    - [x] Refactor navigation logic in App.tsx to use explicit onboarding flag
    - [x] Silence diagnostic logs in BackupManager for production cleanliness.

- [x] **Phase 4: Transaction Detail & Editing**
    - [x] Create detailed transaction view (modal/drawer)
    - [x] Implement editing logic for existing transactions (ensuring double-entry integrity)

- [x] **Data Model Fields Updates.** *(Implemented in SyncEngine v0.2.0)*
    - [x] Added `updatedAt` field to Account, PaymentMethod, Category, and Budget types.

### Medium Priority (P1) - Features & UX

- [x] **Simplify initialization/onboarding.**
    - [x] No need for default accounts, category, pay methods by default.
    - [x] Curate general defaults (Account 1, Cash, etc.) added only if user wants.
    - [x] **New Device Handshake**: Enhanced the onboarding logic to wait for cloud synchronization. This prevents users from seeing the onboarding modal on new devices when they already have remote data.
    - [x] **Visual Feedback**: Added descriptive sync status messages on the loading screen to inform users during the data pulling phase.

- [x] **Create Category**
    - [x] creating a new category - main head can be selected from existing or can be created newly
    - [x] info for create new category under settings

- [x] **Custom Ordering for Payment Methods & Categories.**
    - [x] Add ability to reorder Payment Methods in Settings.
    - [x] Add ability to reorder Categories in Settings.
    - [x] Ensure the custom order is reflected in the transaction entry dropdowns.
    - **Context:**
        - Currently, these lists are likely sorted alphabetically or by creation date.
        - Need to add a `sortOrder` field to `PaymentMethod` and `Category` types in `src/types.ts`.
        - Implement drag-and-drop or simple up/down move logic in the Settings pages.

- [x] **Default Pay Method on Account Creation.**
    - [x] Check logic for account creation.
    - [x] Automatically create a corresponding pay method with the same name as the new account by default.

- [x] **Account Flags Verification.**
    - [x] Verify toggle "Savings" actually does its thing. (Added Liquidity vs Savings breakdown on Dashboard).
    - [x] Verify "Add to Net Worth" (excludeFromNet) works. (Verified in Dashboard.tsx logic).
    - **Context:**
        - `excludeFromNet` is correctly implemented in `src/pages/Dashboard.tsx` (line 31) for calculating Net Worth.
        - `isSavings` is used in `Dashboard.tsx` to distinguish between Liquidity and Savings accounts in the Net Worth breakdown.

- [x] **Transaction Detail View.**
    - [x] View transaction details in a modal or similar overlay when clicking a transaction in the listing.

### Low Priority (P2) - Polish & Future

- [x] **Documentation Update.**
    - [x] Update README with correct instructions and project status.
    - **Context:**
        - README now accurately reflects IndexedDB usage (implemented in SyncEngine v0.2.0).
        - Updated for v0.5.0 features including Speed Entry, Custom Ordering, and Backups.

### General Improvements

- [x] **Refine add account modal.**
    - [x] Remove sub types, instead use description.
    - [x] Check other modals as well.
    - **Context:**
        - Current implementation is in `src/pages/Settings/Accounts.tsx` (lines 28, 135, 208).
        - Types are defined in `src/types.ts` as `subType: string` (line 11).
        - Modal uses a `Select` for `ACCOUNT_SUBTYPES`.

---

## Technical Context Notes (from Model Analysis)

### Account Data Structure
The `Account` interface in `src/types.ts` needs to be updated:
- Remove `subType`
- Add `description` (optional)
- Ensure Modal in `Accounts.tsx` reflects this change.

### Storage Engine
✅ **Resolved (v0.2.0):** Migrated to IndexedDB via `idb` library with custom Zustand persist adapter (`src/lib/idbStorage.ts`). IDB database `moniq-db` with 9 object stores. Old `localStorage` approach removed.

### Deletion Safety & Trash Logic
✅ **Resolved (v0.3.0):** Implemented a comprehensive soft-delete architecture.
- All core entities now support `isDeleted: boolean`.
- Centralized `Trash.tsx` with Tabbed UI and sorting.
- `restoreAccount` in `dataStore.ts` handles cascading restoration for linked methods.
- UI-level validation prevents restoring transactions or methods if their parent accounts are deleted.

### Savings Logic
"Savings" flag could be used in `Dashboard` or a new `Savings` page to:
- Show total "Liquidity" vs "Long-term Savings".
- Track progress against savings goals.
