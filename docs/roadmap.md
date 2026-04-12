# Feature List & Implementation Roadmap

## Overview
This document tracks the end-to-end implementation roadmap for **moniq**. Items are ordered deliberately to allow continuous validation, from basic setup to core features and finally analytics.

---

## 🛠 Phase 1: Foundation & Layout Redesign (Desktop-First)
- [x] Initialize project (Vite, TypeScript).
- [x] Configure `design_system.css` and core layout shell.
- [x] **Complete Layout Redesign**
  - [x] Implement `LayoutShell` (Sidebar + TopBar).
  - [x] Centered `AddTransactionModal` (520px).
  - [x] Spreadsheet-like `Ledger` with right detail panel.
  - [x] Global Search / Command Palette placeholder (`/` shortcut).
- [x] Implement Google Sign-In (OAuth) flow.
- [x] Set up Google Sheets API Client.
- [x] Build the "Initialize Database" routine.
- [x] Set up basic local state sync.

## ⚙️ Phase 2: Master Data Management (CRUD)
- [x] **Sources Management**
  - [x] Add Form (Name, Type, Start Balance).
  - [x] List View & Edit Module.
- [x] **Payment Methods Management**
  - [x] Add Form (Name, Linked Source).
  - [x] List View & Edit Module.
- [x] **Categories Management**
  - [x] Define Head & Sub-head UI.
  - [x] Group definitions (Needs/Wants/Save).
  - [x] Grouped view with inline edit for Categories (Settings).

## 🤝 Phase 2.5: Contacts / Lending
- [x] UI to add people as "Receivable" (Loan Given) or "Payable" (Loan Taken).

## ✍️ Phase 3: Core UX — Transaction Engine
- [x] **New Transaction Experience**
  - [x] Layout the "New Transaction" Modal/Page.
  - [x] Implement robust Form Validation.
  - [x] "Allocated X of Y" logic for Split Transactions.
- [ ] Submit to backend (Append row to `Transactions` sheet for new structures).
- [x] Implement Local Optimistic Update.

## 📊 Phase 4: Ledger & Viewing
- [x] **Redesigned Ledger**
  - [x] Spreadsheet table view with day dividers.
  - [x] Right detail panel sliding interface.
- [ ] Context menus for quick actions (Edit/Delete/Copy).
- [ ] Implement infinite scroll or pagination.
- [x] Add filter logic (by Month, Category, Source, Type).
- [x] Edit/Delete Transactions.

## 📈 Phase 5: Dashboards, Insights & Budgeting
- [x] **Desktop Dashboard**
  - [x] 4 Stat cards (Net Worth, Income, Expenses, Savings Rate).
  - [x] 50/50 split for Sources and Spending.
- [x] **Zero-based Budgeting Module:**
  - [x] Screen to view total monthly income (Salary).
  - [x] Income allocation vs Spending actuals.
  - [x] Inline-editable "Budgeted" cells.
- [x] **Insights & Analytics:**
  - [x] Dedicated Insights page with category distribution and monthly trends.
- [x] Compute real-time "Current Balances".
- [x] Track outstanding Lend/Borrow amounts on the Dashboard.
- [x] **Reporting Exporter:**
  - [x] UI button to Download CSV.

## 🚀 Phase 6: Polish & PWA Support
- [x] Make the UI adhere fully to `design_system.md`.
- [x] **Context Menus in Ledger**: 3-dot menu for Duplicate, Edit, and Delete in the spreadsheet view.
- [x] **Cloud Sync Refinements**: Automated sync on every state change and support for Budget data.
- [x] **Lending Statistics**: Dashboard indicators for total receivable/payable amounts.
- [ ] **Background Synchronization**: Use Service Workers to sync while the tab is closed.
- [ ] **Intelligent Auto-Categorization**: Suggesting categories for manual entries based on past similar notes.
- [ ] **Data Export and Reports**: Full PDF or Excel generation of monthly summaries.
- [ ] **Sheets Auto-Archiving Tool**.

## 🔮 Phase 7: Future Optimizations (Scale & UX)
- [ ] **Global Command Palette**: Deep search across transactions and sources.
- [ ] **Background Synchronization**.
- [ ] **Intelligent Auto-Categorization**.
- [ ] **Smart Budget Rollover**.
- [ ] **Household Sharing (Joint Accounts)**.
- [ ] **Sheets Auto-Archiving Tool**.
