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

## ⚙️ Phase 2: Sync Engine Reliability & Migration (v0.3.0)
- [x] **Dynamic Schema Mapping**
  - [x] Move away from fixed column indexes to name-based mapping.
  - [x] Robust parsing for serial dates (recovery logic for numeric dates).
- [x] **Sheet Repair & Migration**
  - [x] Automatic header repair for outdated spreadsheets.
  - [x] Migration logic for legacy "Sources" data.
- [x] **ID-based Deduplication**
  - [x] Ensure ledger integrity by merging duplicate remote rows during sync.
- [x] **Sync & Handshake Polish**
  - [x] Prevent race-condition onboarding for existing users on new devices.
  - [x] Real-time sync feedback ("Pulling your data...") on the initialization screen.

## ✍️ Phase 3: Core UX — Transaction Engine
- [x] **New Transaction Experience**
  - [x] Layout the "New Transaction" Modal/Page.
  - [x] Implement robust Form Validation.
  - [x] "Allocated X of Y" logic for Split Transactions.
- [x] **Double-Entry Ledger Engine**
  - [x] Implement internal Debit/Credit logic.
  - [x] Professional internal storage vs Simple external UI.
- [x] Submit to backend (Append row to `Transactions` sheet with JSON ledger entries).
- [x] Implement Local Optimistic Update.

## 📊 Phase 4: Ledger & Viewing
- [x] **Redesigned Ledger**
  - [x] Spreadsheet table view with day dividers.
  - [x] Right detail panel sliding interface.
- [x] Context menus for quick actions (Edit/Delete/Copy).
- [ ] Implement infinite scroll or pagination.
- [x] Add filter logic (by Month, Category, Account, Type).
- [x] Edit/Delete Transactions.

## 📈 Phase 5: Dashboards, Insights & Budgeting
- [x] **Desktop Dashboard**
  - [x] 4 Stat cards (Net Worth, Income, Expenses, Savings Rate).
  - [x] 50/50 split for Accounts and Spending.
- [x] **Zero-based Budgeting Module:**
  - [x] Screen to view total monthly income (Salary).
  - [x] Income allocation vs Spending actuals.
  - [x] Inline-editable "Budgeted" cells.
- [x] **Insights & Analytics:**
  - [x] Dedicated Insights page with category distribution and monthly trends.
- [x] Compute real-time "Current Balances" from Ledger.
- [x] Track outstanding Lend/Borrow amounts on the Dashboard.
- [x] **Reporting Exporter:**
  - [x] UI button to Download CSV (refactored for double-entry records).

## 🚀 Phase 6: Polish & PWA Support
- [x] Make the UI adhere fully to `design_system.md`.
- [x] **Context Menus in Ledger**: 3-dot menu for Duplicate, Edit, and Delete in the spreadsheet view.
- [x] **Cloud Sync Refinements**: Automated sync on every state change and support for Budget data.
- [x] **Lending Statistics**: Dashboard indicators for total receivable/payable amounts.
- [x] **Universal Contextual Help**: Tooltips explaining core concepts (Accounts, Methods, Categories).
- [x] **Category Head Combobox**: Reducing friction in category creation with suggestions.
- [ ] **Custom Ordering System**: Allow reordering of Payment Methods and Categories logically in Settings to reflect in dropdowns.
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
