# Testing Strategy

This project uses a 3-layer testing strategy to ensure reliability across logic, UI components, and end-to-end user flows.

## 1. Unit Tests

**Framework:** Vitest + JS-DOM  
**Location:** `src/**/__tests__/*.test.ts`

Unit tests focus on isolated business logic (e.g. custom hooks, utility functions, data store interactions).

- **How to run:** `npm run test` (runs both unit and component tests)
- **Watch mode:** `npm run test:watch`

## 2. Component Tests

**Framework:** Vitest + React Testing Library  
**Location:** `src/**/__tests__/*.test.tsx`

Component tests verify that React components render correctly given specific props or mocked hook states. They do NOT test network requests or full routing flows.

- **How to run:** `npm run test`

## 3. End-to-End (E2E) Tests

**Framework:** Playwright  
**Location:** `e2e/*.spec.ts`

E2E tests run against a live dev server in real browser engines (Chromium, WebKit, Firefox). They verify cross-device responsive layouts, complex interactions (hover/touch), and navigation. Network calls to third-party services (like Google OAuth) are intercepted at the network level using `page.route()`.

- **How to run:** `npm run test:e2e`
- **View report:** `npx playwright show-report`

## Continuous Integration (CI)

In CI environments, run all test layers:

```bash
npm run test:all
```

## Coverage Specs by Feature

Each doc below is a test-planning spec (test case tables, not test code) for one feature area, in the same format as this README's 3-layer split. Implemented tests should be checked against these specs; specs should be updated when behavior changes.

| Doc | Covers | Actual test files |
| --- | --- | --- |
| [home.md](home.md) | Landing page, Google sign-in, auth hook | `useHomeAuth.test.ts`, `Home.test.tsx`, `home.spec.ts` |
| [schema.md](schema.md) | Entity (de)serialization, IndexedDB/Sheets schema migrations, multi-tab coordination | `src/schema/**/__tests__/*.test.ts` |
| [transactions.md](transactions.md) | Add/edit/duplicate transaction modal, DatePicker, ledger page, double-entry generation | Not yet implemented |
| [accounts-categories.md](accounts-categories.md) | Accounts, Payment Methods, Categories — CRUD, delete guards, reordering | Not yet implemented |
| [dashboard-budget-insights.md](dashboard-budget-insights.md) | Dashboard stat cards, Budget allocation/editing, Insights charts | Not yet implemented |
| [sync-settings.md](sync-settings.md) | SyncEngine, ConflictResolver, BackupManager, Trash restore guards, Settings | Not yet implemented |

The four "Not yet implemented" docs are specs only — writing the actual `.test.ts`/`.test.tsx`/`.spec.ts` files against them is tracked separately.

## Known Gaps — Not Yet Speced

A few smaller feature areas have no coverage doc yet: Demo Mode (entry, keep-data vs. discard-and-restart conversion, exit dialog, reload persistence), the Legal pages and Docs/MDX viewer, i18n (`useTranslation`), PWA install/offline behavior, and `ErrorBoundary` crash-recovery. These were left out deliberately rather than missed — see **Strategy** below.

## Strategy: Implement First, Then Fill Gaps

Rather than speccing every remaining feature up front, the plan is:

1. Implement tests against what's already speced above (`home.md`, `schema.md`, and the four newer docs) — this is substantial real coverage already.
2. Run coverage tooling (`vitest --coverage`) once those land, to see what's actually exercised vs. just documented.
3. Use real coverage gaps — plus anything the known gaps above turn out to matter for — to decide what needs a new spec doc, driven by evidence from writing real tests rather than speculation about edge cases no one has hit yet.

Writing specs for untouched features before any implementation work starts risks guessing at edge cases without the feedback loop of a real test run.
