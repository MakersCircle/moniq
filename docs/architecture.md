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
* `class` (String: "Asset", "Liability")
* `subType` (String: "Bank", "Cash", "Credit Card", "Investment", "Other")
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
* `createdAt` (ISO Date string)

### 3. `Categories` Sheet
Holds headers and subheaders for tracking.
* `id` (UUID)
* `group` (String: "Income", "Needs", "Wants", "Invest", "Lend", "Borrow")
* `head` (String: e.g., "Food")
* `subHead` (String: e.g., "Groceries")
* `isActive` (Boolean)

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

### 3. State Management (Client-Side)
- **Local Caching:** Since the database is remote and has API limits, on initialization, the app fetches all rows and loads them into memory/IndexedDB.
- **Optimistic UI:** When user adds a transaction, it updates the UI immediately and background pushes to Sheets. Can use Web Workers.
