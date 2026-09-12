# Transactions Test Coverage

This document details test cases covering the transaction entry, editing, and ledger viewing flow: `src/components/Transactions/AddTransactionModal.tsx`, `src/components/Transactions/DatePicker.tsx`, `src/components/Transactions/TransactionDetailPanel.tsx`, `src/pages/Transactions.tsx`, `src/components/TxnRow.tsx`, `src/lib/ledger.ts`, and `src/store/slices/transactionSlice.ts`.

## 1. Unit Tests

### 1.1 `LedgerEngine` (`ledger.test.ts`)
Focuses purely on double-entry bookkeeping math, isolated from React.

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-01 | `createEntries` for `expense` | Returns `[{accountId: targetId, type: 'DEBIT', amount}, {accountId: accountId, type: 'CREDIT', amount}]` — category debited, account credited |
| U-02 | `createEntries` for `income` | Returns `[{accountId: accountId, type: 'DEBIT', amount}, {accountId: targetId, type: 'CREDIT', amount}]` — account debited, category credited |
| U-03 | `createEntries` for `transfer` | Returns `[{accountId: targetId, type: 'DEBIT', amount}, {accountId: accountId, type: 'CREDIT', amount}]` — destination account debited, source account credited |
| U-04 | `createEntries` for unknown type | Returns `[]` |
| U-05 | `validate` with equal debit/credit sums | Returns `true` |
| U-06 | `validate` with mismatched sums | Returns `false` |
| U-07 | `validate` with sums differing by < 0.001 | Returns `true` (epsilon tolerance) |
| U-08 | `getNormalBalance` for Asset account, DEBIT entry | Increases balance by entry amount |
| U-09 | `getNormalBalance` for Asset account, CREDIT entry | Decreases balance by entry amount |
| U-10 | `getNormalBalance` for Liability account, CREDIT entry | Increases balance by entry amount |
| U-11 | `getNormalBalance` for Liability account, DEBIT entry | Decreases balance by entry amount |
| U-12 | `getNormalBalance` for expense category (group `Needs`/`Wants`/`Invest`/`Lend`), DEBIT entry | Increases balance (debit increases expense) |
| U-13 | `getNormalBalance` for income category (group `Income`/`Borrow`), CREDIT entry | Increases balance (credit increases revenue) |
| U-14 | `getNormalBalance` seeded with `account.initialBalance` | Starting balance equals `initialBalance` before entries are aggregated |
| U-15 | `getNormalBalance` seeded with `category.initialBalance` | Starting balance equals category's `initialBalance` |
| U-16 | `getNormalBalance` excludes soft-deleted transactions | Entries on transactions with `isDeleted: true` are not aggregated |
| U-17 | `getNormalBalance` for id with no matching account or category | Balance derived purely from entries with `impact` of `0` for unmatched types (returns `0` contribution) |
| U-18 | `getNormalBalance` aggregates multiple transactions | Balance is the sum across all matching entries, not just the latest |

### 1.2 `transactionSlice` (`transactionSlice.test.ts`)
Focuses on store mutations, ID/timestamp generation, and ledger entry wiring, mocking `put` (IndexedDB) and `markDirty`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-19 | `addTransaction` for expense | Calls `LedgerEngine.createEntries` with `type: 'expense'`, prepends new txn to `transactions` array (newest first) |
| U-20 | `addTransaction` | Generates a unique `id` and `groupId` via `uuid()`, and sets `createdAt`/`updatedAt` to same timestamp from `now()` |
| U-21 | `addTransaction` | Persists the transaction via `put('transactions', txn)` |
| U-22 | `addTransaction` | Calls `markDirty('transaction', id, 'create')` for sync tracking |
| U-23 | `addTransaction` with no `methodId` | Stores transaction with `methodId: undefined` without throwing |
| U-24 | `updateTransaction` | Merges `patch` into existing transaction by `id`, refreshes `updatedAt`, leaves other transactions untouched |
| U-25 | `updateTransaction` for non-existent id | Store list is unchanged (map finds no match), `put` still not called for undefined `updated` |
| U-26 | `updateTransaction` | Calls `markDirty('transaction', id, 'update')` |
| U-27 | `deleteTransaction` | Sets `isDeleted: true` and refreshes `updatedAt` on the matching transaction without removing it from the array |
| U-28 | `deleteTransaction` | Calls `markDirty('transaction', id, 'update')` (soft delete, not a `'delete'` op) |

### 1.3 Date Parsing Logic (`DatePicker.test.ts` — logic extracted/tested via component)
Focuses on the manual `dd/MM/yyyy` parsing cascade used for typed date input.

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-29 | Full input `28/08/2026` | Parses as `dd/MM/yyyy`, calls `onChange('2026-08-28')` |
| U-30 | Full input with dashes `28-08-2026` | Parses as `dd-MM-yyyy`, calls `onChange('2026-08-28')` |
| U-31 | Compact digits `28082026` | Parses as `ddMMyyyy` (length >= 8), calls `onChange('2026-08-28')` |
| U-32 | Two-digit year `28/08/26` | Parses as `dd/MM/yy`, calls `onChange` with resolved 4-digit year |
| U-33 | Partial input `28/08` (mid-typing) | Parses as `dd/MM` but does not call `onChange` since length < 8 and lacks trailing complete signal beyond separator rule; only local `month` calendar state updates |
| U-34 | Single digit `2` (just started typing) | No `onChange` call; calendar view unaffected until a fuller match resolves |
| U-35 | Non-numeric characters typed (e.g. letters) | Stripped via `replace(/[^0-9/-]/g, '')` before any parse attempt |
| U-36 | Unparseable/invalid date string (e.g. `40/13/2026`) on blur | `handleBlur` fails all formats, reverts displayed input to the last valid prop `date` formatted as `dd/MM/yyyy` |
| U-37 | Valid but incomplete date left on blur (e.g. `5/6`) | Resolves via a shorter format in the cascade (`d/M`) and commits `onChange` with year defaulted to current year |
| U-38 | Calendar day click (`Calendar` `onSelect`) | Calls `onChange(format(d, 'yyyy-MM-dd'))` and closes the popover |
| U-39 | External `date` prop changes while input is focused | Input value is NOT overwritten (guarded by `isFocused`), preserving in-progress typing |
| U-40 | External `date` prop changes while input is NOT focused | Input syncs to new prop value, reformatted as `dd/MM/yyyy`, and `month` view updates |
| U-41 | ArrowDown key pressed in the input | Opens the calendar popover (`setOpen(true)`) without navigating the input |

## 2. Component Tests

### 2.1 `AddTransactionModal` (`AddTransactionModal.test.tsx`)
Uses `@testing-library/react` with a mocked `useDataStore`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-01 | Default render (no `initialData`, no `defaultType`) | Header reads "New Transaction"; `expense` tab active; amount input auto-focused |
| C-02 | Render with `defaultType="income"` | `income` tab is active on mount, split toggle hidden (split only offered for expense) |
| C-03 | Render with `initialData` (editing) | Header reads "Edit Transaction"; amount, date, note, method, and category fields pre-filled from the transaction |
| C-04 | Render with `initialData` + `isDuplicate` | Header reads "New Transaction" (not "Edit"); date field resets to today instead of the original transaction's date |
| C-05 | Edit-mode account pre-fill (expense) | Resolves the CREDIT entry whose `accountId` matches a known account as the selected payment-method-derived account |
| C-06 | Edit-mode category pre-fill (expense) | Resolves the DEBIT entry's `accountId` as `targetId`, and pre-selects its `head` in the Category dropdown |
| C-07 | Edit-mode pre-fill (income) | Resolves DEBIT entry as account, CREDIT entry as category/target (inverse of expense) |
| C-08 | Edit-mode pre-fill (transfer) | Resolves CREDIT entry's account as "From" method, DEBIT entry's account as "To" method via matching `linkedAccountId` |
| C-09 | Tab click switches type | Clicking the "income" tab sets `type` state to `income` and resets `isSplit` to `false` |
| C-10 | Amount input strips invalid characters | Typing `12a.3b4` results in input value `12.34` |
| C-11 | Amount input blocks a second decimal point | Typing `1.2.3` collapses to `1.23` (parts beyond first `.` are concatenated without an extra dot) |
| C-12 | Amount input blocks `e`, `+`, `-` keys | `keydown` for those keys calls `preventDefault` and does not change the value |
| C-13 | Amount display formatting | Entering `1234567` displays as a locale-grouped string per `settings.numberLocale` (defaults `en-IN`, e.g. `12,34,567`) |
| C-14 | Save button disabled — zero/empty amount | `isValidTransaction` is `false`; submit button `disabled` |
| C-15 | Save button disabled — invalid date | Typing an unparseable date keeps the button disabled (`isNaN(Date.parse(date))`) |
| C-16 | Save button disabled (expense/income) — no target category selected | Button remains disabled until `targetId` is set |
| C-17 | Save button disabled (expense/income) — no payment method selected | Button remains disabled until `methodId` is set |
| C-18 | Save button disabled (transfer) — missing "From" or "To" method | Button disabled unless both `fromMethodId` and `toMethodId` are set |
| C-19 | Save button enabled once all required fields are valid | `isValidTransaction` becomes `true`; submit button enabled |
| C-20 | Category head selection filters sub-categories | Selecting a head populates the Sub-category list with only categories sharing that `head` |
| C-21 | Category head with exactly one sub-category | Sub-category auto-selects that single sub (`targetId` set immediately, dropdown replaced with static display) |
| C-22 | Category head with multiple sub-categories | Sub-category renders as an interactive `Select`; `targetId` stays empty until user picks one |
| C-23 | Selecting "Create Category" (`NEW_CATEGORY`) | Opens `CreateCategorySheet`; does not change `selectedHead` |
| C-24 | `CreateCategorySheet` `onSuccess` callback | Sets `selectedHead` to the new category's head and `targetId` to the new category's id |
| C-25 | Selecting "Create Account & Method" (`NEW_METHOD`) in Payment Method dropdown | Opens `CreateAccountSheet` |
| C-26 | `CreateAccountSheet` `onSuccess` (expense/income context) | Sets `methodId` to the newly created method's id |
| C-27 | `CreateAccountSheet` `onSuccess` (transfer, "From" empty) | Sets `fromMethodId` to the new method's id |
| C-28 | `CreateAccountSheet` `onSuccess` (transfer, "From" already set) | Sets `toMethodId` to the new method's id instead |
| C-29 | Transfer "To" method options exclude the "From" account | `toMethodOptions` filters out any method whose `linkedAccountId` equals the "From" method's linked account |
| C-30 | Selecting a "To" method identical to the current "From" method | Selecting the same method as `fromMethodId` for the "To" field clears `toMethodId` (guarded via the `onValueChange` reset in the "From" selector) |
| C-31 | Split toggle only available for `expense` type | "Split this transaction" button renders only when `type === 'expense'`; hidden for income/transfer |
| C-32 | Enabling split hides the single Category/Sub-category fields | Toggling `isSplit` on removes the head/sub-head selects and shows the split line editor |
| C-33 | Split allocation badge — fully allocated | When `sum(splits.amount) === parsedAmount` (within 0.01), badge shows "✓ All Splits" with income styling |
| C-34 | Split allocation badge — under/over allocated | Badge shows `Allocated {X} of {Y}` with expense styling when remainder exceeds 0.01 |
| C-35 | Split validation gates submit | `isValidTransaction` for a split expense requires `isFullyAllocated` AND every split line to have both a `categoryId` and a positive `amount` |
| C-36 | Adding a split line | Clicking "Add Category" appends a new blank `{categoryId: '', amount: '', note: ''}` row |
| C-37 | Removing a split line | Clicking the trash icon removes that row; button is disabled when only one split line remains |
| C-38 | Split submit behavior | On submit, one `addTransaction` call is fired per split line with `categoryId` and a positive `amount`, each tagged `uiType: 'expense'` |
| C-39 | Split submit — note fallback | Each split transaction uses `s.note` if provided, otherwise falls back to the shared top-level `note` |
| C-40 | Expected balance preview (expense) | Shows `currentBalance - parsedAmount`; renders in expense-red style when result is negative |
| C-41 | Expected balance preview (income) | Shows `currentBalance + parsedAmount` |
| C-42 | Expected balance preview (transfer, "From" account) | Shows `currentBalance - parsedAmount` for the source account |
| C-43 | Expected balance preview (transfer, "To" account) | Shows `currentBalance + parsedAmount` for the destination account |
| C-44 | Expected balance excludes the transaction being edited | When editing, balance calculation filters out the original transaction by id (unless duplicating) so the preview reflects the post-edit state, not double-counted |
| C-45 | Submit (new, non-split) | Calls `addTransaction` with `{date, uiType, amount, accountId: derivedAccountId, targetId: derivedTargetId, methodId, note, tags: []}` |
| C-46 | Submit (editing, non-split) | Calls `updateTransaction(initialData.id, {...payload, entries})` with entries freshly generated by `LedgerEngine.createEntries`, and does NOT call `addTransaction` |
| C-47 | Submit (duplicate) | Treated as a new transaction: calls `addTransaction`, not `updateTransaction`, even though `initialData` is present |
| C-48 | Submit blocked when invalid | Calling `handleSubmit` while `isValidTransaction` is `false` performs no store mutation and does not close the modal |
| C-49 | Save & Close (`handleSubmit()` default) | Calls `onClose()` after a successful submit |
| C-50 | Save & Stay (`handleSubmit(e, true)`) | Does NOT call `onClose()`; resets amount, note, targetId, selectedHead, fromMethodId, toMethodId, and splits back to one blank line |
| C-51 | Save & Stay preserves continuity fields | Date, `methodId`, and `type` are NOT reset after a "keep open" save, enabling rapid successive entry |
| C-52 | Save & Stay shows "Saved" indicator | Sets `isSaved` to `true` immediately, then back to `false` after 2000ms (`setTimeout`) |
| C-53 | Save & Stay refocuses amount input | Schedules `amountRef.current?.focus()` via a 10ms `setTimeout` after a keep-open save |
| C-54 | Keyboard: `Cmd+Enter` / `Ctrl+Enter` | Triggers save-and-stay (`handleSubmit(undefined, true)`); default form submission prevented |
| C-55 | Keyboard: plain `Enter` (amount input or elsewhere) | Triggers save-and-close (`handleSubmit()`) |
| C-56 | Keyboard: `Enter` in the note `<textarea>` | Still triggers save-and-close (explicitly not treated as a newline) |
| C-57 | Keyboard: `Shift+Enter` in the note `<textarea>` | Inserts a newline; does NOT submit the form |
| C-58 | Keyboard: `Alt+1`/`Alt+2`/`Alt+3` (or `Cmd/Ctrl+1/2/3`) inside modal | Switches to expense/income/transfer tab respectively and resets `isSplit` to `false` |
| C-59 | Keyboard: `Shift+E`/`Shift+I`/`Shift+T` inside modal while NOT focused in an input/textarea | Switches type tab (E=expense, I=income, T=transfer) and resets split |
| C-60 | Keyboard: `Shift+E`/`Shift+I`/`Shift+T` while focused in an input/textarea | Shortcut is ignored (`isTyping` guard); letter is typed normally |
| C-61 | `defaultType` prop changes while modal already open (fresh add, not edit) | Updates `type` to the new `defaultType` and resets `isSplit`, but only when `initialData` is not set |
| C-62 | Transfer tab hides Category/Sub-category fields | Only Date + From/To method selectors render; no category dropdowns |
| C-63 | Save button label reflects active type | Button text reads "Save expense" / "Save income" / "Save transfer" matching the current tab |

### 2.2 `TransactionDetailPanel` (`TransactionDetailPanel.test.tsx`)

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-64 | `transaction` prop is `null` | Component renders nothing (`return null`) |
| C-65 | Expense/income transaction | Shows account name (resolved via the entry matching an existing account) and category (`head`/`subHead`) via `DetailRow`s |
| C-66 | Transfer transaction | Shows "From Account" label (CREDIT entry's account) and an additional "To Account" row (DEBIT entry's account) instead of a category row |
| C-67 | Amount sign and color | Income shows a leading `+` and income-green styling; expense shows no leading sign and expense-red styling |
| C-68 | Missing/unresolvable account or category | Falls back to "Unknown" (account) or "Uncategorized" (category) |
| C-69 | Missing note | Description row falls back to "No description provided" |
| C-70 | Edit button click | Calls `onEdit(transaction)` with the full transaction object |
| C-71 | Delete button click | Calls `onDelete(transaction.id)` |
| C-72 | Close button click | Calls `onClose()` |

### 2.3 `TxnRow` (`TxnRow.test.tsx`)

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-73 | Expense row | Renders down-arrow icon, category label as primary text, note (or account name if no note) as subtext, amount prefixed with `-` in expense color |
| C-74 | Income row | Renders up-arrow icon, amount prefixed with `+` in income color |
| C-75 | Transfer row | Renders left-right arrow icon, primary label as `"{fromAccount} → {toAccount}"`, amount with no sign prefix |
| C-76 | Unresolvable account/category names | Falls back to `'?'` in the transfer label or `'—'` in the category label rather than throwing |
| C-77 | Row click | Calls the provided `onClick` handler |

### 2.4 `Transactions` page (`Transactions.test.tsx`)

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-78 | Empty state | When `transactions.length === 0`, renders "Nothing here yet" empty-state message instead of the table |
| C-79 | Populated ledger table | Renders one header divider row per date group plus one row per transaction, each showing date, note/description, category-or-target, account, and signed amount |
| C-80 | Net total calculation | Header "Net" value sums `+amount` for income and `-amount` for expense rows in the currently filtered set, ignoring transfers |
| C-81 | Search filter | Typing in the search box updates `filter.search`; only transactions whose `note` contains the (case-insensitive) query remain |
| C-82 | Month filter | Selecting a month option sets `filter.month` to a `YYYY-MM` key; "All Time" clears it back to `undefined` |
| C-83 | Type filter | Selecting "Income"/"Expense"/"Transfer" sets `filter.uiType`; "All Types" clears it |
| C-84 | Account filter | Selecting an account sets `filter.accountId`; deleted accounts are excluded from the dropdown options |
| C-85 | No results after filtering | Shows "No transactions found matching your filters." message instead of the table when `grouped.length === 0` |
| C-86 | Row click selects a transaction | Clicking a row sets `selectedTxnId`; clicking the same row again toggles it back to `null` |
| C-87 | Row click while another row is selected | Table area gains `md:pr-[400px]` padding to make room for the detail panel |
| C-88 | Row overflow menu — Edit | Calls `window.openTransactionModal.openEdit(txn)` |
| C-89 | Row overflow menu — Duplicate | Calls `window.openTransactionModal.openDuplicate(txn)` |
| C-90 | Row overflow menu — Delete | Calls `deleteTransaction(txn.id)` directly from the row menu (no detail panel needed) |
| C-91 | Export CSV button | Calls `exportToCSV(txns, accounts, categories, methods, "moniq-{month|'all'}.csv")` using the currently filtered transaction set |
| C-92 | Detail panel Edit action | Calls `window.openTransactionModal.openEdit` (via `handleEdit`) with the selected transaction |
| C-93 | Detail panel Delete action | Calls `deleteTransaction(id)` and clears `selectedTxnId` back to `null` |
| C-94 | Detail panel Close action | Clears `selectedTxnId` to `null` without deleting |

## 3. End-to-End Tests

### 3.1 Opening the Modal (Entry Points)
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-01 | Mobile FAB tap (`Sidebar`, `lg:hidden`) | Opens modal with no preselected type; defaults to Expense tab |
| E-02 | `Alt+N` global shortcut | Opens modal with no preselected type (generic "new"), regardless of current page |
| E-03 | `Shift+E` global shortcut | Opens modal with Expense tab pre-selected |
| E-04 | `Shift+I` global shortcut | Opens modal with Income tab pre-selected |
| E-05 | `Shift+T` global shortcut | Opens modal with Transfer tab pre-selected |
| E-06 | Global shortcuts while focus is inside a text input elsewhere on the page | Shortcuts are suppressed; keystroke is typed into the field instead |
| E-07 | Ledger row "Edit" action | Opens modal in edit mode with header "Edit Transaction" and all fields pre-filled from the selected transaction |
| E-08 | Ledger row "Duplicate" action | Opens modal with fields pre-filled from the source transaction EXCEPT the date, which resets to today's date and the header reads "New Transaction" |
| E-09 | Ledger detail panel "Edit" button | Opens the modal in edit mode for the currently open transaction |

### 3.2 Full Add-Transaction Flows
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-10 | Add a simple expense end-to-end | Fill amount, date, payment method, category; click Save; modal closes; new row appears at the top of the Ledger table with correct date, category label, account, and a `-`-prefixed amount in expense color |
| E-11 | Add a simple income end-to-end | Same flow on the Income tab; new row appears with a `+`-prefixed amount in income color |
| E-12 | Add a transfer end-to-end | Select From/To payment methods and amount; new row appears formatted as `"{From} → {To}"` with no sign prefix |
| E-13 | Add a split expense end-to-end | Enable split, allocate amount across 2+ categories fully, save; two (or more) separate expense rows appear in the Ledger, one per split line, sharing the same date |
| E-14 | Add transaction, then reopen Ledger filters | Newly added transaction is immediately findable via the search box (by note) and via the month/type/account filters |
| E-15 | Add transaction and export CSV | Downloaded CSV includes a row for the new transaction with header `Date,Type,Amount,Primary Account,Target (Category/Account),Method,Note` and correctly quoted/escaped note field |
| E-16 | Rapid entry via Save & Stay (`Cmd+Enter`) | After each save, modal stays open, amount/category/note clear, date and payment method persist, and each entry shows up as a distinct row in the Ledger once the modal is finally closed |
| E-17 | Save & Close via plain `Enter` | Pressing Enter while focused in the amount field (or note field, non-Shift) saves and closes the modal in one step |
| E-18 | Edit an existing transaction end-to-end | Change the amount and category on an existing row, save; the Ledger row updates in place (no duplicate row created) and the account balance elsewhere in the app reflects the new amount |
| E-19 | Delete a transaction from the Ledger row menu | Row disappears from the visible Ledger list (soft-deleted, filtered out by `isDeleted`) |
| E-20 | Delete a transaction from the detail panel | Detail panel closes and the row disappears from the Ledger list |
| E-21 | Create a new payment method mid-entry ("Create Account & Method") | New method becomes immediately selected in the modal's Payment Method (or From/To) field without closing the modal |
| E-22 | Create a new category mid-entry ("Create Category") | New category becomes immediately selected as the transaction's category without closing the modal |
| E-23 | Date typed manually (e.g. `01/01/2026`) then saved | Ledger row reflects the typed date, not today's date |
| E-24 | Date picked via calendar popover | Ledger row date matches the clicked calendar day |

### 3.3 Ledger Filtering, Grouping & Detail Panel (Desktop)
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-25 | Transactions grouped by date | Table renders a divider row per unique date, each labeled with the formatted date, transactions nested underneath in descending date order |
| E-26 | Combined filters (month + type + account) | Only transactions satisfying all active filters simultaneously are shown; Net total in the header recalculates to match the filtered subset |
| E-27 | Clearing filters back to defaults | Selecting "All Time"/"All Types"/"All Accounts" and clearing search restores the full unfiltered ledger |
| E-28 | Opening detail panel on desktop viewport | Panel slides in from the right (`md:w-[400px]`); table area shifts left (`md:pr-[400px]`) so no row is obscured |
| E-29 | Switching selected row while panel is open | Detail panel content updates to the newly clicked transaction without a full page reload |

### 3.4 Responsive Layout (Mobile/Tablet)
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-30 | Detail panel on mobile viewport | Panel takes full width (`w-full`) rather than the fixed 400px desktop panel, covering the table |
| E-31 | FAB visibility | Floating action button is visible on mobile/tablet (`lg:hidden`) and absent on desktop layouts |
| E-32 | Ledger table horizontal scroll on narrow viewports | Table wrapper scrolls horizontally (`overflow-x-auto`, `min-w-[800px]`) rather than clipping or wrapping columns |
| E-33 | Export button label on narrow viewports | Shows abbreviated "Export" text; full "Export CSV" label shown at `md` and above |
| E-34 | Modal on mobile viewport | Modal form content area scrolls independently of the fixed header/footer, keeping Save button always reachable |
