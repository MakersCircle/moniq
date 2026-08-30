# Dashboard, Budget & Insights Test Coverage

This document details the test cases covering `src/pages/Dashboard.tsx`, `src/pages/Budget.tsx`, `src/pages/Insights.tsx`, the calculation hooks in `src/hooks/useComputed.ts` (`useMonthSummary`, `useCategorySpend`, `useHistoricalData`, `useBudgetSummary`, `useAllBalances`), and `src/store/slices/budgetSlice.ts`.

## 1. Unit Tests (`useComputed.test.ts`, `budgetSlice.test.ts`)
Focuses purely on the calculation formulas driving the stat cards, spending breakdowns, and budget math, isolated from any rendering.

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-01 | `useMonthSummary` — income txns in target month | Sums `entries[0].amount` for all `uiType === 'income'` txns matching `YYYY-MM` prefix |
| U-02 | `useMonthSummary` — expense txns in target month | Sums `entries[0].amount` for all `uiType === 'expense'` txns matching `YYYY-MM` prefix |
| U-03 | `useMonthSummary` — txns outside target month | Excluded from both income and expense sums |
| U-04 | `useMonthSummary` — soft-deleted txns | Excluded (`isDeleted: true` filtered out) |
| U-05 | `useMonthSummary` — transfer count | `transfers` equals count of `uiType === 'transfer'` txns in month |
| U-06 | `useMonthSummary` — net | `net` equals `income - expenses` |
| U-07 | `useAllBalances` — active accounts | Returns a map keyed by account id via `LedgerEngine.getNormalBalance` for every non-deleted account |
| U-08 | `useAllBalances` — deleted accounts | Excluded from the returned map entirely |
| U-09 | `useCategorySpend` — groups by category head | Amounts for the same `cat.head` are summed into one entry, keyed by label |
| U-10 | `useCategorySpend` — sort order | Result array is sorted descending by `amount` |
| U-11 | `useCategorySpend` — non-expense txns | Income/transfer txns are excluded from the spend map |
| U-12 | `useCategorySpend` — txn with no matching category entry | Skipped (no entry in `t.entries` matches a known category id) |
| U-13 | `useCategorySpend` — empty month | Returns `[]` |
| U-14 | `useHistoricalData(6)` — bucket count | Always returns exactly 6 entries regardless of how much transaction history exists |
| U-15 | `useHistoricalData(6)` — no transactions at all | Still returns 6 entries, each with `income: 0, expenses: 0, net: 0` |
| U-16 | `useHistoricalData(6)` — chronological order | Entries are ordered oldest → newest (reversed after building newest-first) |
| U-17 | `useHistoricalData(6)` — label format | `label` is short month name via `toLocaleDateString('en-IN', { month: 'short' })` |
| U-18 | `useHistoricalData(6)` — month key format | `month` field is `YYYY-MM` |
| U-19 | `useHistoricalData(3)` — custom bucket count | Returns exactly 3 entries when `months=3` is passed |
| U-20 | `useBudgetSummary` — income calculation | Sums `entries[0].amount` for `uiType === 'income'` txns in the period, same as `useMonthSummary` |
| U-21 | `useBudgetSummary` — excludes Income group | Categories with `group === 'Income'` are never included in `categoryGroups` |
| U-22 | `useBudgetSummary` — spent calculation | Sums the matching entry's `amount` for expense txns referencing that category id |
| U-23 | `useBudgetSummary` — budgeted amount lookup | Finds the `Budget` record matching `categoryId` + `period` and not deleted; defaults to `0` if none exists |
| U-24 | `useBudgetSummary` — remaining | `remaining = budgeted - spent` (can go negative) |
| U-25 | `useBudgetSummary` — percent with budget set | `percent = (spent / budgeted) * 100` |
| U-26 | `useBudgetSummary` — percent with zero budget | `percent` is `0` when `budgeted` is `0` (avoids divide-by-zero) |
| U-27 | `useBudgetSummary` — totalAllocated | Sum of `budgeted` across all active, non-deleted categories |
| U-28 | `useBudgetSummary` — remainingToAllocate | `income - totalAllocated`, can be negative (over-allocated) |
| U-29 | `useBudgetSummary` — category grouping | Categories are grouped by `cat.group` into `categoryGroups`, each sorted by `sortOrder` |
| U-30 | `useBudgetSummary` — inactive/deleted categories | Excluded from `categoryGroups` entirely |
| U-31 | `updateBudget` — create new budget | No existing budget for `categoryId`+`period` → creates new record with `uuid()`, calls `put('budgets', ...)`, calls `markDirty('budget', id, 'create')` |
| U-32 | `updateBudget` — update existing budget | Existing non-deleted budget found → replaces `amount` and `updatedAt`, calls `put('budgets', ...)`, calls `markDirty('budget', id, 'update')` |
| U-33 | `updateBudget` — ignores soft-deleted budget | A matching but `isDeleted: true` budget is not reused; a new budget is created instead |
| U-34 | `updateBudget` — persists to store | `budgets` array in state reflects the new/updated entry after the call |

## 2. Component Tests (`Dashboard.test.tsx`, `Budget.test.tsx`, `Insights.test.tsx`)
Focuses on rendering given mocked store/hook state, without hitting real calculation logic or network calls. Uses `@testing-library/react`.

### Dashboard
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-01 | Empty state (no transactions) | Renders "Welcome to Moniq" headline and "Alt+N" hint instead of stats |
| C-02 | Net Worth stat card | Displays sum of active, non-deleted, non-excluded account balances; detail shows `Liq:` and `Sav:` short-format breakdown |
| C-03 | Liquidity calculation | Only accounts with `isSavings: false` and `type === 'Asset'` contribute to `liquidity` |
| C-04 | Savings calculation | Only accounts with `isSavings: true` and `type === 'Asset'` contribute to `totalSavings` |
| C-05 | `excludeFromNet` accounts | Excluded from Net Worth, Liquidity, and Savings entirely |
| C-06 | Income stat card | Displays `useMonthSummary` income value with "This Month" detail |
| C-07 | Expenses stat card | Displays expenses in `text-expense` color |
| C-08 | Savings Rate — positive income | `((income - expenses) / income) * 100`, shown to 1 decimal with `%` suffix |
| C-09 | Savings Rate — zero income | Renders `0.0%` (guards divide-by-zero) |
| C-10 | Savings Rate detail color | `text-income` when `income - expenses >= 0`, else `text-expense` |
| C-11 | Receivable/Payable block — hidden | Not rendered when no account has `description` of `"receivable"` or `"payable"` (case-insensitive) |
| C-12 | Receivable/Payable block — receivable only | Renders "Total Receivable" card summing balances of matching active accounts; payable shows if payable also present |
| C-13 | Receivable/Payable — case insensitivity | Account with `description: "Receivable"` (capitalized) still matches via `.toLowerCase()` |
| C-14 | Receivable/Payable — inactive/deleted excluded | Accounts with `isActive: false` or `isDeleted: true` are excluded from the totals |
| C-15 | Accounts list panel | Shows up to 5 active, non-deleted accounts with name, type, and balance |
| C-16 | Accounts list — negative balance | Balance rendered in `text-expense` color when `< 0` |
| C-17 | Accounts list — overflow link | "View all accounts" link shown only when more than 5 active accounts exist |
| C-18 | Spending panel — empty | Shows "No data for this month" when `categorySpend` is `[]` |
| C-19 | Spending panel — progress bars | Renders up to 5 categories with bar width `%` proportional to each category's share of total spend |
| C-20 | Spending panel — percent label | Percent label matches `(amount / totalOfAllCategories) * 100`, rounded to 0 decimals |
| C-21 | Recent transactions — empty | Shows "No transactions yet." when no non-deleted transactions exist |
| C-22 | Recent transactions — top 5 | Shows the 5 most recent non-deleted transactions sorted by `date` descending |
| C-23 | "View Ledger" link | Links to `/transactions` |
| C-24 | "Analysis ›" link | Links to `/insights` |
| C-25 | "Manage ›" link | Links to `/settings/accounts` |

### Budget
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-26 | Empty state (no transactions) | Renders "Nothing here yet" instead of the budget grid |
| C-27 | Month navigation — next | Clicking the right chevron advances `currentDate` by one month and re-queries `useBudgetSummary` for the new month |
| C-28 | Month navigation — previous | Clicking the left chevron moves `currentDate` back one month |
| C-29 | Month label | Header shows `currentDate` formatted as `"MMMM yyyy"` via `en-IN` locale |
| C-30 | Monthly Income stat card | Displays `income` from `useBudgetSummary` |
| C-31 | Total Allocated stat card | Displays `totalAllocated` |
| C-32 | Remaining to Allocate — balanced | `remainingToAllocate === 0` → `text-income` color, "Perfectly balanced!" detail |
| C-33 | Remaining to Allocate — over-allocated | `remainingToAllocate < 0` → `text-expense` color, "Over-allocated" detail |
| C-34 | Remaining to Allocate — under-allocated | `remainingToAllocate > 0` → `text-primary` color, "Assign these funds" detail |
| C-35 | Category groups rendering | Each `categoryGroups` entry renders as a section with its `name` header and member category rows |
| C-36 | Category row — progress bar color | Bar is `bg-expense` when `percent > 100`, otherwise `bg-primary/70` |
| C-37 | Category row — progress bar clamp | Bar width is `min(percent, 100)%` even when spend exceeds budget |
| C-38 | Category row — remaining positive | Rendered in `text-income` with no minus sign |
| C-39 | Category row — remaining negative | Rendered in `text-expense` with a leading `−` and `Math.abs()` value |
| C-40 | Inline edit — enter edit mode | Clicking the budgeted-amount button swaps it for an `<input>` pre-filled with the current value |
| C-41 | Inline edit — empty current budget | Clicking edit on a category with `budgeted: 0` starts with an empty input, not `"0"` |
| C-42 | Inline edit — Enter key saves | Pressing `Enter` calls `updateBudget(catId, monthKey, parsedValue)` and exits edit mode |
| C-43 | Inline edit — Escape key cancels | Pressing `Escape` exits edit mode without calling `updateBudget` |
| C-44 | Inline edit — non-numeric input | Saving `"abc"` calls `updateBudget` with `0` (via `parseFloat(...) || 0`) |
| C-45 | Inline edit — autofocus | Input receives focus automatically when edit mode is entered |

### Insights
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-46 | Empty state (no transactions) | Renders "Nothing here yet" instead of charts |
| C-47 | Donut chart — empty month | Shows "No spending data for this month" when `categorySpend` is `[]` |
| C-48 | Donut chart — all slices render | Every entry in `categorySpend` (not just top 5) is rendered as a `<Cell>` in the `<Pie>` |
| C-49 | Donut chart — color cycling | With more than 7 categories, colors repeat via `CATEGORY_COLORS[i % CATEGORY_COLORS.length]` |
| C-50 | Legend — top 5 only | Only the first 5 entries of `categorySpend` (sorted by amount desc) appear in the legend list, even if more categories exist |
| C-51 | Legend — percent calculation | Each legend row's percent is `(amount / totalExpense) * 100`, rounded to 0 decimals |
| C-52 | Legend color dot | Each legend swatch color matches its corresponding pie `<Cell>` color at the same index |
| C-53 | Trend chart — 6 fixed buckets | `useHistoricalData(6)` always feeds exactly 6 bars/bar-groups to both bar charts, even for a brand-new account with 1 month of data |
| C-54 | Trend chart — zero-data buckets still render | Months with no transactions render as zero-height bars rather than being omitted |
| C-55 | Income vs Expenses legend | Legend shows "Income" and "Expenses" labels matching their `dataKey` |
| C-56 | Tooltip currency formatting | Donut tooltip formatter converts the raw value via `formatCurrencyShort` and labels it "Spent" |

## 3. End-to-End Tests (`dashboard-budget-insights.spec.ts`)
Uses seeded/demo-mode local data (no live Google Sheets dependency) to drive real user flows across pages.

### Dashboard Flow
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-01 | Load dashboard with seeded data | Net Worth, Income, Expenses, Savings Rate cards all show non-empty, formatted currency/percent values |
| E-02 | Load dashboard with zero transactions | Empty state with "Welcome to Moniq" is shown; no stat cards render |
| E-03 | Click "View Ledger" | Navigates to `/transactions` |
| E-04 | Click "Analysis ›" | Navigates to `/insights` |
| E-05 | Click "Manage ›" under Accounts | Navigates to `/settings/accounts` |
| E-06 | Spending breakdown bar widths | Each category's rendered bar width (in px) is proportional to its `%` label within a small tolerance |

### Budget Flow
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-07 | Navigate to next month | Clicking the right chevron updates the header label and reloads the budget grid for the new month (previously-set budgets for that month, if any, are shown) |
| E-08 | Navigate to previous month | Clicking the left chevron moves back and shows that month's data |
| E-09 | Edit a budget value end-to-end | Click a budgeted amount, type a new number, press Enter — the cell immediately reflects the new value, the "Remaining" cell recalculates, and the "Remaining to Allocate" stat updates |
| E-10 | Cancel an edit with Escape | Click a budgeted amount, type a new number, press Escape — original value is restored and no persisted change occurs (verified by reloading the page) |
| E-11 | Persisted budget across reload | After saving a budget edit, reloading the page shows the same value (persisted to IndexedDB) |
| E-12 | Over-budget visual state | A category with spend exceeding its budget shows a full red progress bar and a red "Remaining" pill with a minus sign |

### Insights Flow
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-13 | Load insights with seeded multi-category data | Donut chart renders with a legend limited to 5 rows even when more than 5 categories have spend |
| E-14 | Hover a donut slice | Tooltip shows the category's short-formatted currency amount and "Spent" label |
| E-15 | Trend chart shows 6 months on a fresh account | A newly created account with only the current month's transactions still shows 6 bars/groups on both trend charts, with prior months at zero |
| E-16 | Insights empty state | Brand-new account with zero transactions shows "Nothing here yet" instead of any chart |
