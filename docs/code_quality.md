# Code Quality & Standards

This document defines the coding standards and tool requirements for the Moniq project.

## 1. Tooling Requirements

### 1.1 Formatting (Prettier)
All code must be formatted with Prettier. 
**Installation:** `npm install --save-dev prettier eslint-config-prettier`
**Configuration:** Add `.prettierrc` to the root.

### 1.2 Git Hooks (Husky)
Use Husky to prevent bad commits.
**Installation:** `npx husky-init && npm install`
**Hook:** Run `npm run lint` and `npm run format` on `pre-commit`.

### 1.3 Documentation (TypeDoc)
Use TypeDoc to generate technical documentation from code comments.
**Installation:** `npm install --save-dev typedoc`
**Usage:** `npx typedoc src/main.tsx`

## 2. Coding Standards

### 2.1 Component Structure
- **Functional Components**: Use `export default function ComponentName()`.
- **Props**: Define props using TypeScript interfaces.
- **Hooks**: Keep logic in custom hooks if it exceeds 10 lines.

### 2.2 State Management
- **Domain Slices**: Split `dataStore.ts` into smaller slices (e.g., `createTransactionSlice`).
- **Selectors**: Use selectors in `useDataStore` to prevent unnecessary re-renders.

### 2.3 File Naming
- **Components**: PascalCase (e.g., `AddTransactionModal.tsx`).
- **Hooks/Utils**: camelCase (e.g., `useDataStore.ts`, `dateUtils.ts`).
- **Styles**: `ComponentName.module.css` if using CSS modules.

### 2.4 Error Handling
- Use the global `ErrorBoundary` for major crashes.
- Use `toast` notifications (from Sonner or similar) for user-facing errors.
- Never use `console.log` in production code; use a dedicated logger if needed.

## 3. Clean Code Principles
- **DRY**: Do not repeat serialization or validation logic.
- **SRP**: Each file should have one clear responsibility.
- **Naming**: Variables should be descriptive (e.g., `isUserAuthenticated` vs `isAuth`).

---
**Version**: 0.4.0 (Target)
