# System Architecture & API Documentation

## 🏗 High-Level Architecture

`moniq` is designed to be a lightweight, serverless (or "bring your own storage") application. 
To prioritize privacy and simplicity, it leverages the user's personal Google Drive via **Google Sheets** as the primary datastore, protected by **Google OAuth.**

### Characteristics

- **Frontend:** Single Page Application (React / Next.js / Vite). Mobile-first, Progressive Web App (PWA) ready.
- **Backend:** Serverless, driven by direct Google Sheets API calls over HTTP.
- **Authentication:** Google Sign-In (OAuth 2.0).
- **Database:** Google Sheets API. Each user will have their own `moniq` spreadsheet created in their Drive on first login.

---

## 🗄 Database Schema (Google Sheets Outline)

Instead of a traditional SQL/NoSQL database, `moniq` uses Tabs in a Google Sheet.

### 1. `Accounts` Sheet (formerly Sources)
Stores all custom accounts, wallets, etc. These are the source of truth for money.
* `id` (UUID)
* `name` (String: e.g., "SBI Savings", "HDFC Credit Card")
* `type` (String: "Asset", "Liability")
* `description` (String, optional: Free-text for user identification, e.g. "Bank", "Cash", "Receivable")
* `initialBalance` (Number)
* `isSavings` (Boolean)
* `excludeFromNet` (Boolean)
* `isActive` (Boolean)
* `createdAt` (ISO Date string)

### 2. `Methods` Sheet
Stores payment channels (abstractions over accounts).
* `id` (UUID)
* `name` (String: e.g., "UPI", "Net Banking")
* `linkedAccountId` (UUID of Account)
* `isActive` (Boolean)
* `sortOrder` (Number, optional)
* `createdAt` (ISO Date string)

### 3. `Categories` Sheet
Holds headers and subheaders for tracking.
* `id` (UUID)
* `group` (String: "Income", "Needs", "Wants", "Invest", "Lend", "Borrow")
* `head` (String: e.g., "Food")
* `subHead` (String: e.g., "Groceries")
* `isActive` (Boolean)
* `sortOrder` (Number, optional)

### 4. `Transactions` Sheet
The core event log based on a **Double-Entry Ledger System**. 
* `id` (UUID)
* `groupId` (UUID, used to bind related entries)
* `date` (ISO Date string)
* `amount` (Number: Total transaction amount)
* `entries` (JSON String: Balanced LedgerEntry objects `[{ accountId, type: 'DEBIT' | 'CREDIT', amount }]`)
* `uiType` (String: "income", "expense", "transfer")
* `methodId` (UUID from Methods)
* `note` (String)
* `isDeleted` (Boolean)
* `updatedAt` (ISO Date string)

### 5. `Budgets` Sheet
Handles monthly salary budgeting and category allocations.
* `id` (UUID)
* `categoryId` (UUID)
* `amount` (Number)
* `period` (String: "YYYY-MM")
* `createdAt` (ISO Date string)

---

## 🔌 API & Integration Layers

### 1. Google OAuth Authentication
- Scopes required: `email`, `profile`, `https://www.googleapis.com/auth/drive.file`
- A specific app-level directory or spreadsheet is created by the app, which satisfies the `drive.file` scope (app only accesses files it created itself, minimizing security panics for users).

### 2. Google Sheets API Client
The app will wrap Google Sheets API v4 with a client abstraction.

- **Initialization Flow:**
  1. Login with Google.
  2. Search Drive for a file named `moniq-data-X`.
  3. If not found, create a new spreadsheet via `POST https://sheets.googleapis.com/v4/spreadsheets`.
  4. Create the necessary sheets (tabs) and header rows.
- **CRUD Operations:**
  - `GET`: `spreadsheets.values.get` to read chunks or whole tables.
  - `POST`: `spreadsheets.values.append` to strictly append new transactions.
  - `PUT`: `spreadsheets.values.update` for editing existing records (updating specific cells).
  - `DELETE`: Rather than deleting rows and messing up indices, use soft deletes (setting an `is_deleted` column to true or updating the row).

### 3. State Management & Sync (Client-Side)
- **Local Storage:** `zustand/persist` with a custom IndexedDB adapter (`idb` library). The IDB database `moniq-db` stores entities across dedicated object stores (accounts, methods, categories, transactions, budgets, settings, sync_queue, remote_snapshot, meta).
- **Optimistic UI:** Mutations update the Zustand store immediately. The SyncEngine is notified via `markDirty()` and debounces writes (3s window) before flushing only changed rows to Google Sheets.
- **SyncEngine (`src/sync/`):**
  - **Pull (initialization):** On login, reads all sheet tabs → writes to IDB shadow tables → reconciles local vs remote using `updatedAt` timestamps and row checksums → hydrates the Zustand store with the reconciled result.
  - **Push (flush):** Groups dirty operations by entity type. Uses `append` for new rows and `batchUpdate` for existing rows (via a maintained row-index map). Never clear-and-rewrite.
  - **Conflict resolution:** Sheet is source of truth. Checksum column on each row detects manual sheet edits (where `updatedAt` doesn't change). Newer `updatedAt` wins; ties go to remote.
  - **Retry:** Failed operations stay in a persistent sync queue (IDB) and retry with exponential backoff (1s → 2s → 4s → ... → 60s cap).
  - **Status:** Reactive `syncStatus` (`idle` | `syncing` | `pulling` | `error` | `offline`) and `pendingCount` exposed to the UI.
- **Onboarding:** New users are presented with an interactive onboarding modal that offers curated default accounts and categories from `src/data/defaults.json`, or the option to start from scratch.
- **Deletion Safety:** Entities (accounts, categories, payment methods) can be archived (soft-delete) or permanently deleted only if no transactions reference them. Deleting an account cascade-removes its linked payment methods if they are also unreferenced.

