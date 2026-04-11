# 📦 MVP SCOPE — moniq v0.1

---

## 🎯 MVP Goal

Allow a single user to:

* Define where their money lives
* Manually record all financial activity
* Track balances accurately
* See simple monthly insights

If this isn’t rock-solid, **nothing else matters**.

---

## 🧩 Core Entities (MVP)

### 1. User

* Single-user system (no sharing yet)
* Preferences:

  * Currency
  * Fiscal year start month
  * Date format

---

### 2. Sources (Money Containers)

**Definition:**
A *Source* represents a place where money resides.

Examples:

* Bank Account
* Cash Wallet
* Emergency Cash
* Investment Account
* Credit Card (liability)

**Features:**

* Create / Edit / Archive sources
* Initial balance
* Current balance (computed)
* Source type (optional, user-defined)
* Allow negative balance (for liabilities)
* Include/exclude from net worth (future-proof flag)

---

### 3. Payment Methods

**Definition:**
A *Payment Method* represents how a transaction was executed.

Examples:

* Cash
* UPI
* Debit Card
* Credit Card
* Bank Transfer

**Features:**

* Fully user-defined
* Optional default source linkage
* Editable at any time

⚠️ Important:

* Payment methods do **NOT** hold balances
* They are metadata + helpers only

---

### 4. Categories (Heads & Sub-Heads)

**Definition:**
Why the transaction happened.

Structure:

* Head (e.g., Food)
* Optional Sub-head (e.g., Groceries)

Each category maps to a **Category Group**:

* Needs
* Wants
* Savings
* Investment
* Debt
* Custom

**Features:**

* Create / Edit / Archive categories
* Color/tag support (optional UI)
* Used for reporting only

---

### 5. Transactions (MOST IMPORTANT)

**Supported Types (MVP):**

* Income
* Expense
* Transfer

#### Fields:

* Amount
* Date
* Type
* Source (from)
* Source (to) — only for transfers
* Payment Method (optional)
* Category (required for income/expense)
* Note
* Tags (optional)

#### Rules:

* Income → adds to one source
* Expense → subtracts from one source
* Transfer → subtracts from source A, adds to source B
* Transfers do NOT use categories
* Editing/deleting transactions recalculates balances

---

## 📊 MVP Screens / Features

### Dashboard

* Total balance (all active sources)
* Source-wise balances
* Monthly income vs expense
* Top spending categories (simple list/chart)

---

### Transactions List

* Chronological list
* Filter by:

  * Date range
  * Category
  * Source
  * Type
* Search by note

---

### Add Transaction Flow

* Fast, minimal form
* Defaults:

  * Today’s date
  * Last used source/method
* Validation:

  * No negative amounts
  * Required fields enforced

---

### Data Management

* Export to CSV
* Local-first storage
* Simple cloud sync optional (behind flag)

---

## ❌ Explicitly OUT of MVP

(Important for your coding agent)

* Budgets
* Recurring transactions
* Rules automation
* Shared accounts
* Investment valuation updates
* Bank APIs
* AI features
* Multi-user auth
* Notifications

---

# 🔮 Future Context (Brief Only)

This goes at the bottom of `MVP.md` or in `PRODUCT.md`

### V1 (Planning Layer)

* Monthly budgets
* Recurring transactions
* Budget vs actual
* Improved reports
* Imports

### V2 (Automation + Collaboration)

* Rules engine
* Shared accounts
* Roles & permissions
* Real-time sync

### V3 (Wealth Layer)

* Investment tracking
* Value updates
* Net worth trends
* Goals

### SaaS Phase

* Subscription tiers
* Cloud backups
* Multi-currency analytics
* Intelligence layer