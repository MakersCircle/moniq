# Feature List & Implementation Roadmap

## Overview
This document tracks the end-to-end implementation roadmap for **moniq**. Items are ordered deliberately to allow continuous validation, from basic setup to core features and finally analytics.

---

## 🛠 Phase 1: Foundation & Authentication
- [x] Initialize project (Vite / Next.js, Tailwind CSS/Vanilla CSS, TypeScript).
- [x] Configure `design_system.css` and core layout shell.
- [x] Implement Google Sign-In (OAuth) flow.
- [x] Set up Google Sheets API Client inside the app (Drive scope request).
- [x] Build the "Initialize Database" routine (checks for the user's `moniq` folder/sheet and creates it if missing).
- [x] Set up basic local state sync (fetch all tabs on boot and map to client stores).

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
  - [x] List View & Edit Module.

## 🤝 Phase 2.5: Contacts / Lending
- [x] UI to add people as "Receivable" (Loan Given) or "Payable" (Loan Taken) inside the Sources section logically.

## ✍️ Phase 3: Core UX — Transaction Engine
- [x] Layout the "New Transaction" Modal/Page (Mobile-first).
- [x] Implement robust Form Validation (required fields based on Type).
- [x] **Transaction Types Flow:**
  - [x] Income logic (Select Source, Category, Mode).
  - [x] Expense logic (Select Source, Category, Mode).
  - [x] Transfer logic (Select From Source, To Source, Mode. Hide Categories).
  - [x] Split Transactions: Allow clicking 'Split' when adding an expense to break down the total amount into multiple categories. Assign same `group_id` before submission.
- [ ] Submit to backend (Append row to `Transactions` sheet).
- [x] Implement Local Optimistic Update (reflect new transaction instantly).

## 📊 Phase 4: Ledger & Viewing
- [x] Build the Recent Transactions List (sorted by date desc).
- [ ] Implement infinite scroll or pagination (Sheets API batch fetching).
- [x] Add filter logic (by Month, Category, Source, Type).
- [x] Edit/Delete Transactions (Soft delete in Sheet or explicit update).

## 📈 Phase 5: Dashboards, Insights & Budgeting
- [ ] **Zero-based Budgeting Module:**
  - [ ] Screen to view total monthly income (Salary).
  - [ ] Drag/Allocate portions of total income into category buckets.
- [x] Compute real-time "Current Balances" across all Sources directly from start-balance + transaction log.
- [ ] Track outstanding Lend/Borrow amounts (Receivables/Payables) on the Dashboard.
- [x] Build "Sources Overview" Heatmap / Cards.
- [x] Build "Current Month Spending" vs. Incoming overview.
- [x] Pie chart / Breakdown view based on Category Heads.
- [x] **Reporting Exporter:**
  - [x] UI button to Download CSV.
  - [x] Implementation of filtering/compiling local data to a CSV Blob and triggering browser download.

## 🚀 Phase 6: Polish & PWA Support
- [x] Make the UI adhere fully to `design_system.md` constraints (animations, glassmorphism).
- [ ] Setup PWA meta tags and service worker for offline loading cache.
- [ ] Implement transaction queuing (if offline, store in IndexedDB, sync on reconnect).
- [ ] Final user testing and deployment (Vercel/Netlify).

## 🔮 Phase 7: Future Optimizations (Scale & UX)
- [ ] **Background Synchronization**: Utilize service workers to intelligently sync offline queued transactions the moment connection is restored.
- [ ] **Intelligent Auto-Categorization**: Save a local dictionary of note keywords to category mappings to auto-select categories based on note text.
- [ ] **Smart Budget Rollover**: Move unspent funds from specific categories into next month's budget or automatically sweep to savings constraints.
- [ ] **Household Sharing (Joint Accounts)**: Configure the app to read from a shared `moniq` folder UUID, allowing spouses to contribute to a joint ledger.
- [ ] **Sheets Auto-Archiving Tool**: Scripts to extract transactions older than 2 years into a separate `Archive_YYYY` sheet to preserve API performance at scale.
