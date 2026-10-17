# Contributing to moniq

First off, thank you for considering contributing to `moniq`! We want this project to be welcoming and accessible.

## Project Architecture
`moniq` is a privacy-first, backend-less application built with React, TypeScript, and Vite. We do not use a centralized database. Instead, user data is persisted locally in **IndexedDB** and synced securely to the user's own Google Drive (via the Google Sheets API) using a client-side delta-sync engine.

Please read our [Product Vision](docs/product_vision.md) before proposing structural changes, and the [Design System](docs/design_system.md) before proposing visual/UX changes.

## Development Setup

1. Fork and clone the repository.
2. Run `npm install`.
3. Create a Google OAuth Client ID (see below) and add it to `.env`.
4. Run `npm run dev` to start the local development server.

### Google OAuth Client ID

moniq needs its own OAuth Client ID to talk to Google Drive/Sheets on your behalf:

1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a project (or reuse one) and enable the **Google Sheets API** and **Google Drive API**.
3. Under **Credentials**, create an **OAuth 2.0 Web Application** Client ID.
4. Set **Authorized JavaScript origins** to `http://localhost:5173` (or wherever you're running/deploying it).
5. Copy the Client ID, then:
   ```bash
   cp .env.example .env
   ```
   and set `VITE_GOOGLE_CLIENT_ID=your-client-id` in `.env`.

## Coding Standards

### Tooling

- **Formatting**: Prettier (`.prettierrc`) — run via `npm run format`.
- **Linting**: ESLint, enforced on pre-commit via Husky + lint-staged.
- **Docs**: TypeDoc generates API reference docs from code comments into `src/docs/api/`.

### Component & Code Structure

- **Functional components**: `export default function ComponentName()`.
- **Props**: Defined via TypeScript interfaces.
- **Hooks**: Extract logic into custom hooks once it exceeds ~10 lines.
- **State**: `dataStore.ts` is composed of domain slices (`src/store/slices/*`); use selectors in `useDataStore` to avoid unnecessary re-renders.
- **File naming**: PascalCase for components (`AddTransactionModal.tsx`), camelCase for hooks/utils (`useDataStore.ts`, `format.ts`).
- **Error handling**: Use the global `ErrorBoundary` for crashes and `sonner` toasts for user-facing errors. No `console.log` in production code.

### Clean Code Principles

- **DRY**: Don't duplicate serialization or validation logic.
- **SRP**: Each file should have one clear responsibility.
- **Naming**: Prefer descriptive names (`isUserAuthenticated` over `isAuth`).

## Issues & Feature Requests
Planned work, bugs, and feature ideas are tracked as [GitHub Issues](../../issues). Check open issues before starting work to avoid duplicate effort, and open a new issue to propose a feature or report a bug before sending a large PR.

## Development Workflow

1. Ensure your code strictly adheres to the [Design System](docs/design_system.md).
2. Create a clean branch (`feat/your-feature` or `fix/issue-description`).
3. Before adding a user-visible feature or modifying an existing one, review the [E2E feature inventory](docs/testing/e2e-feature-inventory.md), its row in the [feature-to-test matrix](docs/testing/feature-coverage.md), and the relevant cases in the [testing docs](docs/testing/README.md). Add or update planned cases for the behavior being changed.
4. Add tests at the layer that best checks the behavior: keep business rules in testable pure functions or hooks where practical, cover component interactions with component tests, and use Playwright for important user journeys. Check responsive features at desktop and mobile sizes; the browser suite defines six viewport profiles.
5. Run focused tests while developing.
6. In the same change, update the E2E feature inventory, feature-to-test matrix with test evidence and status, relevant testing case documents, and `[Unreleased]` in [CHANGELOG.md](docs/CHANGELOG.md). Mark a feature covered only when its stated behavior is checked by an implemented test.
7. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `style:`).

## Pull Request Process

1. Run the full test suites and production build. If a test cannot run locally, state why in the PR.
2. Open a Pull Request against `develop`, reference the GitHub Issue you are fixing or feature you are adding, and summarize the change and test results.

### Test Commands

Run a focused unit or browser test while developing:

```bash
npm run test -- src/lib/__tests__/transactionMutations.test.ts
npm run test:e2e -- e2e/auth-session-expiry.spec.ts --project=iphone-portrait
```

Before opening a PR, run all unit and browser tests, then build the app:

```bash
npm run test:all
npm run build
```

Playwright runs the configured Chromium viewport profiles by default. If its bundled browser is unavailable, see the [testing setup](docs/testing/README.md) for using an installed Chrome or Chromium binary.
