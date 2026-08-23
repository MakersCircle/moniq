# Home Page Test Coverage

This document details the 52 test cases covering `src/pages/Home.tsx` and its extracted authentication hook `src/hooks/useHomeAuth.ts`.

## 1. Unit Tests (`useHomeAuth.test.ts`)
Focuses purely on the business logic of authentication, token parsing, and navigation, separated from the UI. 

| ID | Scenario | Expected Outcome |
|---|---|---|
| U-01 | Valid token + expires_in in hash | Sets token in store with expiry, navigates to `/dashboard`, clears URL hash |
| U-02 | Valid token, missing expires_in | Sets token, defaults expiry to 1 hour, navigates |
| U-03 | expires_in is 0 | Defaults expiry to 1 hour |
| U-04 | expires_in is NaN string | Defaults expiry to 1 hour |
| U-05 | Empty access_token in hash | Ignores hash, no navigation |
| U-06 | Hash without access_token key | Ignores hash, no navigation |
| U-07 | No URL hash at all | Component mounts without side effects |
| U-09 | Login success callback (valid response) | Sets token, navigates to `/dashboard` |
| U-10 | Login success callback (missing expires_in)| Sets token, defaults expiry to 1 hour |
| U-12 | Login failure callback (`onError`) | Logs error to console |
| U-13 | Store already has accessToken | Hook returns `isLoggedIn: true` |
| U-14 | Store has no accessToken | Hook returns `isLoggedIn: false` |

## 2. Component Tests (`Home.test.tsx`)
Focuses on rendering the correct static elements and reacting to mocked authentication states. Uses `@testing-library/react`.

| ID | Scenario | Expected Outcome |
|---|---|---|
| C-01 | Headline rendering | "Seamless personal finance tracking..." is visible |
| C-02 | Paragraph rendering | "Your data is yours..." is visible |
| C-03 | Logo image rendering | Image with alt "moniq logo" is present |
| C-04 | Footer links rendering | "Docs", "Privacy Policy", "Terms of Service" are present |
| C-05 | Footer link elements | Footer links are proper anchor `<a>` tags |
| C-06 | Footer href paths | Hrefs match exact paths (`/docs`, etc.) |
| C-07 | CTA button (unauthenticated) | Displays "Sign in with Google" |
| C-08 | CTA button (authenticated) | Displays "Go to Dashboard" |
| C-09 | CTA click (unauthenticated) | Triggers `login()` function |
| C-10 | CTA click (authenticated) | Handled by hook (mocked out in UI tests) |
| C-11 | CTA button disabled state | Button is active (`cursor-pointer`), not disabled |
| C-12 | Logo accessibility | Logo has descriptive alt text |

## 3. End-to-End Tests (`home.spec.ts`)
Focuses on cross-browser responsive layout, dynamic CSS, and network interception. Runs across 6 Playwright viewports (mobile to desktop).

### Layout & Visibility (All devices)
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-01 | Wordmark glyphs visible | SVG wrappers render in the DOM |
| E-02 | Q-logo image visible | Logo image renders in the DOM |
| E-03 | Headline visible | Text is visible and unclipped |
| E-04 | Paragraph visible | Text is visible and unclipped |
| E-05 | Footer links visible | All 3 footer links are visible |
| E-06 | No horizontal overflow | `document.body.scrollWidth <= window.innerWidth` |
| E-07 | No vertical overflow (portrait) | `document.body.scrollHeight <= window.innerHeight` (no scrollbars) |

### CTA Button (Touch devices)
*Run on: iPhone (portrait/landscape), iPad (portrait/landscape)*
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-08 | Label visibility without interaction | "Sign in with Google" text is fully expanded (grid-cols-[1fr]) |
| E-09 | Button click | Intercepts request to `accounts.google.com` (OAuth initiated) |

### CTA Button (Desktop pointer devices)
*Run on: MacBook Pro (desktop)*
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-10 | Label visibility by default | Label is hidden (grid-cols-[0fr]) |
| E-11 | Hover interaction | Label expands to become visible on hover |
| E-12 | Arrow rotation | Arrow icon rotates `-45deg` on hover (manual visual check or computed style) |

### Responsive Layout
| ID | Target Device | Scenario | Expected Outcome |
|---|---|---|---|
| E-13 | Phones/Tablets (Portrait) | Stacked Layout | Wordmark's Y-coordinate is below the CTA block |
| E-14 | Phone (Landscape) | Side-by-side Layout | Wordmark's X-coordinate is left of the CTA block |
| E-17 | Phone (Portrait, narrow) | Text right margin | Headline text right edge does not touch viewport edge (`<= 100vw - 20px`) |
| E-18 | Phone (Portrait) | Footer alignment | Footer links cluster on the left side of viewport |
| E-19 | Desktop / Tablet | Footer alignment | Footer links cluster on the right side of viewport |
| E-20 | Phone (Landscape) | Footer alignment | Footer is pinned to bottom-right |
| E-21 | Phone (Landscape) | Footer overlap | Footer bounding box does not intersect wordmark bounding box |

### Navigation
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-22 | Click "Docs" | URL changes to `/docs` |
| E-23 | Click "Privacy Policy" | URL changes to `/privacy-policy` |
| E-24 | Click "Terms of Service" | URL changes to `/terms-of-service` |
