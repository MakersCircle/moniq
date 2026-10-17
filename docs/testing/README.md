# Testing coverage

The [feature inventory](e2e-feature-inventory.md) is the list of user-visible behaviors to protect. The [feature-to-test matrix](feature-coverage.md) records actual automated evidence for **every inventory ID**, the next test layer, and where a live Google check is useful. A case in a planning document is not an implemented test.

## Current test setup

| Layer | Implemented files | What currently runs |
| --- | --- | --- |
| Unit and integration | `src/lib/__tests__/ledger.test.ts`, `src/lib/__tests__/transactionInput.test.ts`, `src/lib/__tests__/transactionMutations.test.ts`, `src/lib/__tests__/authSession.test.ts`, `src/hooks/__tests__/useHomeAuth.test.ts`, `src/schema/**/__tests__/*.test.ts` | Ledger entries and balances, transaction input and mutation rules, OAuth token parsing/expiry and landing-page authentication hook, entity serialization, schema migration runners, and migration message shapes. These do not exercise a complete signed-in browser session. |
| Component | `src/pages/__tests__/Home.test.tsx` | Landing-page rendering and CTA behavior. |
| Browser | `e2e/home.spec.ts`, `e2e/auth-flow.spec.ts`, `e2e/auth-rehydration.spec.ts`, `e2e/auth-connection-error.spec.ts`, `e2e/auth-session-expiry.spec.ts`, `e2e/auth-persistent-outage.spec.ts`, `e2e/demo-navigation.spec.ts`, `e2e/transaction-create.spec.ts`, `e2e/transaction-manage.spec.ts`, `e2e/transaction-read.spec.ts` | Landing layout, fake Google sign-in and redirect initialization, returning-user local hydration and remote reconciliation before dashboard entry, failed and persistent cloud initialization errors with retry and sign-out, expired-session reconnect and reload, demo persistence, app/settings navigation, desktop/mobile shell, expense/income/transfer/split saves, transaction edit/delete, and income ledger/detail account agreement at six viewport/touch profiles. `e2e/fixtures/google.ts` simulates Google OAuth, Drive, and Sheets; `e2e/fixtures/demo.ts` supplies empty and seeded demo pages. All projects currently use Chromium; WebKit and Firefox are not configured. A live Google login still needs separate acceptance coverage. |

Run Vitest with `npm run test` and Playwright with `npm run test:e2e`. `npm run test:all` runs both locally. The current GitHub Actions workflow runs `npm run build` only; it does not run either test suite. The workflow configures Node 22 while `package.json` requires Node 24 or newer, so the CI runtime needs correction when tests become a required gate.

If Playwright's bundled Chromium is unavailable locally, use an installed Chrome/Chromium binary with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e`.

## Planned test cases

The following documents describe test cases to implement. Their case IDs and expected results are plans unless linked to an existing test in the matrix.

| Area | Planning document |
| --- | --- |
| Landing and authentication | [home.md](home.md) |
| Demo entry and navigation | [demo-navigation.md](demo-navigation.md) |
| Schema and migration | [schema.md](schema.md) |
| Transactions and ledger | [transactions.md](transactions.md) |
| Accounts, methods, and categories | [accounts-categories.md](accounts-categories.md) |
| Dashboard, Budget, and Insights | [dashboard-budget-insights.md](dashboard-budget-insights.md) |
| Sync, backups, Trash, and Settings | [sync-settings.md](sync-settings.md) |

The inventory also includes unfinished demo conversion and banner behavior, public Docs and legal pages, error recovery, and PWA behavior. These need test cases when their test work begins. Browser tests should cover desktop and mobile layouts explicitly. A deterministic fake Google API can exercise sync and backup flows in CI; a separate live-account smoke check should verify the real OAuth/Drive/Sheets contract.

When a feature or test changes, update the inventory, matrix evidence/status, and the relevant case document in the same change.
