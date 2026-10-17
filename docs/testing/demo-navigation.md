# Demo entry and app navigation

Implemented browser checks live in [`e2e/demo-navigation.spec.ts`](../../e2e/demo-navigation.spec.ts). They run at all six configured Playwright viewport profiles. [`e2e/fixtures/demo.ts`](../../e2e/fixtures/demo.ts) enters demo mode through the landing page and optionally seeds a checking account, two categories, and two transactions through store actions. The seed waits for IndexedDB to contain the transactions before a test reloads.

| Feature ID | Automated check | Limit |
| --- | --- | --- |
| DEMO-01 | Try Demo opens the Dashboard without Google. | Seeded records bypass the account and transaction forms; local entry through the UI remains untested. |
| DEMO-02 | Seeded demo records and demo mode survive reload. | Checks persistence and visible account/activity, not form submission. |
| NAV-01 | Sidebar/bottom-bar links load Dashboard, Ledger, Insights, and Budget; desktop/sidebar or mobile/top-bar link opens Settings. | Google-authenticated routing remains for a later test. |
| NAV-02 | Settings links load Accounts, Payment Methods, Categories, and Recently Deleted with their page headings. | CRUD behavior remains for later tests. |
| NAV-03 | Sidebar/bottom-bar geometry, mobile top-bar Settings, new-transaction action, and app shell width are checked at desktop, tablet, phone, and foldable sizes. | Other pages need their own responsive checks when their flows are tested. |
| NAV-11 | On the portrait phone viewport, short Dashboard, Ledger, Insights, Budget, and Settings pages have no extra document or main scroll while the demo banner is visible. A populated Dashboard remains scrollable, Ledger starts below the banner, and long Settings content scrolls in its own area. | Headless Chromium does not simulate expanding and collapsing mobile browser chrome; check that behavior on a physical phone. |
| NAV-04 | Mobile Settings link is exercised. | Search focus and expansion remain untested. |
| TXN-01 | Desktop header and mobile action button open the transaction form. | Keyboard entry shortcuts remain untested. |

Next cases in this area: create a record through the UI and reload it; dismiss the demo banner; cancel, keep, and discard demo conversion; verify `/` search focus and compact mobile search behavior.
