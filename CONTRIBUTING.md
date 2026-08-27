# Contributing to moniq

First off, thank you for considering contributing to `moniq`! We want this project to be welcoming and accessible.

## Project Architecture
`moniq` is a privacy-first, backend-less application built with React, TypeScript, and Vite. We do not use a centralized database. Instead, user data is persisted locally in **IndexedDB** and synced securely to the user's own Google Drive (via the Google Sheets API) using a client-side delta-sync engine.

Please read our [Product Vision](docs/product_vision.md) before proposing structural changes, and the [Design System](docs/design_system.md) before proposing visual/UX changes.

## Development Setup
1. Fork and clone the repository.
2. Run `npm install`
3. Copy `.env.example` to `.env` and add your Google OAuth Client ID.
4. Run `npm run dev` to start the local development server.

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

## Pull Request Process
1. Ensure your code strictly adheres to the [Design System](docs/design_system.md).
2. Create a clean branch (`feat/your-feature` or `fix/issue-description`).
3. Run `npm run build` locally to verify there are absolutely no TypeScript compilation errors.
4. Open a Pull Request referencing the GitHub Issue you are fixing or the feature you are adding.
5. Log your change under `[Unreleased]` in [CHANGELOG.md](docs/CHANGELOG.md) and use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `perf:`, `style:`).
