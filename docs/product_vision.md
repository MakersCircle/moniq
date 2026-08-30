# Product Vision & Requirements

**moniq** is a manual-entry personal finance tracker. Users define their own accounts, payment methods, and categories rather than relying on bank integrations or auto-categorization.

## 1. Product Philosophy

- **Manual entry.** Users log income, expenses, and transfers explicitly. There is no bank-account linking or transaction auto-import.
- **No fixed taxonomy.** Accounts, payment methods, and categories are entirely user-defined, not selected from a preset list.
- **No central backend.** User data is not stored on any moniq-operated server. It's persisted locally and synced to the user's own Google Drive.
- **No regional assumptions.** The app makes no assumptions about country, bank, or currency.

## 2. Target Audience

- Users who prefer to keep their financial data in their own Google Drive rather than a third-party database.

## 3. Core Capabilities

Let a single user define where their money lives, manually record financial activity, track balances accurately, and see monthly summaries.

### 3.1 Authentication & Data Storage

- Users authenticate via Google Sign-In.
- The app provisions a `Moniq Database` spreadsheet inside a `moniq/` folder in the user's Drive.
- Data syncs directly to the Google Sheets API — there is no intermediate centralized database. Local state is persisted via `zustand/persist` with IndexedDB (`idb` library) and synced to Google Sheets via a client-side SyncEngine with conflict resolution, debounced writes, and retry logic.

### 3.2 Master Configurations

- **Accounts**: Users create, edit, archive, and delete accounts where money resides (e.g. Bank, Wallet, Investment), classified as Asset or Liability. Deleting an account cascades to remove its linked payment methods, if unreferenced by transactions.
- **Payment Methods**: Users define payment methods (e.g. UPI, Card, Cash) bound to a specific account. A default payment method is created automatically when a new account is added.
- **Categories**: A user-defined taxonomy for spend/income, structured as Group → Head → Sub-head (e.g. Needs → Food → Groceries). Category groups include Income, Needs, Wants, Invest, Lend, and Borrow.

### 3.3 Transaction Logging

- **Double-entry ledger**: Every transaction is recorded as a set of balanced ledger entries (debits/credits) internally.
- Transactions support three modes: Income, Expense, Transfer.
- **Split transactions**: A single transaction can be divided across multiple categories (e.g. one supermarket receipt split into Groceries and Household Items).

### 3.4 Budgets & Lending

- **Zero-based budgeting**: Users allocate monthly income into category buckets and track spending against those allocations.
- **Lend/Borrow**: Money lent to or borrowed from others is tracked via the Lend/Borrow category groups, maintaining receivable/payable balances.

### 3.5 Dashboards & Analytics

- **Dashboard**: Net worth, income, expenses, and savings-rate stats, with detail views for accounts and spending. Uses a bottom-nav/FAB layout on mobile and a sidebar layout on desktop.
- **Insights**: A dedicated analytics page with category distribution, monthly trends, and income-vs-expense comparisons.
- **Ledger**: A transaction log with a detail panel (side panel on desktop, bottom sheet on mobile) and inline filtering.

### 3.6 Offline & Cross-Device

- **Local-first & PWA**: All logic runs against IndexedDB first. The app is installable as a PWA and its shell loads offline.
- **Demo Mode**: A local, no-login trial mode for evaluating the app before connecting a Google account.
