# Feature-to-test coverage matrix

This matrix follows [the feature inventory](e2e-feature-inventory.md). Each row is a **user-visible feature**, not a test case. Status is based only on implemented automated tests in the repository on this branch:

- **Missing:** no automated test directly checks the feature.
- **Partial:** an implemented test checks a part or a lower layer, but the full user journey is untested.
- **Covered:** an implemented browser test checks the complete stated behavior.

“Live Google” identifies features that also merit a separate smoke check using a consented Google test account. It is **not** a requirement for deterministic CI coverage: CI can use a fake OAuth/Drive/Sheets service. For sync and backup, mocked runner tests and browser simulations cannot establish that real Drive and Sheets still accept the app's requests.

Evidence names refer to these existing files: [Home auth hook](../../src/hooks/__tests__/useHomeAuth.test.ts), [Home component](../../src/pages/__tests__/Home.test.tsx), [Home browser](../../e2e/home.spec.ts), [demo/navigation browser](../../e2e/demo-navigation.spec.ts), [ledger math](../../src/lib/__tests__/ledger.test.ts), and [schema tests](../../src/schema). The [case documents](README.md#planned-test-cases) are plans, not evidence. “Next automated check” gives the main missing layer; it does not exclude smaller unit tests needed to make a browser scenario reliable. The demo browser fixture seeds records through store actions, so its persistence result does not test the forms.

Known defects should get tests that describe the intended behavior once fixed: [#76](https://github.com/MakersCircle/moniq/issues/76) date format is saved but not applied, [#108](https://github.com/MakersCircle/moniq/issues/108) settings can reset after reload, [#91](https://github.com/MakersCircle/moniq/issues/91) auth gate, [#92](https://github.com/MakersCircle/moniq/issues/92) token refresh data loss, [#77](https://github.com/MakersCircle/moniq/issues/77) duplicate sync rows, [#94](https://github.com/MakersCircle/moniq/issues/94) reconnect account mismatch, [#95](https://github.com/MakersCircle/moniq/issues/95) backup migration safety, and [#96](https://github.com/MakersCircle/moniq/issues/96) cross-tab migration lock.

## 1. Enter and leave the application

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | A signed-out visitor sees the landing page and can open the Google sign-in flow. | Partial | Home component CTA | Browser + fake OAuth | Yes |
| AUTH-02 | Successful Google sign-in opens the dashboard and provisions or reconnects to the user's Drive folder and spreadsheet. | Partial | useHomeAuth callback | Browser + fake Google | Yes |
| AUTH-03 | A mobile redirect login consumes the returned access token and opens the dashboard. | Partial | useHomeAuth redirect hash | Mobile browser + fake OAuth | Yes |
| AUTH-04 | A returning user reloads with locally stored data rehydrated and cloud changes reconciled before the app opens. | Missing | — | Fake Google browser + unit/integration | Yes |
| AUTH-05 | An expired session shows a reconnect banner; re-authentication resumes cloud access. | Missing | — | Fake Google browser + unit/integration | Yes |
| AUTH-06 | A cloud initialization failure shows a connection error with Retry Connection and Sign Out actions. | Missing | — | Fake Google browser + unit/integration | Yes |
| AUTH-07 | Signing in with a different Google account on the same browser clears the prior account's local data before connecting. | Missing | — | Fake Google browser + unit/integration | Yes |
| AUTH-08 | Signing out syncs pending changes first; a sync failure offers Cancel and Sign Out Anyway. | Missing | — | Fake Google browser + unit/integration | Yes |
| AUTH-09 | Signed-out access to an app route returns to the landing page; signed-in access to `/` opens the dashboard. | Missing | — | Fake Google browser + unit/integration | No |
| AUTH-10 | Google sign-in requests access to files this app creates and to the user's basic profile and email. | Missing | — | Fake Google browser + unit/integration | Yes |

## 2. Use demo mode

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| DEMO-01 | Try Demo opens the app without Google authentication and stores entered data locally. | Partial | Demo/navigation browser entry; seed bypasses forms | Enter data through a form, then reload | No |
| DEMO-02 | Demo data and the demo session survive a page reload. | Covered | Demo/navigation browser reload + IndexedDB | — | No |
| DEMO-03 | The demo banner identifies local-only data and can be dismissed for the current view. | Missing | — | Component + browser | No |
| DEMO-04 | Sign In to Sync can keep demo entries and upload them to the signed-in user's Drive data. | Missing | — | Fake Google browser + component | Yes |
| DEMO-05 | Sign In to Sync can discard demo entries and start with an empty ledger. | Missing | — | Fake Google browser + component | Yes |
| DEMO-06 | The conversion dialog can be canceled to stay in demo mode, from the banner or Settings. | Missing | — | Component + browser | No |

## 3. Navigate and read public content

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| NAV-01 | The main navigation opens Dashboard, Ledger, Insights, Budget, and Settings. | Covered | Demo/navigation browser, six viewports | — | No |
| NAV-02 | Settings navigation opens Accounts, Payment Methods, Categories, and Recently Deleted. | Covered | Demo/navigation browser, six viewports | — | No |
| NAV-03 | Desktop navigation uses a sidebar; mobile navigation uses a bottom bar and a new-transaction button. | Covered | Demo/navigation browser, six viewports | — | No |
| NAV-04 | The mobile top bar opens Settings and expands its search field when focused. | Partial | Demo/navigation browser Settings link | Browser focus/expansion | No |
| NAV-05 | A visitor can open Docs, Privacy Policy, and Terms of Service without signing in. | Partial | Home browser footer links | Browser page content | No |
| NAV-06 | Docs navigation opens Getting Started, Keyboard Shortcuts, FAQ, Handling Scenarios, Architecture, and Changelog; internal document links stay in app navigation. | Missing | — | Browser | No |
| NAV-07 | An unknown docs page shows its not-found state and a route back to Getting Started. | Missing | — | Browser | No |
| NAV-08 | An unexpected render failure shows the recovery screen with Reload Application and Clear Local Data actions. | Missing | — | Browser | No |
| NAV-09 | The public landing page exposes its canonical and social-sharing metadata to the browser. | Missing | — | Browser | No |
| NAV-10 | Pressing `/` outside a text field focuses the top-bar search input. | Missing | — | Browser | No |

## 4. Record transactions

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| TXN-01 | New Transaction opens from desktop header, mobile action button, or global keyboard shortcut. | Partial | Demo/navigation browser desktop + mobile buttons | Browser keyboard shortcuts | No |
| TXN-02 | Create an expense with amount, date, payment method, category, and optional note; account and category balances update. | Partial | LedgerEngine expense entries/balance | Store + browser | No |
| TXN-03 | Create an income with a payment method and category; the linked account and dashboard totals update. | Partial | LedgerEngine income entries/balance | Store + browser | No |
| TXN-04 | Transfer between payment methods linked to different accounts; both account balances update without counting the transfer as income or expense. | Partial | LedgerEngine transfer entries/balance | Store + browser | No |
| TXN-05 | The transfer destination list excludes methods linked to the selected source account. | Missing | — | Component + browser | No |
| TXN-06 | Split one expense across multiple categories; the total must be fully allocated before saving and each split appears as a transaction. | Missing | — | Component + browser | No |
| TXN-07 | The Save action stays unavailable until required fields contain a valid positive amount, date, method, and category or transfer destination. | Missing | — | Component + browser | No |
| TXN-08 | The amount input rejects negative and nonnumeric symbols and displays locale-aware thousands separators as the user types. | Missing | — | Component + browser | No |
| TXN-09 | The form shows the expected account balance for the selected method and entered amount. | Missing | — | Component + browser | No |
| TXN-10 | The date picker accepts a calendar selection and shorthand or separated typed dates, and defaults to the local current date. | Missing | — | Component + browser | No |
| TXN-11 | Method choices distinguish identical method names by showing their linked account. | Missing | — | Component + browser | No |
| TXN-12 | A new account and payment method can be created inside the transaction form and selected for that transaction. | Missing | — | Component + browser | No |
| TXN-13 | A new category can be created inside the transaction form and selected for that transaction. | Missing | — | Component + browser | No |
| TXN-14 | The form starts with the most recently used payment method when available. | Missing | — | Component + browser | No |
| TXN-15 | Save and Add Another keeps date, payment method, and type, clears entry-specific fields, and refocuses Amount. | Missing | — | Component + browser | No |
| TXN-16 | Enter saves and closes; Ctrl/Cmd+Enter saves and stays; Shift+Enter inserts a new line in Notes. | Missing | — | Component + browser | No |
| TXN-17 | Alt/Cmd+1, 2, and 3 switch the form between Expense, Income, and Transfer. | Missing | — | Component + browser | No |
| TXN-18 | Alt+N opens a new transaction; Shift+E, I, or T opens the corresponding type from an app page when focus is outside a text field. | Missing | — | Component + browser | No |
| TXN-19 | Keyboard typing can select matching payment methods and categories from their dropdowns. | Missing | — | Component + browser | No |

## 5. Review and manage the ledger

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| LEDGER-01 | With no transactions, the Ledger shows an empty state. | Missing | — | Component + browser | No |
| LEDGER-02 | The Ledger lists transactions newest date first, grouped by date, with type-specific amount styling and a displayed net for the current result set. | Missing | — | Component + browser | No |
| LEDGER-03 | Search filters transactions by description; month, type, and account filters can be combined and cleared. | Missing | — | Component + browser | No |
| LEDGER-04 | A filter with no matches shows an empty-results state while other transactions still exist. | Missing | — | Component + browser | No |
| LEDGER-05 | Export CSV downloads the currently filtered transactions. | Missing | — | Component + browser | No |
| LEDGER-06 | Selecting a row opens its details with date, amount, source account, category or destination account, and note. | Missing | — | Component + browser | No |
| LEDGER-07 | Edit from the detail panel changes a transaction in place and updates the ledger and balances. | Missing | — | Component + browser | No |
| LEDGER-08 | Delete from the detail panel removes the transaction from active views and places it in Recently Deleted. | Missing | — | Component + browser | No |
| LEDGER-09 | Dragging transactions within one date changes and persists their same-day order. | Missing | — | Component + browser | No |
| LEDGER-10 | On mobile, category and account appear beneath the description and details open as a bottom drawer. | Missing | — | Component + browser | No |

## 6. Manage accounts, methods, and categories

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| ACCOUNT-01 | Create an Asset or Liability account with a name, optional description and opening balance; a first payment method is created with it. | Missing | — | Component + browser | No |
| ACCOUNT-02 | A new account's payment method name defaults to its account name and can be customized during creation. | Missing | — | Component + browser | No |
| ACCOUNT-03 | Edit account details, including savings and exclusion-from-net-worth flags; Liability accounts cannot be marked as savings. | Missing | — | Component + browser | No |
| ACCOUNT-04 | Archive and reactivate an account; archived accounts are separated from active accounts. | Missing | — | Component + browser | No |
| ACCOUNT-05 | Delete an archived account; a dependency guard explains why deletion is blocked when related data remains. | Missing | — | Component + browser | No |
| METHOD-01 | Create a named payment method linked to an active account; missing name or account is rejected. | Missing | — | Component + browser | No |
| METHOD-02 | Edit a payment method's name or linked account. | Missing | — | Component + browser | No |
| METHOD-03 | Reorder active payment methods and see that order in transaction selectors. | Missing | — | Component + browser | No |
| METHOD-04 | Archive, reactivate, and delete a payment method; blocked deletion gives a reason. | Missing | — | Component + browser | No |
| CATEGORY-01 | Create a category in Income, Needs, Wants, Invest, Lend, or Borrow with a head and optional subhead. | Missing | — | Component + browser | No |
| CATEGORY-02 | Search existing heads while entering a category, or type a new head. | Missing | — | Component + browser | No |
| CATEGORY-03 | Missing head and duplicate head/subhead combinations are rejected. | Missing | — | Component + browser | No |
| CATEGORY-04 | Invest, Lend, and Borrow categories accept an opening balance and show their running balance. | Missing | — | Component + browser | No |
| CATEGORY-05 | Edit a category's group, head, subhead, or applicable opening balance. | Missing | — | Component + browser | No |
| CATEGORY-06 | Reorder categories within a group and see that order in transaction selectors and budget views. | Missing | — | Component + browser | No |
| CATEGORY-07 | Archive, reactivate, and delete a category; blocked deletion gives a reason. | Missing | — | Component + browser | No |
| CATEGORY-08 | The account, method, and category editors use a side drawer on desktop and a bottom sheet on mobile. | Missing | — | Component + browser | No |

## 7. Monitor finances

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| DASH-01 | A new data set shows the Dashboard welcome state until transaction activity exists. | Missing | — | Component + browser | No |
| DASH-02 | Dashboard cards show current-month income and expenses, savings rate, remaining amount, and total net worth. | Missing | — | Component + browser | No |
| DASH-03 | Income and expense cards show Indian fiscal-year-to-date totals. | Missing | — | Component + browser | No |
| DASH-04 | Total net worth subtracts liabilities and shows spendable cash and savings separately, respecting account flags. | Missing | — | Component + browser | No |
| DASH-05 | The expandable Additional Summaries section shows total receivable and payable from relevant accounts and categories when present. | Missing | — | Component + browser | No |
| DASH-06 | The account summary shows the five most recently used accounts with current balances and links to account management. | Missing | — | Component + browser | No |
| DASH-07 | The spending breakdown shows category spending for the current period and links to Insights. | Missing | — | Component + browser | No |
| DASH-08 | Recent transactions show the latest activity and link to the full Ledger. | Missing | — | Component + browser | No |
| BUDGET-01 | Budget shows an empty state before transactions exist. | Missing | — | Component + browser | No |
| BUDGET-02 | Changing month updates income, allocated total, remaining-to-allocate amount, and category rows for that month. | Missing | — | Component + browser | No |
| BUDGET-03 | Editing a category's monthly budget updates its budgeted, spent, remaining, and progress displays. | Missing | — | Component + browser | No |
| BUDGET-04 | Over-allocation and category overspending are distinguished in the displayed totals and progress. | Missing | — | Component + browser | No |
| INSIGHT-01 | Insights shows an empty state before transactions exist. | Missing | — | Component + browser | No |
| INSIGHT-02 | Current-month category spending appears as a donut chart with a ranked percentage breakdown. | Missing | — | Component + browser | No |
| INSIGHT-03 | Historical expense and income-versus-expense charts reflect recorded transactions. | Missing | — | Component + browser | No |

## 8. Restore deleted data

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| TRASH-01 | Recently Deleted separates transactions, accounts, methods, and categories into tabs with counts and empty states. | Missing | — | Component + browser | No |
| TRASH-02 | Deleted transactions can be sorted by deletion time or creation time. | Missing | — | Component + browser | No |
| TRASH-03 | Restore a deleted account, method, category, or transaction and see it return to active views. | Missing | — | Component + browser | No |
| TRASH-04 | Restoring a method requires its linked account to be restored first. | Missing | — | Component + browser | No |
| TRASH-05 | Restoring a transaction requires its deleted account and category to be restored first. | Missing | — | Component + browser | No |
| TRASH-06 | Restoring a deleted account also restores its linked deleted payment methods. | Missing | — | Component + browser | No |

## 9. Configure preferences and data safety

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| SETTINGS-01 | Search and select a currency; its symbol and formatted amounts update across the app. | Missing | — | Component + browser | No |
| SETTINGS-02 | Search and select a number locale; the live preview and formatted amounts update. | Missing | — | Component + browser | No |
| SETTINGS-03 | Select a date format from the available previews and retain the preference after reload. | Missing | — | Component + browser | No |
| SETTINGS-04 | Settings displays the signed-in profile, cloud sync state, last sync time, and any sync error. | Missing | — | Fake Google browser + component | Yes |
| SETTINGS-05 | Pending-change count and tooltip identify unsynced local items. | Missing | — | Fake Google browser + component | Yes |
| SETTINGS-06 | Reset Data requires the exact confirmation phrase before deleting local and cloud data and returning to the landing page. | Missing | — | Fake Google browser + component | Yes |
| SETTINGS-07 | A failed reset shows an error and keeps the app available for another attempt. | Missing | — | Fake Google browser + component | Yes |

## 10. Sync and recover data

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| SYNC-01 | Local changes are usable immediately and later appear in the user's Google spreadsheet. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-02 | Changes made offline remain queued and sync after connectivity returns, including after a reload. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-03 | Sync Now pushes pending changes or pulls remote changes when nothing is pending. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-04 | A second device reconnects to the existing Drive spreadsheet and receives the same data. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-05 | A direct edit to a spreadsheet row is reflected back in the app on synchronization. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-06 | Concurrent local and remote changes reconcile without duplicating rows. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-07 | Temporary API failures retain the pending queue, show a sync error when retries are exhausted, and allow recovery on a later load or sync. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-08 | A missing or damaged sheet tab or header is repaired so existing data remains accessible. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-09 | Opening older IndexedDB and Sheets data upgrades their schemas and preserves user data, including transaction order. | Partial | Schema entity/runner tests | Older-fixture migration + browser | Yes |
| SYNC-10 | A Sheets migration creates a pre-upgrade Drive copy, resumes after interruption, and prevents another open tab from writing during migration. | Missing | — | Interrupted migration + two-tab browser | Yes |

## 11. Back up and install the app

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| BACKUP-01 | The app creates due daily, weekly, monthly, and fiscal-yearly Drive snapshots after sync or while left open. | Missing | — | Fake Google browser + unit/integration | Yes |
| BACKUP-02 | Backup scheduling checks actual Drive snapshots and recreates missing ones. | Missing | — | Fake Google browser + unit/integration | Yes |
| BACKUP-03 | Backup Now creates a new manual snapshot even when another backup was made that day. | Missing | — | Fake Google browser + unit/integration | Yes |
| BACKUP-04 | View Latest Snapshots shows the newest manual and automated copies, their times, and retention information. | Missing | — | Fake Google browser + unit/integration | Yes |
| BACKUP-05 | Backup retention removes older manual, daily, weekly, and monthly copies beyond their tier limits. | Missing | — | Fake Google browser + unit/integration | Yes |
| PWA-01 | The app can be installed from a supported browser with its own name and icons. | Missing | — | Installed/offline browser | No |
| PWA-02 | Previously cached app routes and assets load while offline. | Missing | — | Installed/offline browser | No |
| PWA-03 | Installed mobile app icons display correctly on iOS and Android home screens. | Missing | — | Installed/offline browser | No |

Tracked: **118 features**; **11 partial**, **103 missing**, **4 covered end to end**. Recalculate these totals when adding tests.
