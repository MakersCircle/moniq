# Current end-to-end feature inventory

This is the inventory of **user-facing behavior to protect** through a browser and, where relevant, its IndexedDB and Google Drive data. It is a feature tracker, not a statement about existing test coverage. Some expected flows have known defects; the [coverage matrix](feature-coverage.md) links those issues and records actual automated evidence. Each heading is a user journey; each row is a distinct behavior within that journey. IDs are stable references for future test planning.

The **Recorded** column names the earliest relevant entry in [the changelog](../CHANGELOG.md). `Code` means the behavior exists in the current code but its introduction is not explicitly recorded. `Unreleased` means it is present on this branch and documented under Unreleased. Changelog changes and removals have been applied, then the result was checked against the current routes, screens, and data flows. Visual styling, performance metrics, and internal refactors are not separate features unless they change an observable flow.

## 1. Enter and leave the application

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| AUTH-01 | A signed-out visitor sees the landing page and can open the Google sign-in flow. | 0.1.0 |
| AUTH-02 | Successful Google sign-in opens the dashboard and provisions or reconnects to the user's Drive folder and spreadsheet. | 0.1.0, 0.7.0 |
| AUTH-03 | A mobile redirect login consumes the returned access token and opens the dashboard. | 0.8.1 |
| AUTH-04 | A returning user opens saved data after identity verification and initial Sheets reconciliation; explicitly trusted devices can open local data immediately. | 0.2.0, Unreleased |
| AUTH-05 | Expired Google access preserves local recording and trusted-device reloads; a sync-paused banner offers reconnect and uploads queued changes. | 0.2.8 |
| AUTH-06 | A cloud initialization failure shows a connection error with Retry Connection and Sign Out actions. | 0.8.0 |
| AUTH-07 | Reconnecting with a different Google account preserves local records and asks for the original account before syncing. | 0.7.0, 0.8.0 |
| AUTH-08 | Signing out syncs pending changes first; a sync failure offers Cancel and Sign Out Anyway. | Code |
| AUTH-09 | Signed-out access to an app route returns to the landing page; signed-in access to `/` opens the dashboard. | 0.1.0 |
| AUTH-10 | Google sign-in requests access to files this app creates and to the user's basic profile and email. | 0.7.0 |
| AUTH-11 | OAuth credentials survive a tab reload without being saved to IndexedDB or inherited by an independently opened tab. | Unreleased |
| AUTH-12 | Fresh shared-device launches keep financial records locked until original-account verification and initial cloud reconciliation; explicit device trust permits local/offline access and can be revoked in Settings. | Unreleased |

## 2. Use demo mode

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| DEMO-01 | Try Demo opens the app without Google authentication and stores entered data locally. | 0.9.0 |
| DEMO-02 | Demo data and the demo session survive a page reload. | 0.9.0 |
| DEMO-03 | The demo banner identifies local-only data and can be dismissed for the current view. | 0.9.0 |
| DEMO-04 | Sign In to Sync can keep demo entries and upload them to the signed-in user's Drive data. | 0.9.0 |
| DEMO-05 | Sign In to Sync can discard demo entries and start with an empty ledger. | 0.9.0 |
| DEMO-06 | The conversion dialog can be canceled to stay in demo mode, from the banner or Settings. | 0.9.0 |

## 3. Navigate and read public content

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| NAV-01 | The main navigation opens Dashboard, Ledger, Insights, Budget, and Settings. | 0.1.0 |
| NAV-02 | Settings navigation opens Accounts, Payment Methods, Categories, and Recently Deleted; on mobile, the selected section tab stays centered when space allows and clamps at the ends. | 0.2.0, Unreleased |
| NAV-03 | Desktop navigation uses a sidebar; mobile navigation uses a bottom bar and a new-transaction button. | 0.9.0 |
| NAV-04 | The mobile top bar opens Settings and expands its search field when focused; entered text can be cleared with an inline clear control. | Unreleased |
| NAV-05 | A visitor can open Docs, Privacy Policy, and Terms of Service without signing in. | 0.6.1 |
| NAV-06 | Docs navigation opens Getting Started, Keyboard Shortcuts, FAQ, Handling Scenarios, Architecture, and Changelog; internal document links stay in app navigation. | 0.6.1, Code |
| NAV-07 | An unknown docs page shows its not-found state and a route back to Getting Started. | Code |
| NAV-08 | An unexpected render failure shows the recovery screen with Reload Application and Clear Local Data actions. | 0.1.0 |
| NAV-09 | The public landing page exposes its canonical and social-sharing metadata to the browser. | 0.9.0 |
| NAV-10 | Pressing `/` outside a text field focuses the top-bar search input. | Code |
| NAV-11 | Mobile app pages scroll within their intended content area without an extra document scroll or blank space, including when a banner is visible, and full-height surfaces follow dynamic viewport changes. | Unreleased |

## 4. Record transactions

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| TXN-01 | New Transaction opens from desktop header, mobile action button, or global keyboard shortcut. | 0.1.0, 0.5.0 |
| TXN-02 | Create an expense with amount, date, payment method, category, and optional note; account and category balances update. | 0.1.1, 0.1.2 |
| TXN-03 | Create an income with a payment method and category; the linked account and dashboard totals update. | 0.1.1, 0.1.2 |
| TXN-04 | Transfer between payment methods linked to different accounts; both account balances update without counting the transfer as income or expense. | 0.1.1, Code |
| TXN-05 | The transfer destination list excludes methods linked to the selected source account. | Code |
| TXN-06 | Split one expense across multiple categories; the total must be fully allocated before saving and each split appears as a transaction. | Code |
| TXN-07 | The Save action stays unavailable until required fields contain a valid positive amount, date, method, and category or transfer destination. | 0.5.0 |
| TXN-08 | The amount input rejects negative and nonnumeric symbols and displays locale-aware thousands separators as the user types. | 0.5.0, 0.9.0 |
| TXN-09 | The form shows the expected account balance for the selected method and entered amount. | 0.9.4 |
| TXN-10 | The date picker accepts a calendar selection and shorthand or separated typed dates, and defaults to the local current date. | 0.1.0, 0.5.0, 0.9.4 |
| TXN-11 | Method choices distinguish identical method names by showing their linked account. | Unreleased |
| TXN-12 | A new account and payment method can be created inside the transaction form and selected for that transaction. | 0.9.0 |
| TXN-13 | A new category can be created inside the transaction form and selected for that transaction. | Code |
| TXN-14 | The form starts with the most recently used payment method when available. | 0.5.0 |
| TXN-15 | Save and Add Another keeps date, payment method, and type, clears entry-specific fields, and refocuses Amount. | 0.5.0 |
| TXN-16 | Enter saves and closes; Ctrl/Cmd+Enter saves and stays; Shift+Enter inserts a new line in Notes. | 0.5.0 |
| TXN-17 | Alt/Cmd+1, 2, and 3 switch the form between Expense, Income, and Transfer. | 0.5.0 |
| TXN-18 | Alt+N opens a new transaction; Shift+E, I, or T opens the corresponding type from an app page when focus is outside a text field. | 0.5.0 |
| TXN-19 | Keyboard typing can select matching payment methods and categories from their dropdowns. | 0.5.0 |
| TXN-20 | On phone and tablet widths, the primary transaction amount remains 48 px, date/note/split fields stay at least 16 px, and payment method/category/subcategory controls and options have 44 px touch targets. | Unreleased |

## 5. Review and manage the ledger

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| LEDGER-01 | With no transactions, the Ledger shows an empty state. | Code |
| LEDGER-02 | The Ledger shows the filtered transaction count and lists transactions newest date first, grouped by date, with type-specific amount styling. | Code, 0.9.5 |
| LEDGER-03 | Search and type filters sit in the Ledger toolbar beside Export PDF, using labeled controls on desktop and compact icons on mobile; search opens from an icon without automatically focusing the mobile input. Date, multi-select account, category, and amount range filters can be combined and cleared. The Date column filter supports multiple individual dates, Sunday-to-Saturday weeks, months, years, and an inclusive custom date range. Custom ranges preview between the selected endpoint and hovered date in either calendar, support choosing both endpoints in one calendar session, and accept either endpoint order. Clicking selected calendar periods toggles them off. Week mode highlights the full row on hover and uses a consistent selection color. | Unreleased |
| LEDGER-04 | A filter with no matches shows an empty-results message inside the Ledger table while its column headings remain visible. | Unreleased |
| LEDGER-05 | Export a PDF using radio-selected date range and report type, an independent account dropdown, and custom date calendars that appear only for a custom range. Choose both endpoints in one calendar session without an invalid-range alert while incomplete, preview the range on hover, and accept either endpoint order. | Unreleased |
| LEDGER-06 | Selecting a row opens its details with date, amount, source account, category or destination account, and note. | Code |
| LEDGER-07 | Edit from the detail panel changes a transaction in place and updates the ledger and balances. | 0.9.6 |
| LEDGER-08 | Delete from the detail panel removes the transaction from active views and places it in Recently Deleted. | 0.3.0 |
| LEDGER-09 | Show dates and transactions within each date newest first; allow manual reordering within one date using only the six-dot handle, keep mobile scrolling within that date group, and persist the chosen order after drop. | Unreleased |
| LEDGER-10 | On mobile, category and account appear beneath the description and details open as a bottom drawer. | 0.9.6 |
| LEDGER-11 | Filter Ledger rows using expandable category checkboxes; selecting a category includes all its subcategories, individual subcategories can be selected, search focuses on desktop without summoning the mobile keyboard, and multiple matching entries still show one transaction row. | Unreleased |
| LEDGER-12 | Filter Ledger rows using a searchable, flat account checkbox list with multiple account selection and no expand controls. | Unreleased |
| LEDGER-13 | Filter Ledger rows to an inclusive minimum and maximum transaction amount using a dual-ended slider or precise Min/Max fields; retain the global slider scale while constraining handles to the range left by other filters. | Unreleased |
| LEDGER-14 | Keep compact search, filter, and export touch targets with aligned icons on mobile; expand and clear search without obscuring the title. Type selections combine with OR and other filter groups combine with AND. Selecting all or no types leaves all transactions visible. The mobile filter menu opens with Type expanded and uses a single-open accordion, a blurred animated backdrop, and an active-filter indicator. | Unreleased |
| LEDGER-15 | Ledger popovers, selects, and menus flip or shift away from viewport edges and keep tall content scrollable within the available space. | Unreleased |
| LEDGER-16 | Open the mobile Filters bottom sheet with an upward slide and blurred backdrop; show one Type, Account, or Category accordion at a time; fit short lists to content, cap and scroll long lists, show search only for larger lists, combine selections, and indicate active filters. | Unreleased |
| LEDGER-17 | Keep the sticky Ledger column header aligned with the scrollable rows while hiding its unnecessary hover scrollbar. | Unreleased |
| LEDGER-18 | On phones, keep Ledger scrolling vertical and prevent the table frame from horizontally panning or overflowing the page. | Unreleased |
| LEDGER-19 | Keep phone Ledger rows visually separate after vertical scrolling and transaction-list updates, including rows with different content heights. | Unreleased |

## 6. Manage accounts, methods, and categories

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| ACCOUNT-01 | Create an Asset or Liability account with a name, optional description and opening balance; a first payment method is created with it. | 0.1.1, 0.9.0 |
| ACCOUNT-02 | A new account's payment method name defaults to its account name and can be customized during creation. | 0.1.2, 0.9.0 |
| ACCOUNT-03 | Edit account details, including savings and exclusion-from-net-worth flags; Liability accounts cannot be marked as savings. | 0.4.0, Code |
| ACCOUNT-04 | Archive and reactivate an account; archived accounts are separated from active accounts. | 0.1.2 |
| ACCOUNT-05 | Delete an archived account; a dependency guard explains why deletion is blocked when related data remains. | 0.1.2 |
| METHOD-01 | Create a named payment method linked to an active account; missing name or account is rejected. | 0.1.1, Code |
| METHOD-02 | Edit a payment method's name or linked account. | Code |
| METHOD-03 | Reorder active payment methods using only the six-dot handle and see that order in transaction selectors. | 0.6.0, Unreleased |
| METHOD-04 | Archive, reactivate, and delete a payment method; blocked deletion gives a reason. | 0.1.2 |
| CATEGORY-01 | Create a category in Income, Needs, Wants, Invest, Lend, or Borrow with a head and optional subhead. | 0.1.2 |
| CATEGORY-02 | Search existing heads while entering a category, or type a new head. | 0.6.0 |
| CATEGORY-03 | Missing head and duplicate head/subhead combinations are rejected. | Code |
| CATEGORY-04 | Invest, Lend, and Borrow categories accept an opening balance and show their running balance. | 0.9.7 |
| CATEGORY-05 | Edit a category's group, head, subhead, or applicable opening balance. | Code |
| CATEGORY-06 | Reorder categories within a group using only the six-dot handle, keep dragging and mobile scrolling within that group, and see the saved order in transaction selectors and budget views. | 0.6.0, Unreleased |
| CATEGORY-07 | Archive, reactivate, and delete a category; blocked deletion gives a reason. | 0.1.2 |
| CATEGORY-08 | The account, method, and category editors use a side drawer on desktop and a bottom sheet on mobile. | 0.9.0 |

## 7. Monitor finances

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| DASH-01 | A new data set shows the Dashboard welcome state until transaction activity exists. | Code |
| DASH-02 | Dashboard cards show current-month income and expenses, savings rate, remaining amount, and total net worth. | Code, 0.9.5 |
| DASH-03 | Income and expense cards show Indian fiscal-year-to-date totals. | 0.9.5 |
| DASH-04 | Total net worth subtracts liabilities and shows spendable cash and savings separately, respecting account flags. | 0.4.0, 0.9.5 |
| DASH-05 | The expandable Additional Summaries section shows total receivable and payable from relevant accounts and categories when present. | 0.9.7 |
| DASH-06 | The account summary shows the five most recently used accounts with current balances and links to account management. | 0.9.5 |
| DASH-07 | The spending breakdown shows category spending for the current period and links to Insights. | Code |
| DASH-08 | Recent transactions show the latest activity and link to the full Ledger. | Code |
| BUDGET-01 | Budget shows an empty state before transactions exist. | Code |
| BUDGET-02 | Changing month updates income, allocated total, remaining-to-allocate amount, and category rows for that month. | Code |
| BUDGET-03 | Editing a category's monthly budget updates its budgeted, spent, remaining, and progress displays. | Code |
| BUDGET-04 | Over-allocation and category overspending are distinguished in the displayed totals and progress. | Code |
| INSIGHT-01 | Insights shows an empty state before transactions exist. | Code |
| INSIGHT-02 | Spending in the selected date range appears as a donut chart with a ranked percentage breakdown. | Code |
| INSIGHT-03 | Monthly expense and income-versus-expense charts show the months and values inside the selected date range. | Code |
| INSIGHT-04 | A date-range selector defaults to the current month, closes after preset selection or both custom endpoints, and updates the Sankey, category breakdown, and date-filtered monthly trends. The independent annual cashflow calendar has its own year selector. Custom selection has no invalid-range alert while incomplete, previews the range on hover, and accepts either endpoint order. The Sankey info button explains transfer and balance methodology. The Sankey excludes transfers, omits placeholder nodes for absent subcategories, makes period-total differences explicit, hides overlapping labels, collapses subcategories and fits all stages to viewport width on phones, and reveals smaller-flow labels and currency values on hover or tap. Spending pace and contribution cards keep their own comparison windows, explained in info buttons. | Unreleased |
| INSIGHT-05 | Spending pace compares daily cumulative expenses this month with the same days last month and the average of the previous three complete months; the current-month line ends today and short months align to their final day. The compact header has no subtitle; an info button explains the time window and comparison. Last month is green and the average is gray. | Unreleased |
| INSIGHT-06 | A savings and investment balance chart defaults to the latest 12 months and has 12M and All controls beside the title. Three lines show Savings, Investments, and Total. Opening balances and prior ledger activity seed each series for the visible period; the Y-axis starts at the lowest of those opening balances (or lower if a later balance falls below it). All starts at the earliest eligible opening balance or transaction. An info button explains the time window and clarifies that balances do not represent investment returns or market value. Empty-state copy reflects the selected range. | Unreleased |
| INSIGHT-07 | A year-at-a-glance cashflow calendar shows months across columns of weeks and weekdays down rows, with a year selector independent of the page date range. Daily net cashflow shades cells red-to-green; hover, focus, or tap reveals income and spent totals. Transfers and deleted transactions are excluded. The phone grid scrolls inside its own viewport, initially positions today in view, and does not cause page overflow. | Unreleased |

## 8. Restore deleted data

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| TRASH-01 | Recently Deleted separates transactions, accounts, methods, and categories into tabs with counts and empty states; on phones, its tabs scroll to the selected section and each type uses a readable card with a visible restore action. | 0.2.0, 0.3.0, Unreleased |
| TRASH-02 | Deleted transactions can be sorted by deletion time or creation time. | 0.3.0 |
| TRASH-03 | Restore a deleted account, method, category, or transaction and see it return to active views. | 0.2.0, 0.3.0 |
| TRASH-04 | Restoring a method requires its linked account to be restored first. | 0.3.0, Code |
| TRASH-05 | Restoring a transaction requires its deleted account and category to be restored first. | 0.3.0, Code |
| TRASH-06 | Restoring a deleted account also restores its linked deleted payment methods. | 0.3.0, Code |

## 9. Configure preferences and data safety

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| SETTINGS-01 | Search and select a currency; its symbol and formatted amounts update across the app. | 0.1.1, 0.2.4 |
| SETTINGS-02 | Search and select a number locale; the live preview and formatted amounts update. | 0.1.1, 0.2.4 |
| SETTINGS-03 | Select a date format from the available previews and retain the preference after reload. | Code |
| SETTINGS-04 | Settings displays the signed-in profile, cloud sync state, last sync time, and any sync error; on mobile, profile details and Sign Out remain visible without overlap. | Code, Unreleased |
| SETTINGS-05 | Pending-change count and tooltip identify unsynced local items. | 0.8.0 |
| SETTINGS-06 | Reset Data requires the exact confirmation phrase before deleting local and cloud data and returning to the landing page. | 0.2.0, 0.8.0 |
| SETTINGS-07 | A failed reset shows an error and keeps the app available for another attempt. | 0.8.0 |
| SETTINGS-08 | Regional defaults and explicit preferences persist through demo reloads, pending cloud sync, and device locale changes. | Unreleased |

## 10. Sync and recover data

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| SYNC-01 | Local changes are usable immediately and later appear in the user's Google spreadsheet. | 0.2.0 |
| SYNC-02 | Changes made offline remain queued and sync after connectivity returns, including after a reload. | 0.2.0 |
| SYNC-03 | Sync Now pushes pending changes or pulls remote changes when nothing is pending. | 0.8.0 |
| SYNC-04 | A second device reconnects to the existing Drive spreadsheet and receives the same data. | 0.7.0 |
| SYNC-05 | A direct edit to a spreadsheet row is reflected back in the app on synchronization. | 0.2.0, 0.8.0 |
| SYNC-06 | Concurrent local and remote changes reconcile without duplicating rows. | 0.8.0 |
| SYNC-07 | Temporary API failures retain the pending queue, show a sync error when retries are exhausted, and allow recovery on a later load or sync. | 0.8.0 |
| SYNC-08 | A missing or damaged sheet tab or header is repaired so existing data remains accessible. | 0.2.0 |
| SYNC-09 | Opening older IndexedDB and Sheets data upgrades their schemas and preserves user data, including transaction order. | 0.9.0, Unreleased |
| SYNC-10 | A Sheets migration creates a pre-upgrade Drive copy, resumes after interruption, and prevents another open tab from writing during migration. | 0.9.0 |

## 11. Back up and install the app

| ID | Testable behavior | Recorded |
| --- | --- | --- |
| BACKUP-01 | The app creates due daily, weekly, monthly, and fiscal-yearly Drive snapshots after sync or while left open. | 0.2.9, 0.8.0 |
| BACKUP-02 | Backup scheduling checks actual Drive snapshots and recreates missing ones. | 0.8.0 |
| BACKUP-03 | Backup Now creates a new manual snapshot even when another backup was made that day. | 0.4.0, 0.8.0 |
| BACKUP-04 | View Latest Snapshots shows the newest manual and automated copies, their times, and retention information. | 0.8.0 |
| BACKUP-05 | Backup retention removes older manual, daily, weekly, and monthly copies beyond their tier limits. | 0.2.9, 0.8.0 |
| PWA-01 | The app can be installed from a supported browser with its own name and icons. | 0.9.2 |
| PWA-02 | Previously cached app routes and assets load while offline. | 0.9.2 |
| PWA-03 | Installed mobile app icons display correctly on iOS and Android home screens. | 0.9.3 |

## Maintaining this inventory

For each new release, read its changelog entries in order and add, revise, or remove affected behaviors. Check the resulting current behavior in the relevant routes and data flows; the changelog may omit a feature or describe a behavior that was later replaced. Keep an ID when the same behavior evolves, assign a new ID to a distinct behavior, and never reuse a removed ID. Keep this document current-only: removed behavior belongs in the changelog, not in a historical section here. Do not use this inventory to imply that a behavior already has an automated test.
