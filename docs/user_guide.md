# User Guide - Moniq

Welcome to **Moniq**, your professional, private, and portable financial tracker.

## 1. Getting Started

### 1.1 First Login
1. Click **"Get Started"** on the home page.
2. Sign in with your Google Account.
3. Moniq will ask for permission to manage files in your Google Drive (specifically for the "moniq-database" spreadsheet).

### 1.2 Onboarding
On your first login, you will be guided through setting up:
- **Accounts**: Where your money lives (e.g., Bank, Cash, Credit Card).
- **Categories**: What you spend on (e.g., Groceries, Rent, Salary).
- **Initial Balances**: Your starting point.

## 2. Core Concepts

### 2.1 Accounts vs. Payment Methods
- **Account**: The actual financial entity (e.g., "Chase Bank").
- **Payment Method**: How you spend from that account (e.g., "Chase Visa Debit", "Chase Mobile Pay").
*Note: When you create an account, a payment method with the same name is created automatically.*

### 2.2 Double-Entry Accounting
Moniq uses a professional ledger system under the hood. Every transaction creates at least two entries (Debit and Credit) to ensure your balance sheet always matches your cash flow.

## 3. Managing Transactions

### 3.1 Adding a Transaction
Click the **"+"** button in the sidebar or top bar.
- **Income**: Money coming in (Target: Account).
- **Expense**: Money going out (Source: Payment Method).
- **Transfer**: Money moving between accounts.

### 3.2 Editing & Deleting
- Hover over a transaction in the **Transactions** (Ledger) view.
- Use the **3-dot menu** to Edit, Duplicate, or Delete.
- Deleted items go to **Settings > Recently Deleted** and can be restored within 30 days.

## 4. Synchronization

### 4.1 How Sync Works
Moniq is **offline-first**. Changes are saved locally to your browser (IndexedDB) immediately and synced to your Google Sheet in the background.
- **Pulling**: When you open the app, it pulls the latest data from Google Sheets.
- **Pushing**: Every change you make is queued and uploaded automatically.

### 4.2 Handling Conflicts
If you edit the same data on two different devices, Moniq uses a **"Latest Update Wins"** strategy based on the `updatedAt` timestamp.

---
**Need help?** Check the [FAQ](faq.md) or reach out to support.
