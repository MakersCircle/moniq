# Feature-to-test coverage matrix

This matrix follows [the feature inventory](e2e-feature-inventory.md). Each row is a **user-visible feature**, not a test case. Status is based only on implemented automated tests in the repository on this branch:

- **Missing:** no automated test directly checks the feature.
- **Partial:** an implemented test checks a part or a lower layer, but the full user journey is untested.
- **Covered:** an implemented browser test checks the complete stated behavior.

“Live Google” identifies features that also merit a separate smoke check using a consented Google test account. It is **not** a requirement for deterministic CI coverage: CI can use a fake OAuth/Drive/Sheets service. For sync and backup, mocked runner tests and browser simulations cannot establish that real Drive and Sheets still accept the app's requests.

Evidence names refer to these existing files: [Home auth hook](../../src/hooks/__tests__/useHomeAuth.test.ts), [OAuth session logic](../../src/lib/__tests__/authSession.test.ts), [Home component](../../src/pages/__tests__/Home.test.tsx), [Home browser](../../e2e/home.spec.ts), [auth browser](../../e2e/auth-flow.spec.ts), [returning-user browser](../../e2e/auth-rehydration.spec.ts), [connection-error browser](../../e2e/auth-connection-error.spec.ts), [session-expiry browser](../../e2e/auth-session-expiry.spec.ts), [persistent-outage browser](../../e2e/auth-persistent-outage.spec.ts), [demo/navigation browser](../../e2e/demo-navigation.spec.ts), [transaction creation browser](../../e2e/transaction-create.spec.ts), [transaction management browser](../../e2e/transaction-manage.spec.ts), [transaction read browser](../../e2e/transaction-read.spec.ts), [ledger math and selectors](../../src/lib/__tests__/ledger.test.ts), [transaction input logic](../../src/lib/__tests__/transactionInput.test.ts), [transaction mutation logic](../../src/lib/__tests__/transactionMutations.test.ts), and [schema tests](../../src/schema). The [case documents](README.md#planned-test-cases) are plans, not evidence. “Next automated check” gives the main missing layer; it does not exclude smaller unit tests needed to make a browser scenario reliable. The demo fixture seeds accounts and initial transactions through store actions; transaction creation browser tests use the form for the action under test.

Known defects should get tests that describe the intended behavior once fixed: [#76](https://github.com/MakersCircle/moniq/issues/76) date format is saved but not applied, [#77](https://github.com/MakersCircle/moniq/issues/77) duplicate sync rows, [#95](https://github.com/MakersCircle/moniq/issues/95) backup migration safety, and [#96](https://github.com/MakersCircle/moniq/issues/96) cross-tab migration lock.

## 1. Enter and leave the application

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | A signed-out visitor sees the landing page and can open the Google sign-in flow. | Covered | Auth browser: CTA invokes fake Google token client, six viewports | — | Yes |
| AUTH-02 | Successful Google sign-in opens the dashboard and provisions or reconnects to the user's Drive folder and spreadsheet. | Covered | Auth browser: Drive/Sheets provisioning and reload reconnect without duplicate files, six viewports | — | Yes |
| AUTH-03 | A mobile redirect login consumes the returned access token and opens the dashboard. | Covered | Auth browser: redirect fragment, cloud initialization, cleared hash, five touch viewports | — | Yes |
| AUTH-04 | Returning users see the workspace after identity verification and initial Sheets reconciliation unless the device is explicitly trusted. | Covered | Returning-user browser: dashboard stays gated during a delayed initial pull; local edits during pull and a remote-only account are present after reconciliation; persistent-outage browser covers retry recovery | Multi-tab reconciliation | Yes |
| AUTH-05 | Expired Google access preserves local recording and trusted-device reload; reconnect uploads queued changes. | Covered | Session-expiry browser: real expense form while disconnected, queued changes survive reload and upload on reconnect; reconnect keeps local records visible during a held cloud pull and preserves a cached profile photo when Google omits it; valid token expires without background authorization; explicit sign-out survives reload; 320px banner geometry checks a single row with a visible action. Google client unit tests cover expiry and HTTP 401 | Real iOS/Android installed-PWA OAuth acceptance | Yes |
| AUTH-06 | A cloud initialization failure shows a connection error with Retry Connection and Sign Out actions. | Covered | Connection-error browser: one-time Sheets outage, gated error, retry recovery, sign-out and reload, six viewports | — | Yes |
| AUTH-07 | A different Google account cannot replace or sync this device’s records during reconnect. | Covered | Session-expiry browser: wrong account preserves records, owner email and pending queue; original account reconnect uploads changes; Google client unit test blocks unverified tokens at the API boundary | Real Google account chooser acceptance | Yes |
| AUTH-08 | Signing out syncs pending changes first; a sync failure offers Cancel and Sign Out Anyway. | Missing | — | Fake Google browser + unit/integration | Yes |
| AUTH-09 | Signed-out access to an app route returns to the landing page; signed-in access to `/` opens the dashboard. | Missing | — | Fake Google browser + unit/integration | No |
| AUTH-10 | Google sign-in requests access to files this app creates and to the user's basic profile and email. | Covered | Auth browser: Google token client scopes, six viewports | — | Yes |
| AUTH-11 | Session-scoped Google credentials remove legacy durable tokens. | Covered | accessTokenStorage unit tests; auth-token-storage browser verifies reload, IndexedDB cleanup and a fresh tab without credentials | Browser session restoration policy varies by browser | Yes |
| AUTH-12 | Shared-device verification and explicit trusted-device local access. | Covered | auth-workspace-lock browser: delayed/failed verification hides records, missing local transaction stays hidden through the delayed initial Sheets pull then appears, retry recovers, wrong-account unlock cannot grant trust, correct-account trust permits local access without a token, Settings revocation locks next launch; desktop and phone | Real installed-PWA and multi-user device acceptance | Yes |

## 2. Use demo mode

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| DEMO-01 | Try Demo opens the app without Google authentication and stores entered data locally. | Covered | Transaction creation browser: form save and reload in demo mode, six viewports | — | No |
| DEMO-02 | Demo data and the demo session survive a page reload. | Covered | Demo/navigation browser reload + IndexedDB | — | No |
| DEMO-03 | The demo banner identifies local-only data and can be dismissed for the current view. | Missing | — | Component + browser | No |
| DEMO-04 | Sign In to Sync can keep demo entries and upload them to the signed-in user's Drive data. | Missing | — | Fake Google browser + component | Yes |
| DEMO-05 | Sign In to Sync can discard demo entries and start with an empty ledger. | Missing | — | Fake Google browser + component | Yes |
| DEMO-06 | The conversion dialog can be canceled to stay in demo mode, from the banner or Settings. | Missing | — | Component + browser | No |

## 3. Navigate and read public content

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| NAV-01 | The main navigation opens Dashboard, Ledger, Insights, Budget, and Settings. | Covered | Demo/navigation browser, six viewports | — | No |
| NAV-02 | Settings navigation opens Accounts, Payment Methods, Categories, and Recently Deleted; on mobile, the selected section tab stays centered when space allows and clamps at the ends. | Covered | Demo/navigation browser checks all Settings routes; phone check verifies the Categories tab centers, Recently Deleted clamps to the end, and General returns to the start | — | No |
| NAV-03 | Desktop navigation uses a sidebar; mobile navigation uses a bottom bar and a new-transaction button. | Covered | Demo/navigation browser, six viewports; iPhone profile simulates a 30px safe-area inset and checks the nav/action boundary and matching content clearance | Real installed iOS PWA acceptance | No |
| NAV-04 | The mobile top bar opens Settings and expands its search field when focused; entered text can be cleared with an inline clear control. | Covered | `e2e/ledger-amount-filter.spec.ts` checks typed Top Bar search text and the inline clear control on desktop and phone. | — | No |
| NAV-05 | A visitor can open Docs, Privacy Policy, and Terms of Service without signing in. | Partial | Home browser footer links | Browser page content | No |
| NAV-06 | Docs navigation opens Getting Started, Keyboard Shortcuts, FAQ, Handling Scenarios, Architecture, and Changelog; internal document links stay in app navigation. | Missing | — | Browser | No |
| NAV-07 | An unknown docs page shows its not-found state and a route back to Getting Started. | Missing | — | Browser | No |
| NAV-08 | An unexpected render failure shows the recovery screen with Reload Application and Clear Local Data actions. | Missing | — | Browser | No |
| NAV-09 | The public landing page exposes its canonical and social-sharing metadata to the browser. | Missing | — | Browser | No |
| NAV-10 | Pressing `/` outside a text field focuses the top-bar search input. | Missing | — | Browser | No |
| NAV-11 | Mobile app pages scroll within their intended content area without an extra document scroll or blank space, including when a banner is visible, and full-height surfaces follow dynamic viewport changes. | Partial | Demo/navigation browser: short pages across app and Settings routes have no extra document/main scroll; populated Dashboard and Settings content scroll, Ledger remains below banner on phone viewport, and the app shell follows an overridden height token and phone viewport resizing | Physical phone check with browser chrome expanded/collapsed | No |

## 4. Record transactions

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| TXN-01 | New Transaction opens from desktop header, mobile action button, or global keyboard shortcut. | Partial | Demo/navigation browser desktop + mobile buttons | Browser keyboard shortcuts | No |
| TXN-02 | Create an expense with amount, date, payment method, category, and optional note; account and category balances update. | Covered | Transaction creation browser: form, ledger, reload, account balance, category spending, six viewports | — | No |
| TXN-03 | Create an income with a payment method and category; the linked account and dashboard totals update. | Covered | Transaction creation browser: form, ledger, account balance, income total, six viewports | — | No |
| TXN-04 | Transfer between payment methods linked to different accounts; both account balances update without counting the transfer as income or expense. | Covered | Transaction creation browser: form, ledger, both balances, unchanged totals, six viewports | — | No |
| TXN-05 | The transfer destination list excludes methods linked to the selected source account. | Missing | — | Component + browser | No |
| TXN-06 | Split one expense across multiple categories; the total must be fully allocated before saving and each split appears as a transaction. | Covered | Transaction creation browser: disabled until allocated, two ledger rows, balance, six viewports | — | No |
| TXN-07 | The Save action stays unavailable until required fields contain a valid positive amount, date, method, and category or transfer destination. | Partial | Transaction input logic: required fields | Component + browser disabled/enabled state | No |
| TXN-08 | The amount input rejects negative and nonnumeric symbols and displays locale-aware thousands separators as the user types. | Missing | — | Component + browser | No |
| TXN-09 | The form shows the expected account balance for the selected method and entered amount. | Partial | Transaction input logic: edit/duplicate preview and amount impact | Component + browser display | No |
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
| TXN-20 | On phone and tablet widths, the primary transaction amount remains 48 px, text fields stay at least 16 px, and payment method/category/subcategory controls and options have 44 px touch targets. | Covered | `e2e/transaction-create.spec.ts` verifies amount/text sizing and 44 px selectors/options in the phone profile. | Physical iOS Safari focus/scale acceptance | No |

## 5. Review and manage the ledger

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| LEDGER-01 | With no transactions, the Ledger shows an empty state. | Missing | — | Component + browser | No |
| LEDGER-02 | The Ledger shows the filtered transaction count and lists transactions newest date first, grouped by date, with type-specific amount styling. Date groups appear in batches. | Partial | `e2e/ledger-date-filter.spec.ts` verifies the transaction count and complete date order across multiple batches on desktop and iPhone portrait. | Amount styling assertion | No |
| LEDGER-03 | Search and type filters sit in the Ledger toolbar beside Export PDF and filter transactions; date, multi-select account, category, and amount range filters can be combined and cleared. The Date column filter supports multiple individual dates, Sunday-to-Saturday weeks, months, years, and an inclusive custom date range. Custom ranges preview from the fixed endpoint to the hovered date, can be completed in one calendar, and accept either date order. Week mode highlights the full row on hover. | Covered | `e2e/ledger-date-filter.spec.ts` checks transaction dots, multi-select and deselection for dates, multiple weeks/months/years, full-row hover on desktop, date + search + type + account composition and clearing, custom range selection in one calendar, hover and persistent range highlighting, and descending date endpoints on desktop and phone. `e2e/ledger-amount-filter.spec.ts` checks search and type controls share the toolbar with Export PDF. | — | No |
| LEDGER-04 | A filter with no matches shows an empty-results message inside the Ledger table while its column headings remain visible. | Covered | `e2e/ledger-date-filter.spec.ts` selects a date without transactions and verifies the empty-results message and Ledger headings on desktop and phone. | — | No |
| LEDGER-05 | Export a PDF using radio-selected date range and report type, an independent account dropdown, and custom date calendars shown only for a custom range; choose both endpoints in one calendar session without an invalid-range alert while incomplete, preview on hover, and accept either endpoint order. Use the same dark blurred backdrop as the mobile Filters sheet. | Covered | `ledgerReport.test.ts` checks filtering, ascending order, category/transfer grouping, totals, and opening/closing balances; `src/lib/__tests__/dateRange.test.ts` checks normalization of reversed endpoints; `e2e/ledger-export.spec.ts` checks the shared blurred backdrop, radio controls, conditional custom dates, no premature alert, one-session range preview and reverse endpoint selection, independent account filtering, both report types, and valid PDF downloads on desktop and phone. | — | No |
| LEDGER-06 | Selecting a row opens its details with date, amount, source account, category or destination account, and note. | Partial | LedgerEngine selectors; transaction read browser income account | Browser other details/types | No |
| LEDGER-07 | Edit from the detail panel changes a transaction in place and updates the ledger and balances. | Covered | Mutation unit tests; transaction management browser: edit, reload, category and balance, six viewports | — | No |
| LEDGER-08 | Delete from the detail panel removes the transaction from active views and places it in Recently Deleted. | Covered | Mutation unit tests; transaction management browser: delete, reload, balance and Trash, six viewports | — | No |
| LEDGER-09 | Show dates and transactions within each date newest first; allow manual reordering within one date using only the six-dot handle, keep mobile scrolling within that date group, and persist the chosen order after drop. | Covered | `e2e/ledger-reorder.spec.ts` checks descending date and same-day order, handle-only interaction, reordering persistence after reload, other-day stability, and phone scroll bounds. | — | No |
| LEDGER-10 | On mobile, category and account appear beneath the description and details open as a bottom drawer. | Missing | — | Component + browser | No |
| LEDGER-11 | Filter Ledger rows using expandable category checkboxes; selecting a category includes all its subcategories, individual subcategories can be selected, search focuses on desktop without summoning the mobile keyboard, and multiple matching entries still show one transaction row. | Covered | `e2e/ledger-category-filter.spec.ts` checks category selection, parent indeterminate state, select all/clear, desktop search focus, absence of category-group headings, and a multi-category transaction appearing once. | — | No |
| LEDGER-12 | Filter Ledger rows using a searchable, flat account checkbox list with multiple account selection and no expand controls; show an active dot on the column filter icon and clear it when the filter is cleared. | Covered | `e2e/ledger-account-filter.spec.ts` checks desktop search focus, multiple account selection, matching transaction rows, active header dot and its removal on clear, and no-results search. | — | No |
| LEDGER-13 | Filter Ledger rows to an inclusive minimum and maximum transaction amount using a dual-ended slider or precise Min/Max fields; retain the global slider scale while constraining handles to the range left by other filters. | Covered | `e2e/ledger-amount-filter.spec.ts` checks global scale and placeholders, contextual handle positions and limits, slider keyboard changes, synchronized precise fields, inclusive filtering, combination with description search, and clearing. | — | No |
| LEDGER-14 | Keep compact search, filter, and export touch targets with aligned icons on mobile; expand and clear search without obscuring the title. Type selections combine with OR and other filter groups combine with AND. Selecting all or no types leaves all transactions visible. The mobile filter menu opens with Type expanded and uses a single-open accordion, a blurred animated backdrop, and an active-filter indicator. | Covered | `e2e/ledger-amount-filter.spec.ts` checks toolbar geometry and search behavior, desktop type selection and OR behavior, all and no type selections showing all transactions, and the mobile filter trigger, backdrop, and search exclusion behavior. | — | No |
| LEDGER-15 | Ledger popovers, selects, and menus flip or shift away from viewport edges and keep tall content scrollable within the available space. | Partial | Shared Radix wrappers apply 8 px collision padding and available-height sizing; the Ledger type filter no longer disables collision avoidance. | Browser placement checks for top, bottom, left, and right edges, including short landscape viewport | No |
| LEDGER-16 | Open the mobile Filters bottom sheet with an upward slide and blurred backdrop; show one Type, Account, or Category accordion at a time; fit short lists to content, cap and scroll long lists, show search for larger lists, combine selections, indicate active filters, and clear all filters from the sheet. | Covered | `e2e/ledger-account-filter.spec.ts` verifies the bottom sheet slides in, shares a blurred backdrop with Export, opens Type by default, checks concise accordion labels, switches sections, applies combined filters, tracks active section indicators, and clears all filters to restore unfiltered rows. | — | No |
| LEDGER-17 | Keep the sticky Ledger column header aligned with the scrollable rows while hiding its unnecessary hover scrollbar. | Covered | `e2e/ledger-amount-filter.spec.ts` verifies the sticky header keeps a stable scrollbar gutter with hidden overflow and that the transaction list remains vertically scrollable across the configured viewports. | — | No |
| LEDGER-18 | On phones, keep Ledger scrolling vertical and prevent the table frame from horizontally panning or overflowing the page. | Covered | `e2e/ledger-reorder.spec.ts` checks phone touch-action, clipped horizontal overflow, the vertical row scroller, and document width. | — | No |
| LEDGER-19 | Keep phone Ledger rows visually separate after scrolling and list updates, even when row content heights differ. | Covered | `e2e/ledger-reorder.spec.ts` checks row spacing at the top and bottom of the scroll area and after a same-date transaction update. | — | No |

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
| METHOD-03 | Reorder active payment methods using only the six-dot handle and see that order in transaction selectors. | Partial | `e2e/method-reorder.spec.ts` checks handle-only interaction, deferred save, and persistence after reload. | Transaction selector ordering | No |
| METHOD-04 | Archive, reactivate, and delete a payment method; blocked deletion gives a reason. | Missing | — | Component + browser | No |
| CATEGORY-01 | Create a category in Income, Needs, Wants, Invest, Lend, or Borrow with a head and optional subhead. | Missing | — | Component + browser | No |
| CATEGORY-02 | Search existing heads while entering a category, or type a new head. | Missing | — | Component + browser | No |
| CATEGORY-03 | Missing head and duplicate head/subhead combinations are rejected. | Missing | — | Component + browser | No |
| CATEGORY-04 | Invest, Lend, and Borrow categories accept an opening balance and show their running balance. | Missing | — | Component + browser | No |
| CATEGORY-05 | Edit a category's group, head, subhead, or applicable opening balance. | Missing | — | Component + browser | No |
| CATEGORY-06 | Reorder categories within a group using only the six-dot handle, keep dragging and mobile scrolling within that group, and see the saved order in transaction selectors and budget views. | Partial | `e2e/category-reorder.spec.ts` checks handle-only drag, group bounds, phone scroll bounds, stable row actions during drag, deferred save, IndexedDB/reload persistence, other-group stability, and keyboard movement. | Browser: selector and Budget ordering | No |
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
| INSIGHT-02 | Spending in the selected date range appears as a compact vertical EvilCharts stacked bar chart. It shows as many category bars as fit, angles labels when needed without automatically skipping any, aligns single segment and stacked bars to zero with gaps only between visible segments, rounds every segment, uses distinct subcategory colors, and combines overflow categories in Other. Hover or touch reveals category and subcategory amounts. | Covered | `src/lib/__tests__/insightsData.test.ts` checks inclusive expense/category aggregation, subcategory sums, excluded transfers/deleted records, width capacity, Other detail preservation, segment colors, and segment values that sum to each bar total; `e2e/insights-category-spending.spec.ts` checks the exact card heading, responsive chart, and subcategory tooltip on desktop and iPhone portrait and samples rendered pixels at the zero line for a single segment bar and a stacked bar. | — | No |
| INSIGHT-03 | A rolling 12-month Income vs Expenses area chart shows both series, including quiet months, independent of the page date filter. It sits beside Savings and Investments on wide screens and stacks on phones; there is no separate Expense Trend chart. | Covered | `src/lib/__tests__/insightsData.test.ts` checks 12 chronological buckets, quiet months, and exclusion of transfers/deleted/out-of-range records; `e2e/insights-category-spending.spec.ts` checks the 12-month series, legend, all four rows on desktop, and the complete stacked order on iPhone portrait. | — | No |
| INSIGHT-04 | The Insights title and date selector stay visible while the charts scroll. The date selector defaults to the current month, dismisses on preset selection or after both custom endpoints, accepts endpoints in either order, previews the range on hover without an invalid-range alert while incomplete, and updates date-filtered Sankey, category, and trend charts; the annual heatmap has an independent year selector. The Sankey info button explains transfer and balance methodology. The Sankey shows category hierarchies without placeholder subcategory nodes, excludes transfers, labels the income/expense difference, keeps endpoint labels within chart bounds, hides overlapping labels, collapses subcategories to fit all Sankey stages on phone-width screens, and uses more vertical space. Smaller-flow labels and currency values remain available on hover or tap. Spending pace and contribution cards keep their own comparison windows, explained in info buttons. | Partial | `src/lib/__tests__/insightsSankey.test.ts` covers Sankey transaction filtering, balance, and mobile-stage collapse; `src/lib/__tests__/dateRange.test.ts` covers reversed endpoint normalization; `e2e/insights-date-range.spec.ts` checks that the Insights chart and Ledger page requests start in the background, and that the Insights title and date selector are usable before the chart module loads and after scrolling on desktop and iPhone portrait, and stay horizontally aligned when the charts appear, and covers custom range preview, either endpoint order, no premature alert, and dismissal after selection. Heatmap aggregation and year selection are covered separately by `src/lib/__tests__/insightsData.test.ts` and `e2e/insights-heatmap.spec.ts`. | Component + browser checks for Sankey info popover, responsive layout, and hover/tap tooltips | No |
| INSIGHT-05 | Spending pace compares daily cumulative expenses this month with the same days last month and the average of the previous three complete months; the current-month line ends today and short months align to their final day. The compact header omits a subtitle; its info button explains the time window and comparison, with green for last month and gray for the average. | Covered | `src/lib/__tests__/insightsWidgets.test.ts` covers daily cumulative comparisons, excluded transfers/deleted/future activity, three-month averaging, and short-month alignment; `e2e/insights-widgets.spec.ts` checks the series labels and colors, current total, empty state, info-button content, and absence of subtitle rows on desktop and phone. | — | No |
| INSIGHT-06 | A savings and investment balance chart defaults to the latest 12 months and has 12M and All controls beside the title. Three lines show Savings, Investments, and Total. Opening balances and prior ledger activity seed each series for the visible period; the Y-axis starts at the lowest of those opening balances (or lower if a later balance falls below it). All starts at the earliest eligible opening balance or transaction. An info button explains the time window and clarifies that balances do not represent investment returns or market value. Empty-state copy reflects the selected range. | Covered | `src/lib/__tests__/insightsWidgets.test.ts` covers opening balances from multiple savings accounts and Invest categories, prior activity seeding each 12M opening balance, internal transfers, savings outflows, split expenses, deleted and future records, cumulative balances, zero-filled months, and all-time start/end boundaries; `e2e/insights-widgets.spec.ts` checks range controls, the lowest opening balance as the Y-axis minimum in both ranges, older activity in All, selected-range info and empty states, totals, and absent subtitle on desktop and phone. | — | No |
| INSIGHT-07 | A year-at-a-glance cashflow calendar shows months across columns of weeks and weekdays down rows, with a year selector independent of the page date range. Daily net cashflow shades cells red-to-green; hover, focus, or tap reveals income and spent totals. Transfers and deleted transactions are excluded; on phones the grid scrolls internally, initially positions today in view, and does not overflow the page. | Covered | `src/lib/__tests__/insightsData.test.ts` covers daily sums, net values, transfer/deleted/other-year exclusion, neutral days, year boundaries, leap years, and annual week alignment; `e2e/insights-heatmap.spec.ts` checks annual labels, year selection, red/green states, hover/focus/tap totals, today visibility, and phone overflow containment. | — | No |

## 8. Restore deleted data

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| TRASH-01 | Recently Deleted separates transactions, accounts, methods, and categories into tabs with counts and empty states; phone layouts keep tabs, records, and restore actions usable without horizontal page overflow. | Partial | `e2e/demo-navigation.spec.ts` checks all four sections and restore controls at 360 px | Desktop restore behavior and empty states | No |
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
| SETTINGS-04 | Settings displays the signed-in profile, cloud sync state, last sync time, and any sync error; on mobile, profile details and Sign Out remain visible without overlap. | Partial | `e2e/settings-persistence.spec.ts` verifies the signed-in name/email and Sign Out bounds do not overlap in phone portrait and landscape profiles. | Cloud status/profile detail checks and physical device verification | Yes |
| SETTINGS-05 | Pending-change count and tooltip identify unsynced local items. | Missing | — | Fake Google browser + component | Yes |
| SETTINGS-06 | Reset Data requires the exact confirmation phrase before deleting local and cloud data and returning to the landing page. | Missing | — | Fake Google browser + component | Yes |
| SETTINGS-07 | A failed reset shows an error and keeps the app available for another attempt. | Missing | — | Fake Google browser + component | Yes |
| SETTINGS-08 | Regional defaults and preferences persist across reload and device locale changes. | Covered | userSettings unit tests and settings-persistence browser: demo, pending preferences, canonical cloud defaults, desktop and phone | Real multi-device acceptance | Yes |

## 10. Sync and recover data

| ID | Feature | Status | Existing automated evidence | Next automated check | Live Google? |
| --- | --- | --- | --- | --- | --- |
| SYNC-01 | Local changes are usable immediately and later appear in the user's Google spreadsheet. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-02 | Changes made offline remain queued and sync after connectivity returns, including after a reload. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-03 | Sync Now pushes pending changes or pulls remote changes when nothing is pending. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-04 | A second device reconnects to the existing Drive spreadsheet and receives the same data. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-05 | A direct edit to a spreadsheet row is reflected back in the app on synchronization. | Missing | — | Fake Google browser + unit/integration | Yes |
| SYNC-06 | Concurrent local and remote changes reconcile without duplicating rows. | Partial | Returning-user browser #92: edit/delete/create during upload survive commit, flush and reload without duplicates | Cross-tab and true remote conflict cases | Yes |
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

Tracked: **122 features**; **7 partial**, **93 missing**, **22 covered end to end**. Recalculate these totals when adding tests.

Regional preference persistence (#108): `userSettings.test.ts` and `settings-persistence.spec.ts` cover demo reload, pending changes, canonical defaults, and locale-dependent date order. Applying the date format throughout the UI remains separate issue #76.
