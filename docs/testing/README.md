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
