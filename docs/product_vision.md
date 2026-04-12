# Product Vision & Requirements
**moniq** is a highly customizable, manual-entry personal finance tracking application designed to give users absolute control over their ledgers. It avoids opinionated integrations and banking APIs, allowing users to build a custom map of their financial reality.

## 1. Product Philosophy
- **Manual > Automated**: The user stays in control. Data is entered explicitly.
- **Customizable > Opinionated**: Build your own categories and sources.
- **Privacy-first**: No central backend. Data is securely backed up directly to the user's Google Drive.
- **Global-first**: No country, bank, or currency assumptions.

## 2. Target Audience
- Salaried professionals seeking simple zero-based budgeting.
- Privacy-conscious users who prefer owning their data (via Google Sheets backend).
- Individuals looking for strict manual tracking to increase financial awareness.
- Freelancers and multi-currency earners.
- Global users outside major API ecosystems (e.g., heavily utilizing cash or custom wallets).

## 3. Core Capabilities
Allow a single user to define where their money lives, manually record all financial activity, track balances accurately, and see simple monthly insights.

### 3.1 Authentication & Data Storage
- Users authenticate via Google Sign-In.
- The app provisions a `Moniq Database` Spreadsheet inside a `moniq/` folder in the user's Drive.
- Data changes sync directly to the Google Sheets API without storing user ledgers on an intermediate centralized database. Local changes are instantly captured via IndexedDB/LocalStorage.

### 3.2 Master Configurations
- **Sources**: Users create, edit, and archive custom "Sources" where money resides (e.g., Bank, Wallet, Stash, Investment).
- **Payment Methods**: Users define "Payment Methods" representing how money moves (e.g., UPI, Card, Cash) and optionally bind them to default Sources.
- **Categories**: A custom taxonomy for spend/income comprising Groups, Heads, and Sub-heads (e.g., Needs > Food > Groceries).

### 3.3 Transaction Logging (The Engine)
- Transactions support 4 modes: Income, Expense, Transfer, Adjustment.
- Forms handle "Transfers" distinctly, requiring `From Source` and `To Source` without enforcing a spending category.
- **Split Transactions**: Support multiple categories within a single transaction entry (e.g., a single supermarket receipt split into Groceries and Household Items).

### 3.4 Budgets & Lending
- **Zero-based Budgeting**: A dedicated module for allocating monthly income into category buckets and tracking real-time spending against these allocations.
- **Lend/Borrow**: Track lending money to friends (Loan Given) or borrowing (Loan Taken) using specific contact-based "Sources" to maintain receivable/payable ledgers.

### 3.5 Dashboards, Analytics & Export
- **Desktop Command Center**: Balanced dashboard with high-level stats (Net Worth, Savings Rate) and detailed panel views for Sources and Spending.
- **Global Search**: Command-palette style quick-find for transactions, sources, and navigation.
- **Insights Engine**: Dedicated analytics page with category distribution, monthly trends, and income vs. expense bars.
- **Spreadsheet Ledger**: A high-density transaction log with right-side detail panels and inline filtering.
- **Export functionality (CSV)**: Download filtered spending reports for external auditing.
