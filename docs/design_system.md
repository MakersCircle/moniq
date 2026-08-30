# Moniq Design System

This is the source of truth for moniq's visual language and UI conventions, reverse-documented from what's actually implemented (`src/styles/global.css`, `src/components/ui/`, `components.json`). Where the product hasn't defined something yet, that's marked **Not yet defined** rather than guessed at — fill it in when the decision is made, don't invent it here.

---

## 1. Foundations

### 1.1 Principles

- **Dark mode only.** One deep, near-black theme. No light theme exists yet.
- **Solid over glass.** Cards, dialogs, and sheets use flat `bg-background` / `bg-card` fills with a thin border — not translucent or blurred panels.
- **Numbers are load-bearing.** Every monetary figure renders in a tabular monospace face so amounts align in lists and are scannable at a glance.
- **Native command center, not a marketing dashboard.** Density and directness over decorative chrome.

### 1.2 Color

Semantic tokens, defined as Tailwind v4 `@theme` variables in `src/styles/global.css`, following the shadcn/ui naming convention.

**Surface & text**

| Token | Value | Use |
| --- | --- | --- |
| `--color-background` | `#09090b` | App background |
| `--color-card` | `#09090b` | Card surfaces |
| `--color-popover` | `#09090b` | Popovers, dropdowns |
| `--color-foreground` | `#fafafa` | Primary text, on background |
| `--color-card-foreground` | `#fafafa` | Primary text, on card |
| `--color-muted` | `#27272a` | Muted/inactive surfaces |
| `--color-muted-foreground` | `#a1a1aa` | Secondary/muted text |
| `--color-border` | `#27272a` | Default borders |
| `--color-input` | `#27272a` | Input outlines |

**Action & state**

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#863bff` | Primary buttons, active states, focus ring |
| `--color-secondary` | `#27272a` | Secondary buttons/surfaces |
| `--color-accent` | `#27272a` | Hover accents |
| `--color-destructive` | `#ef4444` | Destructive actions, error states |
| `--color-ring` | `#863bff` | Focus ring (same as primary) |

**Financial semantics**

| Token | Value | Use |
| --- | --- | --- |
| `--color-income` | `#22c55e` | Income amounts, positive deltas |
| `--color-expense` | `#f43f5e` | Expense amounts, negative deltas |
| Transfer / neutral | **Not yet defined** | No dedicated token — transfers currently render in neutral text color |

`index.html`'s `theme-color` meta tag and the PWA manifest are pinned to `#09090b` so browser chrome and the install splash screen match the app background.

Toasts (`sonner`) derive their tint from the semantic tokens above via `color-mix()` — see `[data-sonner-toast]` rules in `global.css` — rather than using separate toast-specific colors.

### 1.3 Typography

| Role | Family | Notes |
| --- | --- | --- |
| UI / body | `Inter` | Loaded via Google Fonts, applied globally on `body` |
| Numeric / amounts | `JetBrains Mono` | `.mono` utility class, `font-variant-numeric: tabular-nums` |
| Brand wordmark | `Radlush` | Self-hosted (`src/assets/fonts/Radlush.ttf`), `.font-brand` utility, logo/wordmark only |

Type scale (sizes, weights, line-heights for H1/H2/body/labels): **Not yet defined** — the codebase uses ad hoc Tailwind text utilities per component rather than a documented scale.

### 1.4 Spacing & Layout

No custom spacing scale — components use Tailwind's default spacing scale directly (e.g. `p-6`, `space-y-1.5`, `gap-2`).

Radii:

| Token | Value |
| --- | --- |
| `--radius-lg` | `0.75rem` |
| `--radius-xl` | `1rem` |

Grid / max-width conventions for page layouts: **Not yet defined**.

### 1.5 Breakpoints

| Name | Width | Source |
| --- | --- | --- |
| Mobile | `< 640px` | `MOBILE_BREAKPOINT` in `src/hooks/useIsMobile.ts`, matches Tailwind's `sm:` |
| Desktop | `>= 640px` | implicit (everything not mobile) |

Only one breakpoint is used in application logic today; Tailwind's full `sm`/`md`/`lg`/`xl` scale is available but no tablet-specific layout exists.

### 1.6 Iconography

[Lucide](https://lucide.dev) (`lucide-react`), per `components.json` (`iconLibrary: lucide`). No custom icon set. Default stroke width and sizing follow Lucide's defaults unless a component overrides `size`/`className`.

### 1.7 Elevation

No shadow/elevation token scale — components use Tailwind's default `shadow`/`shadow-sm`/`shadow-2xl` utilities directly per-component (e.g. cards use `shadow`, dialogs use `shadow-2xl`). A formal elevation system: **Not yet defined**.

---

## 2. Components

Built on [shadcn/ui](https://ui.shadcn.com) (`style: default`, base color `slate`) over [Radix UI](https://www.radix-ui.com) primitives, in `src/components/ui/`. Variants are composed with `cva` (class-variance-authority) and merged via the `cn()` helper (`src/lib/utils.ts`).

### 2.1 Buttons (`button.tsx`)

- **Variants**: `default` (solid primary), `destructive`, `outline`, `secondary`, `ghost`, `link`.
- **Sizes**: `sm`, `default`, `lg`, `icon`, `icon-xs`.

### 2.2 Cards (`card.tsx`)

`rounded-xl border bg-card` shell with `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` composition.

### 2.3 Dialogs & Sheets (`dialog.tsx`, `sheet.tsx`)

Centered modal on desktop; slide-in-from-bottom entrance animation; solid `bg-background` with `shadow-2xl`.

### 2.4 Responsive Modal (`responsive-modal.tsx`)

The canonical pattern for any modal: renders as a centered dialog on desktop and a bottom sheet on mobile (`rounded-t-2xl`, capped at `calc(100dvh - 3rem)`). Use this instead of hand-rolling separate desktop/mobile modal variants.

### 2.5 Inputs (`input.tsx`)

Transparent background, no visible border until focused; focus ring inherits `--color-ring` (primary).

### 2.6 Other primitives

`select`, `dropdown-menu`, `popover`, `tabs`, `calendar`, `checkbox`, `avatar`, `label`, `field`, `info-tooltip`.

### 2.7 Brand components

`Grainient` (animated WebGL gradient background, built with `ogl`), `LogoParts` (wordmark), `BetaTag`, `dot-pattern`, `shiny-button`.

### 2.8 Component states

Hover / focus / active / disabled treatment per component type (beyond what's implicit in each component's Tailwind classes): **Not yet defined** as a cross-component standard.

---

## 3. Patterns

### 3.1 Navigation

- **Desktop**: left sidebar (`Sidebar.tsx`).
- **Mobile**: bottom tab bar + floating action button (FAB) for new transactions (`TopBar.tsx`).

### 3.2 Modals & Sheets

Always use `ResponsiveModal` (§2.4) so behavior is consistent across breakpoints.

### 3.3 Touch Targets

Interactive elements in the TopBar and nav are sized for comfortable mobile tapping (enlarged in the v0.9.x mobile pass). A minimum touch-target size standard: **Not yet defined**.

### 3.4 Search

Collapsible/expandable search field on the mobile TopBar, rather than a permanently docked search bar.

### 3.5 Notifications

`sonner` toasts (`components/ui/sonner.tsx`) are the standard channel for user-facing feedback — sync status, errors, confirmations. Never use blocking `alert()` or silent `console.error`.

### 3.6 Motion

- Radix-driven open/close transitions on dialogs/sheets/popovers use `tailwindcss-animate` `data-[state=open|closed]` utilities — fade + slight zoom + slide-from-bottom, roughly 300ms, ease-out cubic-bezier.
- Hover/interaction transitions are short, plain CSS transitions (`transition-colors`), not spring physics.
- `framer-motion`'s `Reorder` powers drag-to-reorder lists (Categories and Payment Methods in Settings).
- The landing page background (`Grainient`) animates via WebGL (`ogl`), not CSS keyframes.

A documented motion scale (durations/easings as tokens, rather than per-component values): **Not yet defined**.

### 3.7 Empty, Loading & Error States

Standard patterns for empty states, skeleton/loading states, and inline error states: **Not yet defined** as a cross-app standard — currently handled per-page/per-component.

---

## 4. Content & Voice

Tone of voice, terminology glossary (e.g. preferred terms for "Account" vs "Wallet"), and microcopy guidelines: **Not yet defined**.

---

## 5. Accessibility

Contrast ratios, focus-visibility standards, keyboard-navigation guarantees, and screen-reader conventions beyond what Radix UI provides by default: **Not yet defined**. (Radix primitives give baseline ARIA/keyboard support for dialogs, dropdowns, tabs, etc. — this section should state moniq-specific requirements on top of that baseline once decided.)

---

## 6. Known Cleanup

`global.css` still contains a `.driver-popover` theme block for `driver.js` (the onboarding tour library). The onboarding/tour flow was removed in v0.9.0 (see [CHANGELOG](CHANGELOG.md)) and `driver.js` is no longer used in `src/` — this CSS block is dead and should be deleted along with the dependency.
