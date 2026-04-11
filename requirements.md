# Product Requirements Document

## 1. Overview
**moniq** is a highly customizable, manual-entry personal finance tracking application designed to give users absolute control over their ledgers. It avoids opinionated integrations and banking APIs, allowing users to build a custom map of their financial reality.

## 2. Target Audience
- Salaried professionals seeking simple zero-based budgeting.
- Individuals looking for strict manual tracking.
- Freelancers and multi-currency earners.
- Privacy-conscious users who prefer owning their data (via Google Sheets backend).
- Users outside major API ecosystems (e.g., global users with cash, custom wallets, mixed fiat/crypto).

## 3. Core Functional Requirements

### 3.1 Authentication & Data Storage
- **Req-1.1:** The app must authenticate users via Google Sign-In.
- **Req-1.2:** The app must provision a Google Spreadsheet in the user's Drive to act as the sole database.
- **Req-1.3:** The app must sync data changes directly to Google Sheets API without storing user ledgers on an intermediate centralized database.

### 3.2 Masters & Customization
- **Req-2.1 [Sources]:** Users must be able to create, edit, and archive custom "Sources" (where money resides: Bank, Wallet, Stash).
- **Req-2.2 [Methods]:** Users must be able to define "Payment Methods" (how money moves: UPI, Card, Cash) and optionally bind them to Sources.
- **Req-2.3 [Categories]:** Users must be able to construct a custom taxonomy for spend/income comprising Groups, Heads, and Sub-heads.

### 3.3 Transaction Logging (The Engine)
- **Req-3.1:** Users must be able to add a transaction in a highly optimized mobile-first form.
- **Req-3.2:** Transactions must support exactly 4 modes: Income, Expense, Transfer, Adjustment.
- **Req-3.3:** The form must handle "Transfers" distinctly, requiring `From Source` and `To Source` without enforcing a spending category.
- **Req-3.4 (Split Transactions):** The form must support multiple categories within a single transaction entry (e.g., a single supermarket receipt split into Groceries and Household Items) with amounts allocated per category.

### 3.4 Budgeting & Lending
- **Req-4.1 (Budgeting):** The app must permit "Zero-based" or simple monthly salary budgeting. Upon receiving salary/income, users can easily assign portions of that income to category buckets.
- **Req-4.2 (Lend/Borrow):** The app must natively or structurally handle lending money to friends (Loan Given) or borrowing (Loan Taken). This could be tracked as specific contact-based "Sources" to maintain receivable/payable ledgers.

### 3.5 Dashboards, Analytics & Export
- **Req-5.1:** The app must present a unified dashboard displaying Current Balances grouped by Source, including receivables and payables from Lending.
- **Req-5.2:** The app must provide an Expenses vs. Budget visualization to track monthly salary allocations.
- **Req-5.3:** The app must offer a historical ledger view with sorting and filtering by Month, Head, or Source.
- **Req-5.4 (Export):** Users must be able to download spending reports (CSV) filtered by date range, category, or transaction type.

## 4. Non-Functional Requirements
- **NFR-1 (Performance):** The application must fetch data efficiently and utilize IndexedDB/Local storage to provide instantaneous perception. 
- **NFR-2 (Offline limits):** If possible, allow creating transactions offline, to sync once connectivity is restored.
- **NFR-3 (Design):** Modern, premium aesthetics. Mobile-first layout emphasizing touch targets.
- **NFR-4 (Security):** Keep Google OAuth scopes strictly limited to drive files created by the app (`drive.file`) to avoid broad permissions.
