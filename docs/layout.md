# moniq — Desktop UI Prototype v1
### Desktop-first redesign. Familiar SaaS finance tool layout.

> **North Star:** A user who has used YNAB, Wave, or even a decent Excel budget
> template should feel at home in 30 seconds. No learning curve.

---

## LAYOUT SHELL (Global — every page)

The entire app lives inside a fixed shell. Nothing full-page navigates.
Content swaps in the main area. Think Linear, Notion, or YNAB web.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (48px tall, full width, sticky)                                        │
│  moniq                           [Search transactions...]        [R] Rahul ▾  │
│   logo                                 center                   avatar+name   │
├────────────────┬─────────────────────────────────────────────────────────────┤
│                │                                                               │
│   LEFT         │                                                               │
│   SIDEBAR      │                  MAIN CONTENT AREA                           │
│   (220px)      │                  (fills remaining width)                     │
│   fixed        │                                                               │
│                │                                                               │
│                │                                                               │
│                │                                                               │
│                │                                                               │
│                │                                                               │
│                │                                                               │
└────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## LEFT SIDEBAR (220px, fixed, full height)

```
┌────────────────┐
│                │
│  moniq         │  ← Logo / wordmark. Clicking goes to Dashboard.
│                │
│  ─────────     │
│                │
│  ⌂  Dashboard  │  ← Nav items. Icon + label. Active item: filled bg pill,
│                │    accent text. Inactive: just text, muted icon.
│  ≡  Ledger     │
│                │
│  📊  Insights  │
│                │
│  ◎  Budget     │
│                │
│  ─────────     │  ← Divider
│                │
│  ⚙  Settings   │
│                │
│                │
│                │
│                │
│  ─────────     │
│                │
│  [R] Rahul     │  ← User chip pinned to sidebar bottom.
│   Sign out     │    Click name → dropdown: Sign Out.
│                │
└────────────────┘
```

---

---
## PAGE 1: DASHBOARD
---

Main content area layout. 3-zone design: top stats row, middle two-column,
bottom full-width recent transactions.

```
┌────────────────┬─────────────────────────────────────────────────────────────┐
│                │                                                               │
│  ⌂  Dashboard  │  April 2025                              + New Transaction   │
│                │  ─────────────────────────────────────────────────────────  │
│  ≡  Ledger     │                                                               │
│                │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──┐│
│  📊  Insights  │  │ Net Worth    │  │ Income       │  │ Expenses     │  │Sa││
│                │  │              │  │ This Month   │  │ This Month   │  │vi││
│  ◎  Budget     │  │ ₹2,42,850   │  │ ₹68,000      │  │ ₹31,240      │  │ng││
│                │  │              │  │              │  │              │  │Ra││
│  ─────────     │  │ ↑ +5.2%     │  │              │  │              │  │te││
│                │  │  vs last mo  │  │              │  │              │  │%%││
│  ⚙  Settings   │  └──────────────┘  └──────────────┘  └──────────────┘  └──┘│
│                │                                                               │
│                │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  ┌────────────────────────────┐  ┌────────────────────────┐ │
│                │  │                            │  │                        │ │
│                │  │  SOURCES                   │  │  SPENDING THIS MONTH   │ │
│                │  │                            │  │                        │ │
│                │  │  SBI Savings               │  │  Food          ₹6,400  │ │
│                │  │  ₹1,84,200     Bank        │  │  ████████░░░   (38%)   │ │
│                │  │  ─────────────────────     │  │                        │ │
│                │  │  UPI Wallet                │  │  Transport     ₹2,100  │ │
│                │  │  ₹8,650        Wallet      │  │  █████░░░░░░   (13%)   │ │
│                │  │  ─────────────────────     │  │                        │ │
│                │  │  Zerodha                   │  │  Shopping      ₹4,800  │ │
│                │  │  ₹50,000       Investment  │  │  █████████░░   (29%)   │ │
│                │  │  ─────────────────────     │  │                        │ │
│                │  │  SBI Savings               │  │  Health         ₹180   │ │
│                │  │  ₹1,84,200     Bank        │  │  █░░░░░░░░░░    (1%)   │ │
│                │  │                            │  │                        │ │
│                │  │              See all ›     │  │                        │ │
│                │  └────────────────────────────┘  └────────────────────────┘ │
│                │                                                               │
│                │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  Recent Transactions                          View all ›     │
│                │                                                               │
│                │  Date         Description       Category     Amount   Type   │
│                │  ──────────   ──────────────   ──────────   ───────  ─────  │
│                │  12 Apr       Swiggy            Food          -₹340    Exp   │
│                │  12 Apr       Pharmacy          Health        -₹180    Exp   │
│                │  11 Apr       Salary            —           +₹68,000   Inc   │
│                │  10 Apr       HDFC → SBI        —           ₹10,000   Xfr   │
│                │  10 Apr       Amazon            Shopping     -₹1,299   Exp   │
│                │                                                               │
└────────────────┴─────────────────────────────────────────────────────────────┘
```

**Stat card anatomy (top row, 4 cards):**
```
┌──────────────────────────┐
│  Net Worth               │  ← Label: 13px, muted, uppercase
│                          │
│  ₹ 2,42,850.00           │  ← Amount: 28px, JetBrains Mono, bold
│                          │
│  ↑ +5.2% vs last month   │  ← Trend: 12px, green/red colored
└──────────────────────────┘
```

**Layout note:** The two middle panels (Sources + Spending) sit in a 50/50
split. On narrower windows (1200px), Sources stacks above Spending.
The recent transactions table is a proper table — not a list of cards.

---

---
## PAGE 2: LEDGER (Transactions)
---

This is the most-used page. It must feel like a spreadsheet, not a mobile list.
Think: Airtable table view, Wave transaction list.

```
┌────────────────┬─────────────────────────────────────────────────────────────┐
│                │                                                               │
│  ≡  Ledger     │  Ledger                                  + New Transaction   │
│  (active)      │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  [This Month ▾]  [All Types ▾]  [All Sources ▾]  [Category ▾]│
│                │                                          [Search...]  [⬇ CSV]│
│                │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  5 transactions  ·  Net: +₹54,181                            │
│                │                                                               │
│                │  ┌─────────────────────────────────────────────────────────┐ │
│                │  │ DATE ↕   DESCRIPTION     CATEGORY    SOURCE    AMOUNT ↕  │ │
│                │  │──────────────────────────────────────────────────────── │ │
│                │  │ 12 Apr   Swiggy           Food·Deliv  SBI Sav   -₹340   │ │
│                │  │ 12 Apr   Pharmacy         Health      Cash      -₹180   │ │
│                │  │──────────────────────────────────────────────────────── │ │
│                │  │ 11 Apr   Salary                       SBI Sav +₹68,000  │ │
│                │  │ 10 Apr   HDFC → SBI       Transfer    —        ₹10,000  │ │
│                │  │ 10 Apr   Amazon           Shopping    HDFC CC  -₹1,299  │ │
│                │  │ 09 Apr   Electricity      Utilities   SBI Sav   -₹920   │ │
│                │  │ 09 Apr   Netflix          Entertain.  SBI Sav   -₹649   │ │
│                │  │ 08 Apr   Zepto            Food·Groc   UPI Wal   -₹760   │ │
│                │  │                                                          │ │
│                │  │  ─────  Load more  ─────                                 │ │
│                │  └─────────────────────────────────────────────────────────┘ │
│                │                                                               │
└────────────────┴─────────────────────────────────────────────────────────────┘
```

**Clicking a row** opens a RIGHT PANEL (not a modal, not a new page).
The table shrinks to ~60% width and a detail panel slides in from the right.

```
┌────────────────┬──────────────────────────────┬──────────────────────────────┐
│                │                              │                              │
│  ≡  Ledger     │  [table — now narrower]      │  Transaction Detail     ✕   │
│                │                              │  ────────────────────────   │
│                │  DATE   DESCRIPTION  AMOUNT  │                              │
│                │  12 Apr  Swiggy       -₹340  │  Swiggy                      │
│                │  12 Apr  Pharmacy     -₹180  │  ₹ 340.00  Expense           │
│                │  ►11 Apr  Salary    +₹68,000 │  12 April 2025               │
│                │   10 Apr  HDFC→SBI  ₹10,000  │                              │
│                │                              │  ─────────────────────────  │
│                │  (selected row highlighted)  │                              │
│                │                              │  Account     SBI Savings     │
│                │                              │  Category    Food > Delivery  │
│                │                              │  Method      UPI             │
│                │                              │  Note        Dinner for two  │
│                │                              │                              │
│                │                              │  ─────────────────────────  │
│                │                              │                              │
│                │                              │  [  Edit  ]  [ Delete ]      │
│                │                              │                              │
└────────────────┴──────────────────────────────┴──────────────────────────────┘
```

**Table columns:**
- Date — sortable, grouped by day with a subtle divider row between days
- Description — left-aligned, primary text
- Category — muted, "Head · Sub-head" format
- Source — muted
- Amount — right-aligned, JetBrains Mono, green for income, red for expense
- (no Type column — color of Amount IS the type signal)

**Filter bar behavior:**
Dropdowns are standard select menus, not custom components.
"Search" filters description text in real-time (client-side).
"⬇ CSV" exports the current filtered view, not all data.

---

---
## PAGE 3: NEW TRANSACTION (Modal / Panel)
---

Triggered by "+ New Transaction" button (top right of every page).
Opens as a centered modal overlay. NOT a bottom sheet. NOT a right panel.
Fixed width: 520px. Vertically centered with backdrop dim.

```
                    ┌───────────────────────────────────────┐
                    │                                    ✕  │
                    │  New Transaction                       │
                    │  ───────────────────────────────────  │
                    │                                       │
                    │  [  Expense  ]  [  Income  ]  [Transfer]│
                    │   ↑ active tab = underline, not pill   │
                    │                                       │
                    │  Amount                               │
                    │  ┌───────────────────────────────┐   │
                    │  │  ₹  ___________________        │   │
                    │  └───────────────────────────────┘   │
                    │                                       │
                    │  ┌─────────────────┐  ┌───────────┐  │
                    │  │ Date            │  │ Method    │  │
                    │  │ 12 April 2025 ▾ │  │ UPI     ▾ │  │
                    │  └─────────────────┘  └───────────┘  │
                    │                                       │
                    │  Account                              │
                    │  ┌───────────────────────────────┐   │
                    │  │  SBI Savings               ▾  │   │
                    │  └───────────────────────────────┘   │
                    │                                       │
                    │  Category                             │
                    │  ┌───────────────────────────────┐   │
                    │  │  Select category           ▾  │   │
                    │  └───────────────────────────────┘   │
                    │                                       │
                    │  Note                                 │
                    │  ┌───────────────────────────────┐   │
                    │  │                               │   │
                    │  └───────────────────────────────┘   │
                    │                                       │
                    │  + Add split category                 │
                    │                                       │
                    │  ───────────────────────────────────  │
                    │               [Save Expense]          │
                    └───────────────────────────────────────┘
```

**Dropdowns:** Standard `<select>`-style on desktop. No custom bottom-sheet.
Category uses a searchable combobox (type to filter, arrow keys to navigate).

**Split categories expansion:**
```
                    │  Categories                  + Add    │
                    │  ┌───────────────────────────────┐   │
                    │  │  Food > Groceries      ₹ 500  │   │
                    │  │  Home > Household      ₹ 300  │   │
                    │  └───────────────────────────────┘   │
                    │  Allocated ₹800 of ₹800  ✓           │
```

**Transfer mode:**
- "Account" → becomes two fields side by side: "From" | "To"
- Category field hidden
- Note field stays

---

---
## PAGE 4: INSIGHTS
---

A dedicated analytics page. Not crammed into the dashboard.
Two-column layout: left = controls, right = charts.

```
┌────────────────┬─────────────────────────────────────────────────────────────┐
│                │                                                               │
│  📊  Insights  │  Insights                                                     │
│  (active)      │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  [Q1 2025 ▾]  [All Categories ▾]  [All Sources ▾]            │
│                │                                                               │
│                │  ┌──────────────────────────────┬──────────────────────────┐ │
│                │  │                              │                          │ │
│                │  │  SPENDING BY CATEGORY        │  MONTHLY TREND           │ │
│                │  │                              │                          │ │
│                │  │  [Donut / pie chart area]    │  [Bar chart area]        │ │
│                │  │                              │  Jan  Feb  Mar  Apr      │ │
│                │  │  ● Food       38%  ₹6,400   │  ▓▓▓  ▓▓  ▓▓▓  ▓▓       │ │
│                │  │  ● Transport  13%  ₹2,100   │                          │ │
│                │  │  ● Shopping   29%  ₹4,800   │                          │ │
│                │  │  ● Health      1%    ₹180   │                          │ │
│                │  │  ● Other      19%  ₹3,200   │                          │ │
│                │  │                              │                          │ │
│                │  └──────────────────────────────┴──────────────────────────┘ │
│                │                                                               │
│                │  ┌─────────────────────────────────────────────────────────┐ │
│                │  │  INCOME vs EXPENSES — Monthly                            │ │
│                │  │                                                          │ │
│                │  │  Jan    ████████████████░░░░░░░░░░  Inc ₹60k  Exp ₹38k │ │
│                │  │  Feb    ████████░░░░░░░░░░░░░░░░░░  Inc ₹60k  Exp ₹22k │ │
│                │  │  Mar    █████████████░░░░░░░░░░░░░  Inc ₹68k  Exp ₹41k │ │
│                │  │  Apr    █████████░░░░░░░░░░░░░░░░░  Inc ₹68k  Exp ₹31k │ │
│                │  │                                                          │ │
│                │  └─────────────────────────────────────────────────────────┘ │
│                │                                                               │
└────────────────┴─────────────────────────────────────────────────────────────┘
```

---

---
## PAGE 5: BUDGET
---

Zero-based budgeting. The layout is a two-column editor:
left = income allocation, right = spending actuals vs budget.

```
┌────────────────┬─────────────────────────────────────────────────────────────┐
│                │                                                               │
│  ◎  Budget     │  Budget  ‹ March 2025 ›                      + Add Category  │
│  (active)      │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  Monthly Income   ₹68,000    Allocated  ₹62,000              │
│                │                              Remaining  ₹6,000               │
│                │                                                               │
│                │  ─────────────────────────────────────────────────────────  │
│                │                                                               │
│                │  Category              Budgeted    Spent      Remaining       │
│                │  ────────────────────  ─────────   ────────   ──────────     │
│                │                                                               │
│                │  NEEDS                                                        │
│                │    Food                ₹8,000      ₹6,400     ₹1,600  ✓     │
│                │    ████████░░░░░░░░░░░░  80%                                 │
│                │    Transport           ₹3,000      ₹2,100       ₹900  ✓     │
│                │    ████████░░░░░░░░░░░  70%                                  │
│                │    Health              ₹2,000        ₹180     ₹1,820  ✓     │
│                │    █░░░░░░░░░░░░░░░░░░   9%                                  │
│                │                                                               │
│                │  WANTS                                                        │
│                │    Shopping            ₹5,000      ₹4,800       ₹200  ✓     │
│                │    ████████████████░░   96%                                  │
│                │    Entertainment       ₹2,000      ₹2,300      -₹300  ✗     │ ← over budget row: red tint
│                │    ████████████████████ 115%                                 │
│                │                                                               │
│                │  SAVINGS                                                      │
│                │    Emergency Fund     ₹10,000          ₹0    ₹10,000  —     │
│                │    ░░░░░░░░░░░░░░░░░░   0%                                   │
│                │                                                               │
└────────────────┴─────────────────────────────────────────────────────────────┘
```

Clicking a "Budgeted" cell makes it inline-editable (like a spreadsheet cell).
No modal needed. Click → input appears → Tab or Enter → saves → updates totals.

---

---
## PAGE 6: SETTINGS
---

Settings has its own internal left-nav. Two-pane layout inside the main area.

```
┌────────────────┬──────────────────────┬──────────────────────────────────────┐
│                │                      │                                       │
│  ⚙  Settings   │  Settings            │  Sources & Accounts                  │
│  (active)      │  ──────────────────  │  ──────────────────────────────────  │
│                │                      │                                       │
│                │  Financial Setup     │                           + Add new   │
│                │  ──────────────────  │                                       │
│                │  ► Sources       ←active  ACCOUNTS                           │
│                │    Categories    │  ┌───────────────────────────────────┐  │
│                │    Pay Methods   │  │  SBI Savings          ₹1,84,200   │  │
│                │                  │  │  Bank · INR · Active     Edit  ⋯  │  │
│                │  Lending         │  ├───────────────────────────────────┤  │
│                │  ──────────────  │  │  UPI Wallet              ₹8,650   │  │
│                │    Contacts      │  │  Wallet · INR · Active   Edit  ⋯  │  │
│                │                  │  ├───────────────────────────────────┤  │
│                │  Data            │  │  Zerodha                ₹50,000   │  │
│                │  ──────────────  │  │  Investment · INR        Edit  ⋯  │  │
│                │    Export CSV    │  └───────────────────────────────────┘  │
│                │    Drive Sync    │                                           │
│                │                  │  LENDING / CONTACTS                       │
│                │  Account         │  ┌───────────────────────────────────┐  │
│                │  ──────────────  │  │  Arun Kumar           ₹5,000 owed │  │
│                │    Sign Out      │  │  Receivable              Edit  ⋯  │  │
│                │                  │  └───────────────────────────────────┘  │
│                │                  │                                           │
└────────────────┴──────────────────┴──────────────────────────────────────────┘
```

**Add/Edit Source** — opens as an inline form replacing the right panel content.
No modal. No navigation. The panel content swaps.

```
│  Sources & Accounts                                                           │
│  ──────────────────────────────────────────────────────────────               │
│  ‹ Back to Sources                                                            │
│                                                                               │
│  Add New Source                                                               │
│                                                                               │
│  Name                               Type                                      │
│  ┌──────────────────────────┐   [ Bank ][ Wallet ][ Cash ][ Invest ]         │
│  │                          │                                                 │
│  └──────────────────────────┘                                                 │
│                                                                               │
│  Starting Balance                   Currency                                  │
│  ┌──────────────────────────┐   ┌────────────────────┐                       │
│  │  ₹ 0.00                  │   │  INR             ▾ │                       │
│  └──────────────────────────┘   └────────────────────┘                       │
│                                                                               │
│  [ Save Source ]                                                              │
```

---

---
## CATEGORIES SETTINGS PAGE (right panel content)
---

```
│  Categories                                          + Add Head   + Add Group  │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  ▼  NEEDS                                                                │ │
│  │     ▼  Food                                              Edit   Delete   │ │
│  │          Groceries                                       Edit   Delete   │ │
│  │          Delivery                                        Edit   Delete   │ │
│  │          Dining Out                                      Edit   Delete   │ │
│  │          + Add sub-head                                                  │ │
│  │     ▶  Transport                                         Edit   Delete   │ │
│  │     ▶  Health                                            Edit   Delete   │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │  ▶  WANTS                                                                │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │  ▶  SAVINGS                                                              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
```

This is a standard tree view. ▶ collapsed, ▼ expanded. Click to toggle.
Edit is inline — click "Edit" and the text becomes an input field in place.

---

---
## COMPONENT SPEC: TOPBAR SEARCH
---

The search bar in the topbar is global quick-find.
Clicking it (or pressing `/`) opens a command-palette-style dropdown:

```
                        ┌───────────────────────────────────────┐
                        │  🔍  Search transactions, sources...  │
                        ├───────────────────────────────────────┤
                        │  RECENT                               │
                        │  Swiggy · ₹340 · 12 Apr              │
                        │  Pharmacy · ₹180 · 12 Apr            │
                        │  ─────────────────────────────────    │
                        │  JUMP TO                              │
                        │  Dashboard                            │
                        │  Ledger                               │
                        │  Budget                               │
                        └───────────────────────────────────────┘
```

---

---
## SPACING & SIZING REFERENCE (Desktop)
---

| Element                   | Value          | Note                           |
|---------------------------|----------------|--------------------------------|
| Sidebar width             | 220px          | Fixed, never collapses         |
| Topbar height             | 48px           | Sticky                         |
| Content max-width         | 1200px         | Centered when window > 1440px  |
| Content side padding      | 32px           | Inside main area               |
| Section gap               | 32px           | Between major sections         |
| Card padding              | 24px           | Internal card padding          |
| Table row height          | 44px           | Comfortable click target       |
| Modal width               | 520px          | Fixed, centered                |
| Right panel width         | 360px          | Slides in, table shrinks       |
| Stat card min-width       | 200px          | 4-column grid on dashboard     |
| Stat amount font size     | 28px           | JetBrains Mono                 |
| Table amount font size    | 14px           | JetBrains Mono, right-aligned  |
| Nav item height           | 36px           | Sidebar items                  |
| Settings inner nav width  | 180px          | Second-level nav in Settings   |

---

---
## INTERACTION RULES (Desktop-specific)
---

| Action                    | Behavior                                         |
|---------------------------|--------------------------------------------------|
| Click transaction row     | Right panel slides in. Table doesn't navigate.   |
| Click "+ New Transaction" | Centered modal overlay. Keyboard-accessible.      |
| Press `/`                 | Focuses topbar search.                            |
| Press `Esc`               | Closes any open modal, panel, or dropdown.        |
| Click outside modal       | Closes modal.                                     |
| Hover on table row        | Row background lightens. Shows row action icons.  |
| Click "Budgeted" cell     | Cell becomes inline input. Tab moves to next.    |
| Right-click table row     | Context menu: Edit, Delete, Copy amount.         |
| Click category in ledger  | Filters ledger to that category instantly.       |
| Keyboard: Arrow keys      | Navigate rows in transaction table.               |

---

---
## WHAT THIS IS NOT
---

- No bottom navigation bar.
- No "full screen pickers" for dropdowns. Standard `<select>` or combobox.
- No bottom sheets. Modals and right panels only.
- No mobile-style "back arrow" navigation. Breadcrumbs or sidebar active state.
- No per-card glassmorphism everywhere. Surfaces are flat with subtle borders.
- No animations on numbers (no count-up on load).
- No charts on every screen. Charts only live in Insights.

---

*End of prototype. Every layout decision above has a direct reference in
products users already know: sidebar from Notion/Linear, transaction table
from Wave, budget progress from YNAB, right-panel detail from Airtable.*