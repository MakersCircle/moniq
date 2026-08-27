# Issue Backlog

Draft GitHub issues distilled from the deleted `docs/bugs.md`, `docs/todo.md`, and `docs/roadmap.md` — cross-checked against the current codebase so only genuinely open items remain (several claimed-open items turned out to already be fixed, e.g. schema versioning, mobile/PWA, and the budgeting module, and were dropped). Each item below is copy-pasteable as a GitHub issue: title in the first code block, body in the second. Delete this file once all items are filed.

---

## 1. Category form is missing the "Initial Balance" input for Invest/Lend/Borrow groups

```
Category form is missing the "Initial Balance" input for Invest/Lend/Borrow groups
```

```markdown
**Type:** Bug
**Area:** Categories / Ledger

### Problem
`Category.initialBalance` exists end-to-end in the data layer and is even consumed by balance math, but there is no UI to ever set it — so it's permanently `undefined` for every category a user creates through the app.

### Evidence
- `src/types.ts:81` — `Category.initialBalance?: number;` ("Opening balance for tracking external items like Investments or Loans")
- `src/schema/entities/category.schema.ts:5-17` — `CATEGORY_COLUMNS` includes `'Initial Balance'` as a real sheet column, and `serializeCategory`/`deserializeCategory` (lines 42-56, 60-74) read/write it.
- `src/lib/ledger.ts:29-30` — balance computation reads `category?.initialBalance` when computing a running balance, so the field has real behavioral effect once set — but nothing sets it.
- `src/components/Forms/CategoryForm.tsx:19-24` — `CategoryFormData` only has `group`, `head`, `subHead`, `isActive`. No `initialBalance` field or input anywhere in the component.
- `src/components/Transactions/CreateCategorySheet.tsx:16-22` and `src/pages/Settings/Categories.tsx` (`handleSave`, ~line 49) both call `addCategory({...})`/`updateCategory({...})` without ever passing `initialBalance`.
- Contrast: `src/components/Forms/AccountForm.tsx:26,53-54,72,80,243-245` already has this exact pattern implemented for Accounts — use it as the template.

### Fix
1. Add `initialBalance: string` to `CategoryFormData` in `src/components/Forms/CategoryForm.tsx`.
2. Add a numeric `Input`, shown only when `form.group` is `'Invest'`, `'Lend'`, or `'Borrow'` — mirror `AccountForm.tsx:240-246`.
3. On submit, parse with `parseFloat` (fallback `0`, same as `AccountForm.tsx:72-80`) and include `initialBalance` in the object passed to `onSave`.
4. Update both call sites to forward the new field:
   - `src/components/Transactions/CreateCategorySheet.tsx:16-22`
   - `src/pages/Settings/Categories.tsx` (`handleSave`, both create and edit paths)
5. Verify `addCategory`/`updateCategory` in the data store actually forward `initialBalance` through to `putMany('categories', ...)` and the sync queue — not yet confirmed, check as part of this fix.
6. Add/extend a test asserting the field round-trips from form input through to `serializeCategory`.

**Suitable for:** an AI coding agent — scope is fully bounded, and `AccountForm.tsx` is a working reference implementation of the exact same pattern.
```

---

## 2. `dateFormat` setting is stored but never actually used to render dates

```
`dateFormat` setting is stored but never actually used to render dates
```

```markdown
**Type:** Bug
**Area:** Settings / Formatting

### Problem
Settings → Regional Preferences lets a user pick a date format (`dateFormat`), and the value is correctly persisted and synced — but no date-rendering code path in the app actually reads it. Every date is hardcoded to `en-IN` locale or a fixed `dd/MM/yyyy` pattern regardless of what the user selected.

### Evidence
- Setting works and persists fine:
  - `src/pages/Settings/index.tsx:706-728` — `Select` bound to `settings.dateFormat`, options `['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']`.
  - `src/store/slices/syncSlice.ts:94,255` — synced correctly.
  - `src/store/slices/settingsSlice.ts:15` — sensible locale-based default.
  - `src/types.ts:182` — `dateFormat: string` on `UserSettings`.
- But nothing reads it:
  - `src/utils/format.ts:30-33` (`formatDate`), `:35-38` (`formatDateShort`), `:40-43` (`formatMonth`) — all hardcode `d.toLocaleDateString('en-IN', {...})`, take only the ISO string, no settings param.
  - `src/components/TxnRow.tsx:85` — calls `formatDateShort(txn.date)` with no settings.
  - `src/components/Transactions/DatePicker.tsx:26,42,74,79,112-114,124` — the transaction-entry date picker independently hardcodes `'dd/MM/yyyy'` for both display and parsing (via `date-fns`), plus a hardcoded `"DD/MM/YYYY"` placeholder at line 149 — completely disconnected from the setting and from `format.ts`.
- A repo-wide grep for `dateFormat` returns exactly 5 hits, all in settings storage/UI plumbing — zero in any date-rendering utility or in `DatePicker.tsx`.

### Fix
1. `src/utils/format.ts`: change `formatDate`, `formatDateShort`, `formatMonth` to accept a `dateFormat` (or full `settings`) argument and use `date-fns`'s `format(parseISO(iso), dateFormat)` instead of `toLocaleDateString('en-IN', ...)` — this also aligns them with `DatePicker.tsx`, which already uses `date-fns`.
2. Update every call site to pass the setting through, including `TxnRow.tsx:85` and `format.ts`'s internal `groupByDate` (~line 126) which calls `formatDate` itself. Do a full search for `formatDate(`/`formatDateShort(`/`formatMonth(` call sites — not exhaustively enumerated during investigation.
3. `src/components/Transactions/DatePicker.tsx`: drive the display format (lines 26, 42, 74, 79, 112, 114, 124) and placeholder (line 149) from `settings.dateFormat`, and reorder the parse-candidate arrays (lines 55-69, 92-106) to try the user's chosen format first.
4. Add a regression test: changing `settings.dateFormat` should change the rendered output of `formatDate`/`formatDateShort` and the `DatePicker` display value.

**Suitable for:** an AI coding agent — mechanical plumbing change with clear before/after behavior to test against.
```

---

## 3. Concurrent syncs from two open tabs can create duplicate rows in the Google Sheet

```
Concurrent syncs from two open tabs can create duplicate rows in the Google Sheet
```

```markdown
**Type:** Bug
**Area:** Sync Engine

### Problem
Each browser tab runs its own `SyncEngine` instance with its own in-memory `rowIndexes` map. If a user has the app open in two tabs and creates a new entity (e.g. a transaction) in each around the same time, both tabs can independently decide "this entity ID isn't in the sheet yet" and both call `appendRows` — producing two rows for the same entity ID in the underlying spreadsheet. Note: this is distinct from schema-migration multi-tab coordination, which already exists and works correctly (see `migrationChannel.ts`) — this bug is specific to the ordinary data-flush/append path.

### Evidence
- `src/sync/SyncEngine.ts:85` — `rowIndexes` is a plain in-memory instance field, not shared across tabs.
- `src/sync/SyncEngine.ts:93` — `pendingAppendIds` is likewise per-instance/per-tab only.
- `src/sync/SyncEngine.ts:620-689` (`flushEntityOps`) — looks up `rowIndex.get(op.entityId)`; if not found, appends via `appendRows` (line 681). Two tabs racing on the same new entity ID will both take this branch.
- `rebuildRowIndexForStore()` (lines 696-707) only re-reads the sheet when the ID is already in `pendingAppendIds` — i.e. it guards a tab's own retried append, not a genuinely concurrent create from another tab.
- `flush()` (lines 568-618) only guards re-entrancy within the same tab via local `_status` checks — no cross-tab mutex.
- Confirmed via repo-wide grep: the Web Locks API (`navigator.locks`) is not used anywhere in `src/`. The only `BroadcastChannel` in the codebase is `src/schema/runner/migrationChannel.ts`, scoped purely to migration start/done signaling — it carries no per-row information and provides no locking for the append path.
- `src/schema/__tests__/multiTabCoordination.test.ts` only covers migration broadcast messages, not flush/append duplication.

### Fix
1. Wrap the append-decision-and-append critical section in `flushEntityOps()` (`SyncEngine.ts:620-689`, specifically from the `rowIndex.get(op.entityId)` check at line 661 through the `appendRows` call and index update at lines 676-688) in a cross-tab mutex via the Web Locks API: `navigator.locks.request('moniq-sync-flush', async () => {...})`.
2. As a fallback for browsers without Web Locks support, extend `rebuildRowIndexForStore()` to run unconditionally before treating any entity as "new" (not only when it's in `pendingAppendIds`), so a fresh read of the live sheet happens immediately before every append of a genuinely new row.
3. Optional defense in depth: a periodic or pre-append duplicate-ID scan against the target sheet, since every row's ID lives in column A.
4. Add an integration test that simulates two `SyncEngine` instances both calling `markDirty` + `flush` for the same new entity ID against a mocked `SheetClient`, asserting `appendRows` fires exactly once for that ID.

**Suitable for:** a human or a strong AI agent — correctness-sensitive concurrency fix; the Web Locks approach is well-scoped but should get careful review/testing given it touches the sync integrity path.
```

---

## 4. Dead `driver.js` onboarding-tour CSS still in `global.css`

```
Remove dead driver.js onboarding-tour CSS from global.css
```

```markdown
**Type:** Chore / Cleanup
**Area:** Styling

### Problem
The onboarding/tour wizard (built with `driver.js`) was removed from the app in v0.9.0 (see `docs/CHANGELOG.md`), but the theming CSS for it was never cleaned up.

### Evidence
- `src/styles/global.css` lines ~167-252 — a full `.driver-popover` / `.driver-popover-title` / `.driver-popover-*-btn` theme block.
- `driver.js` is confirmed unused anywhere in `src/` (no imports, no `Driver(...)` usage) — this CSS targets classes that are never rendered.

### Fix
1. Delete the `/* ── Driver.js Tour Theme ─────────────────────────────────────── */` block and all `.driver-popover*` rules from `src/styles/global.css`.
2. Remove the `driver.js` dependency from `package.json` if it's still listed and unused elsewhere.

**Suitable for:** an AI coding agent — trivial, low-risk deletion.
```

---

## 5. Custom Dashboards — user-defined charts/filters beyond the built-in Insights page

```
Add Custom Dashboards: user-defined charts and filters
```

```markdown
**Type:** Feature
**Area:** Analytics

### Problem
The current Insights page (`src/pages/Insights.tsx`) has a fixed set of charts (category donut, 6-month trend, income vs. expense). There's no way for a user to build their own view — e.g. a custom date range, a specific account/category filter combination, or a saved custom chart layout.

### Scope (needs product design before implementation)
- Let users choose chart type, dimensions (category/account/time), and filters (date range, specific accounts/categories) for one or more custom chart widgets.
- Decide whether custom dashboards are a new page, or an extension of the existing Insights page.
- Persist the user's custom dashboard configuration (likely as a new entity synced like everything else, given the app's local-first + Google Sheets sync architecture — see `src/sync/SyncEngine.ts` for the pattern to follow for a new entity type).

**Suitable for:** requires product/design decisions first; not a bounded task to hand to an agent as-is. Break into smaller issues once the UX is decided.
```

---

## 6. SEO — structured data and performance polish beyond what's already shipped

```
SEO: add structured data and audit performance budget
```

```markdown
**Type:** Enhancement
**Area:** Growth / SEO

### Problem
Open Graph/Twitter meta tags and canonical links are already shipped (`index.html`), but structured data (e.g. JSON-LD for `SoftwareApplication`) and a performance budget audit (Lighthouse/PageSpeed) haven't been done.

### Fix
1. Add JSON-LD structured data to `index.html` (e.g. `SoftwareApplication` or `WebApplication` schema) describing moniq for search engines.
2. Run a Lighthouse/PageSpeed audit against the production build and address any flagged performance regressions (bundle size, unused JS, image sizing for `OGImage.png`, etc.).

**Suitable for:** an AI coding agent for the structured-data markup; the performance audit needs a human to interpret Lighthouse results and prioritize fixes.
```

---

## 7. Sustainable monetization model that preserves the free, non-data-collecting tier

```
Explore a monetization model compatible with the privacy-first philosophy
```

```markdown
**Type:** Discussion
**Area:** Product

### Problem
moniq has no monetization strategy yet. The product's core philosophy (see `docs/product_vision.md`) is privacy-first and non-data-collecting, which rules out ad-based or data-resale models. Needs a strategy that's compatible with that constraint — e.g. an optional paid tier (AI-powered analytics, advanced reports) layered on top of a fully-functional free tier.

### Notes
- `docs/roadmap.md` previously floated "Intelligent Auto-Categorization" as a possible premium/AI entry point — worth reconsidering as one option among several.
- This is a product/business decision, not an engineering task — file as a discussion issue, not something to hand to a coding agent.

**Suitable for:** the project owner — needs a decision before any implementation work is scoped.
```

---

## 8. Verify split-transaction behavior when a shared expense is reimbursed by others

```
Verify: split transaction shows only "my share" in category totals when reimbursed by others
```

```markdown
**Type:** Test case / Verification
**Area:** Transactions / Ledger

### Problem
Needs verification (carried over from manual test notes, never confirmed against the current double-entry ledger implementation): if a user pays for a shared expense (e.g. a team lunch) and gets reimbursed by others, does the "Food" category total reflect only their own final share, or the full amount they initially paid?

### How to verify
1. Create an expense transaction split across categories (e.g. total lunch bill).
2. Record the reimbursement — likely as an income or account-transfer transaction depending on how lending/reimbursement is modeled today (see `Lend/Borrow` account handling in `src/lib/ledger.ts` and `docs/product_vision.md` §3.4).
3. Check whether `useCategorySpend` (`src/hooks/useComputed.ts`) reflects only the user's net share after reimbursement, or the gross amount paid.
4. If it shows the gross amount, decide and document the correct expected behavior, then fix `useCategorySpend`'s aggregation logic accordingly.

**Suitable for:** an AI agent, but needs a human to confirm the *intended* behavior first (this is a product-behavior question, not just a bug) — recommend resolving the expected-behavior question in the issue thread before implementation.
```

---

## 9. Formalize the missing design system foundations (type scale, spacing, elevation, motion, component states)

```
Formalize design system foundations: type scale, spacing, elevation, motion tokens, component states
```

```markdown
**Type:** Chore / Design System
**Area:** Design System / `docs/design_system.md`

### Problem
`docs/design_system.md` documents the color, font-family, and component-inventory layer of the design system, but explicitly marks several foundational layers as **Not yet defined**: type scale, spacing scale, elevation/shadow system, motion/duration tokens, and cross-component interaction states (hover/focus/active/disabled). Without these, every new component reinvents sizing/timing/elevation decisions from scratch, and inconsistencies (documented below) go unnoticed because there's nothing to check against.

The good news: a codebase audit shows most of these **already exist as consistent, ad hoc conventions** — they just aren't named, tokenized, or written down. This issue proposes formalizing what's already there (mostly a documentation + token-extraction exercise) and fixing the handful of real inconsistencies the audit surfaced.

### 1. Type Scale
A clean de facto scale already exists across pages — it just needs to be named as tokens/a shared component:

| Role | Classes in use | Example locations |
| --- | --- | --- |
| Page H1 | `text-2xl font-bold tracking-tight` | `src/pages/Dashboard.tsx:76`, `Insights.tsx:60`, `Budget.tsx:60` |
| Empty-state H2 | `text-2xl lg:text-3xl font-bold tracking-tight mb-3` | Identical string in `Dashboard.tsx:59`, `Insights.tsx:49`, `Budget.tsx:47` |
| Settings section H2 | `text-xl font-bold tracking-tight` | `Settings/index.tsx:190`, `Accounts.tsx:61`, `Categories.tsx:86`, `Methods.tsx:85`, `Trash.tsx:137` |
| Dialog title | `text-lg font-semibold` | `src/components/ui/dialog.tsx:73` (a distinct convention from page headings — worth keeping distinct or reconciling deliberately) |
| Stat-card value | `text-2xl font-bold mono tracking-tight mb-1` | `Dashboard.tsx:315`, `Budget.tsx:215` |
| Stat-card eyebrow label | `text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3` | `Dashboard.tsx:310` — **note: `text-[10px]` is an arbitrary value outside Tailwind's scale entirely** |
| Body / field label | `text-sm` (89 uses), `text-xs text-muted-foreground font-medium` (repeated verbatim across `Accounts.tsx:64`, `Categories.tsx:89`, `Methods.tsx:88`, `Trash.tsx:145`, `index.tsx:191`) | |
| Small bold data cell | `text-xs font-bold` | Repeated 8+ times in `Settings/index.tsx`, plus `Accounts.tsx`, `Methods.tsx`, `Categories.tsx`, `Trash.tsx` |

**Action:** Extract these into named tokens or shared typography components (e.g. `<PageHeading>`, `<SectionHeading>`, `<StatValue>`, `<Eyebrow>`), and either round `text-[10px]` up to Tailwind's `text-xs` (12px) or add it to the scale deliberately if 10px is truly intended.

### 2. Spacing Scale
Already consistent in practice — concentrated on Tailwind's 1/2/3/4/6 steps (4/8/12/16/24px), matching what the doc already states. `src/components/ui/card.tsx:18,44,51` standardizes internal padding at `p-6` for `CardHeader`/`CardContent`/`CardFooter` — the single most reusable convention to name as a token (e.g. `--card-padding: 24px`). No wild scattering was found; the gap here is naming/documentation, not actual inconsistency.

**Action:** Document the scale (4/8/12/16/24/32px) as the sanctioned steps, and name the card-padding convention explicitly.

### 3. Elevation / Shadow System
A real 4-tier system already exists in practice, just unnamed:

| Tier | Shadow class | Components |
| --- | --- | --- |
| 1 (resting) | `shadow` / `shadow-sm` | Card (`card.tsx:9`), Button variants (`button.tsx:13-17`), Input (`input.tsx:13`), SelectTrigger (`select.tsx:20`), TabsTrigger (`tabs.tsx:30`) |
| 2 (floating) | `shadow-md` | DropdownMenuContent (`dropdown-menu.tsx:66`), SelectContent (`select.tsx:69`), PopoverContent (`popover.tsx:22`), InfoTooltip (`info-tooltip.tsx:25`) |
| 3 (attention) | `shadow-lg` | Alert (`alert.tsx:15`), DropdownMenuSubContent (`dropdown-menu.tsx:49`), Toast (`sonner.tsx:25`) |
| 4 (modal) | `shadow-2xl` | Dialog (`dialog.tsx:39`), ResponsiveModal (`responsive-modal.tsx:53,83`), Sheet (`sheet.tsx:34`) |

**Action:** Name these tiers (e.g. `elevation-1` through `elevation-4`) in `docs/design_system.md` §1.7 and apply them consistently to any new component instead of picking a shadow class ad hoc.

### 4. Motion / Duration Tokens
Four durations and one custom easing curve are already in consistent ad hoc use:

| Proposed token | Value | Current usage |
| --- | --- | --- |
| `--duration-fast` | 150ms (Tailwind default, implicit) | Bare `transition`/`transition-colors` with no explicit duration — 30+ call sites (`button.tsx:9`, `input.tsx:13`, `dropdown-menu.tsx:84,100,123`, `Sidebar.tsx`, `TopBar.tsx`, etc.); also explicit in `global.css:209,219` |
| `--duration-base` | 200ms | Popover/dropdown/select overlay animations — `select.tsx:69`, `popover.tsx:22`, `dropdown-menu.tsx:49,66` |
| `--duration-moderate` | 300ms | Modal/sheet/panel entrances — `dialog.tsx:39`, `sheet.tsx:34`, `shiny-button.tsx:41`, `TransactionDetailPanel.tsx:56`, `AddTransactionModal.tsx:691,784`, `TopBar.tsx:45`, `SessionExpiredBanner.tsx:23` |
| `--duration-slow` | 500ms | Sheet backdrop, `global.css:77,121` |
| `--ease-emphasized` | `cubic-bezier(0.16,1,0.3,1)` | All Radix `animate-in`/`animate-out` states — `select.tsx:69`, `dropdown-menu.tsx:49,66`, `dialog.tsx:39` — currently inlined as an arbitrary value at every call site |

**Action:** Define these five values as CSS custom properties in `global.css`'s `@theme` block and replace the inlined arbitrary values (especially the repeated `ease-[cubic-bezier(0.16,1,0.3,1)]`) with the token.

### 5. Component Interaction States
This is where the audit found **real inconsistencies**, not just missing documentation:

- **Disabled state uses two different mechanisms**: native `disabled:opacity-50` (Button, Input, SelectTrigger, Checkbox) vs. Radix `data-[disabled]:opacity-50` (SelectItem, DropdownMenu items). Both are individually correct for their context (native `disabled` attribute vs. Radix's virtual/keyboard-navigable items), but should be documented as the two sanctioned patterns rather than left implicit.
- **Focus ring is inconsistent**: `focus-visible:ring-1` with no offset (Button, Input, Select) vs. `focus-visible:ring-2 ring-offset-2` (Checkbox `checkbox.tsx:14`, Dialog close button `dialog.tsx:45`). This is a genuine visual inconsistency, not just an undocumented variation — pick one and apply it uniformly.
- **No component defines an explicit `active:` (pressed) state anywhere** in Button, Input, Select, Checkbox, or Dropdown — pressed/tap feedback is entirely absent, relying on browser defaults. Worth deciding whether this is intentional (relying on `hover:` + transition being "enough") or a real gap, especially for touch/mobile where there is no hover state at all.
- **"Hover" on menu/select items is implemented via `focus:` classes** (`select.tsx:112`, `dropdown-menu.tsx:84,100,123`), relying on Radix's roving-focus behavior, while Button and Dialog-close use real `hover:` classes. Two different mechanisms achieve a similar visual effect — worth documenting as the intended pattern (focus-as-hover for keyboard-navigable list items) rather than leaving it looking like an oversight.

**Action:** Document the two sanctioned disabled-state patterns and when to use each; standardize the focus ring to one treatment (ring width + offset) across all interactive components; decide and document whether an explicit `active:`/pressed state is needed (recommend adding one, especially given the mobile-first FAB/bottom-nav UI); document focus-as-hover as the intended pattern for Radix list items.

### Suggested approach
1. Add §1.3 (Typography), §1.4 (Spacing), §1.7 (Elevation), and a new Motion subsection to `docs/design_system.md` with the tables above, replacing the current "Not yet defined" placeholders.
2. Extract the repeated literal class strings (page H1, empty-state H2, stat-card value/eyebrow, field label) into either Tailwind `@theme` tokens or small shared components — whichever fits the codebase's existing patterns better (check how much appetite there is for a `<Typography>`-style component vs. just documenting the class combinations).
3. Fix the two real inconsistencies (focus ring width/offset, missing `active:` states) as a follow-up code change once the standard is agreed.

**Suitable for:** an AI coding agent for steps 1–2 (mechanical extraction/documentation of already-consistent patterns, low risk); step 3 (visual state fixes) benefits from a quick human design review before merging since it changes visible interaction feedback across every button/input/checkbox in the app.
```

---

## 10. Extract shared CRUD primitives for the Settings pages (Accounts/Categories/Methods/Trash)

```
Extract shared CRUD primitives for Settings pages to stop duplicating archive/delete/restore logic
```

```markdown
**Type:** Refactor / Modularization
**Area:** Settings

### Problem
`src/pages/Settings/Accounts.tsx`, `Categories.tsx`, and `Methods.tsx` are three independent, near-identical implementations of the same "manage an entity list with archive + delete-with-dependency-guard" pattern. A change to how archiving or delete-guards behave has to be made three times, by hand, with nothing enforcing they stay in sync.

### Evidence
Structurally identical across all three files:
- Modal/editing state: `Accounts.tsx:18-20`, `Categories.tsx:36-37`, `Methods.tsx:34-35` — `modalOpen`, `editing`, `deleteError: Record<string,string>`.
- `openAdd`/`openEdit`/`handleSave`: `Accounts.tsx:23-49`, `Categories.tsx:40-59`, `Methods.tsx:40-67`.
- Active/archived split: `Accounts.tsx:51-52`, `Categories.tsx:61-64`, `Methods.tsx:69-72`.
- Restore handler (inline JSX): `Accounts.tsx:150-157`, `Categories.tsx:197-204`, `Methods.tsx:179-186`.
- Delete handler w/ error-map set/clear (inline JSX): `Accounts.tsx:165-178`, `Categories.tsx:212-224`, `Methods.tsx:194-207`.
- The exact same 4-line error-clearing closure copy-pasted **6 times**: `setDeleteError(prev => { const n = { ...prev }; delete n[id]; return n; });` — at `Accounts.tsx:151-155,173-177`, `Categories.tsx:198-202,220-224`, `Methods.tsx:180-184,202-206`.
- Archived-list row markup is byte-for-byte identical structure (only the displayed field differs — `a.name` vs `c.head` vs `m.name`): `Accounts.tsx:135-193`, `Categories.tsx:180-240`, `Methods.tsx:164-222`.
- Sticky page header block (title, subtitle, optional `InfoTooltip`, "add" button) repeated in 5 files: `Accounts.tsx:57-72`, `Categories.tsx:82-97`, `Methods.tsx:81-96`, `Trash.tsx:133-148`, `Settings/index.tsx:189-194`.
- Draggable list-item card (Categories/Methods only) with an identical copy-pasted `whileDrag` prop: `whileDrag={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)', zIndex: 1000, backgroundColor: '#18181b' }}` at `Categories.tsx:117-174` and `Methods.tsx:104-161`.
- `Trash.tsx`'s four sub-tables (`TransactionsTable`, `AccountsTable`, `MethodsTable`, `CategoriesTable`, lines 285-530) are near-identical table shells (same wrapper classes, same header classes, same row hover/exit-animation classes, same trailing restore-button cell) — only column content differs.

The only meaningful differences between the three pages: Accounts/Categories delegate their form to `AccountForm`/`CategoryForm`, but **Methods inlines its form JSX directly** in the `ResponsiveModal` (`Methods.tsx:225-293`) instead of using a `MethodForm` component — an inconsistency worth fixing as part of this same effort.

### Fix
1. Extract a `useCrudList<T>(entities, { add, update, archive, delete })` hook that owns `modalOpen`/`editing`/`deleteError` state plus the restore/delete-with-guard handlers, for all three Settings pages to share.
2. Extract `<SettingsPageHeader title description action? />` for the repeated sticky header block.
3. Extract `<ArchivedItemRow label onRestore onDelete error />` for the repeated archived-list row.
4. Extract `<DraggableEntityRow icon iconClass title subtitle onEdit onArchive />` for the Categories/Methods drag-reorder card.
5. Extract a generic `<RestorableTable columns rows renderCell onRestore restoring />` (or equivalent) for `Trash.tsx`'s four near-identical sub-tables.
6. Convert `Methods.tsx`'s inline form into a `MethodForm` component for parity with `AccountForm`/`CategoryForm`.
7. Delete the local duplicate `InfoTooltip` function in `Trash.tsx:18-31` (different implementation — raw hover div instead of Popover) and use the shared, Popover-based `src/components/ui/info-tooltip.tsx` instead, as used elsewhere in `Trash.tsx:140-143`.

**Suitable for:** an AI coding agent — this is a well-bounded, mechanical extraction with three existing implementations to diff against for correctness (any behavior not common to all three should be preserved as a prop/option). Recommend doing it as one page at a time (Accounts → Categories → Methods → Trash) with tests passing after each, rather than one giant PR.
```

---

## 11. Extract a shared `<EmptyState>` component

```
Extract a shared <EmptyState> component used across Dashboard/Insights/Budget/Transactions
```

```markdown
**Type:** Refactor / Modularization
**Area:** UI Components

### Problem
The same empty-state block (icon in a circle, heading, description paragraph) is duplicated near-verbatim across four top-level pages. Any visual change to how empty states look requires editing all four.

### Evidence
Identical structure in:
- `src/pages/Dashboard.tsx:54-69`
- `src/pages/Insights.tsx:44-55`
- `src/pages/Budget.tsx:41-53`
- `src/pages/Transactions.tsx:54-66`

Shared shell across all four:
```jsx
<div className="flex flex-col items-center justify-center min-h-[50dvh] lg:h-[70vh] py-12 text-center px-4">
  <div className="h-16 w-16 lg:h-24 lg:w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
    <Icon .../>
  </div>
  <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">...</h2>
  <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm lg:text-base">...</p>
</div>
```

Only the icon, heading text, description text, and (on Dashboard) a CTA button differ between the four call sites.

### Fix
1. Add `src/components/ui/empty-state.tsx` exporting `<EmptyState icon={LucideIcon} title={string} description={string} action?={ReactNode} />`.
2. Replace all four call sites with the shared component.

**Suitable for:** an AI coding agent — small, low-risk, purely visual extraction with four existing usages to verify against.
```

---

## 12. Centralize `CategoryGroup` constants and classification logic

```
Centralize CategoryGroup list and expense/income/budgetable classification into one constants file
```

```markdown
**Type:** Refactor / Modularization
**Area:** Categories / Ledger

### Problem
The list of category groups (`'Income' | 'Needs' | 'Wants' | 'Invest' | 'Lend' | 'Borrow'`) and which groups count as "expense," "income," or "budgetable" are each hardcoded independently in multiple files with no shared source of truth. Adding, removing, or renaming a group today requires editing 5+ files by hand, with no compiler check tying them together — a real correctness risk, not just a style nit.

### Evidence
- The literal group array is duplicated verbatim in two files:
  - `src/pages/Settings/Categories.tsx:15` — `const GROUPS: CategoryGroup[] = ['Income', 'Needs', 'Wants', 'Invest', 'Lend', 'Borrow'];`
  - `src/components/Forms/CategoryForm.tsx:17` — identical array.
- Expense/income classification is separately hardcoded in the ledger engine:
  - `src/lib/ledger.ts:70` — `isExpenseCategory: ['Needs','Wants','Invest','Lend'].includes(c.group)`
  - `src/lib/ledger.ts:74` — `isIncomeCategory: ['Income','Borrow'].includes(c.group)`
- "Budgetable" classification is separately hardcoded a third way:
  - `src/hooks/useComputed.ts:190` — `c.group !== 'Income'`
- Two unrelated, disconnected color systems both attempt to map group → color:
  - `src/pages/Insights.tsx:22-30` — `CATEGORY_COLORS` (raw hex values)
  - `src/pages/Settings/Categories.tsx:17-24` — `GROUP_STYLES` (Tailwind utility classes)
  - These can disagree — the same category could render a different color in Insights than in Settings.

### Fix
1. Create `src/constants/categoryGroups.ts` exporting:
   - `CATEGORY_GROUPS: CategoryGroup[]` (the canonical list)
   - `EXPENSE_GROUPS`, `INCOME_GROUPS`, `BUDGETABLE_GROUPS` (or equivalent predicate functions `isExpenseGroup(group)`, `isIncomeGroup(group)`, `isBudgetableGroup(group)`)
   - A single `CATEGORY_GROUP_COLORS: Record<CategoryGroup, string>` mapping used by both Insights and Settings, replacing the two disconnected palettes.
2. Update `src/lib/ledger.ts:70,74`, `src/hooks/useComputed.ts:190`, `src/pages/Settings/Categories.tsx:15,17-24`, and `src/components/Forms/CategoryForm.tsx:17` to import from this file instead of hardcoding.
3. Update `src/pages/Insights.tsx:22-30` to use the same color mapping.

**Suitable for:** an AI coding agent — mechanical consolidation, but should run the full test suite afterward since `ledger.ts`'s classification logic is load-bearing for balance calculations.
```

---

## 13. Deduplicate "find transaction's primary account/category entry" logic (fixes a latent bug)

```
Deduplicate "find transaction's account/category entry" logic — one copy is missing DEBIT/CREDIT handling
```

```markdown
**Type:** Bug + Refactor
**Area:** Ledger / Transactions

### Problem
The logic to find which ledger entry in a transaction corresponds to a given account (or category) is independently reimplemented in four places. Three of the four correctly distinguish DEBIT vs. CREDIT entries for income transactions; **one does not**, meaning it can pick the wrong entry/amount for income transactions specifically. This is a real correctness bug hiding inside the duplication, not just a style issue.

### Evidence
"Find primary account entry" duplicated in:
- `src/pages/Transactions.tsx:82-90` (`getAccountName`) — correctly branches on DEBIT for income / CREDIT otherwise.
- `src/pages/Settings/Trash.tsx:74-90` (inside `handleRestore`'s safety check) — same correct branching.
- `src/utils/format.ts:76-83` (inside `exportToCSV`) — same correct branching.
- `src/components/Transactions/TransactionDetailPanel.tsx:41` — **simplified variant missing the DEBIT/CREDIT distinction entirely.**

"Find category entry" duplicated in the same four files (`Transactions.tsx:97`, `Trash.tsx:94`, `TransactionDetailPanel.tsx:44`, and equivalently `useComputed.ts:115` inside `useCategorySpend`), all using `entries.find(e => categories.some(c => c.id === e.accountId))`.

### Fix
1. Add `getPrimaryAccountEntry(txn, accounts)` and `getCategoryEntry(txn, categories)` to `src/lib/ledger.ts` (as methods on `LedgerEngine` or standalone exported functions), implementing the correct DEBIT/CREDIT branching found in `Transactions.tsx`/`Trash.tsx`/`format.ts`.
2. Replace all four duplicated implementations with calls to these shared functions — this also fixes `TransactionDetailPanel.tsx`'s incomplete variant as a side effect.
3. Add a unit test for an income transaction specifically, asserting the detail panel and the transactions list agree on which entry/amount is shown — this is exactly the case the current bug would silently get wrong.

**Suitable for:** an AI coding agent, but flag the `TransactionDetailPanel.tsx` fix for a quick manual check afterward (view an income transaction's detail panel before/after) since this is a user-visible correctness fix, not just a refactor.
```

---

## 14. Fix cross-slice coupling in the Zustand store (accounts/methods/categories)

```
Fix cross-slice coupling in the store: accountSlice mutates methods state owned by categorySlice
```

```markdown
**Type:** Refactor / Modularization
**Area:** State Management

### Problem
The Zustand store's slice separation (`src/store/slices/*.ts`) is meant to give each slice ownership of its own domain, but several slices reach directly into state owned by other slices. This means a change to how payment methods, budgets, or transactions are structured can silently ripple into `accountSlice.ts` and `categorySlice.ts` in ways that are easy to miss.

### Evidence
- `accountSlice.ts` directly mutates `methods` state, even though `methods: PaymentMethod[]` is defined and owned by `categorySlice.ts` (`categorySlice.ts:9,27`):
  - `addAccount` creates a `PaymentMethod` and writes to `methods`: `accountSlice.ts:33-52`.
  - `restoreAccount` reads/writes `state.methods`: `accountSlice.ts:85-97`.
  - `deleteAccount` reads/writes `state.methods`, and also reads `state.budgets` (owned by `budgetSlice`) and `state.transactions` (owned by `transactionSlice`): `accountSlice.ts:104-131`.
- `categorySlice.ts` itself conflates two unrelated domains under one name — categories AND payment methods are both defined in the file/interface called `CategorySlice` (`categorySlice.ts:7-23,91-173`). Methods conceptually belong with accounts (a method links to an account), not with categories.
- `categorySlice.deleteCategory` reads `state.budgets` (owned by `budgetSlice`): `categorySlice.ts:71-76`.
- `categorySlice.deleteMethod` reads `state.transactions` (owned by `transactionSlice`): `categorySlice.ts:127-132`.
- Delete-dependency-guard logic (`hasTransactions`, `hasBudgets`, `methodsInUse`, etc.) is hand-rolled separately per entity type instead of one shared helper: `accountSlice.ts:106-125`, `categorySlice.ts:65-76,127-145`.

### Fix
1. Split `categorySlice.ts` into `categorySlice.ts` (categories only) and a new `methodSlice.ts` (payment methods only).
2. Extract a shared dependency-guard helper, e.g. `assertNotReferencedByTransactions(state, predicate, entityLabel)`, used by all `delete*` implementations instead of each slice re-deriving `transactions.some(...)`/`budgets.some(...)` by hand.
3. Have `accountSlice.deleteAccount`'s method-cascade logic call the new `methodSlice`'s own delete/cascade function rather than directly manipulating `state.methods`.

### Risk
This touches core data-integrity logic (account/method/category deletion and cascading). Recommend doing this incrementally with the existing test suite run after each step, and NOT combining it with unrelated feature work in the same PR.

**Suitable for:** a human, or a strong AI agent with careful review — this is the riskiest issue in this batch since it touches deletion/cascade correctness across four entity types. Should not be done casually.
```

---

## 15. Route all date/locale formatting through the existing `utils/format.ts` helpers

```
Replace ad hoc 'en-IN' locale literals with the existing settings-aware format.ts helpers
```

```markdown
**Type:** Bug / Refactor
**Area:** Formatting / i18n

### Problem
`src/utils/format.ts` already has (or should have, per issue #2 in this backlog) settings-aware date/number formatting helpers, but several components bypass them entirely and hardcode `'en-IN'` directly via ad hoc `toLocaleDateString('en-IN', ...)` calls — duplicating what `format.ts` already does, and ignoring the user's regional preference even in places `format.ts` itself doesn't cover yet.

### Evidence
`'en-IN'` hardcoded directly (bypassing `settings.numberLocale` entirely) in:
- `src/pages/Transactions.tsx:164,254`
- `src/components/Transactions/AddTransactionModal.tsx:147` (partially — some call sites here do reference `settings.numberLocale`, this one doesn't)
- `src/pages/Dashboard.tsx:51`
- `src/hooks/useComputed.ts:155`
- `src/pages/Budget.tsx:70`

This is related to, and should be fixed alongside, issue #2 in this backlog (`dateFormat` setting is stored but never used) — once `format.ts`'s `formatDate`/`formatDateShort`/`formatMonth` correctly read `settings.dateFormat`/`settings.numberLocale`, these five call sites should be switched to use them instead of hand-rolling their own `toLocaleDateString` calls.

### Fix
1. Complete issue #2 first (make `format.ts`'s formatters settings-aware).
2. Replace each of the five ad hoc `toLocaleDateString('en-IN', {...})` call sites above with the corresponding `formatDate`/`formatDateShort`/`formatMonth` call from `utils/format.ts`.

**Suitable for:** an AI coding agent — should be done as a follow-up to issue #2, not in parallel, to avoid two people changing the same formatting logic at once.
```

---

## 16. [SECURITY — HIGH] Shared-device sessions can expose one user's financial data to the next person who opens the app

```
[Security] Cached-credential auth gate lets a second user on a shared device see the previous user's financial data
```

```markdown
**Type:** Security Vulnerability
**Severity:** High
**Area:** Auth / Session Management

### Problem
On every page load, the app decides whether to render protected routes (Dashboard, Transactions, etc.) purely from locally cached values in IndexedDB — `accessToken` and `lastSyncedAt` — with no network round-trip to verify that the cached identity still belongs to the person currently at the keyboard. The actual "is this still the same Google account?" check runs later, asynchronously, and only reacts after the fact.

### Evidence
- `src/store/slices/syncSlice.ts:274` — `isCloudInitialized: !!(lastSyncedAt && accessToken)` is computed synchronously from IndexedDB-hydrated state alone, no network verification.
- `src/App.tsx:209` (loading gate) and `src/App.tsx:264-266` (router gate) both key off `accessToken`/`isCloudInitialized`/`isHydrated`, all of which are already true immediately after synchronous local hydration.
- The account-switch detection (comparing `getMeta('userEmail')` to a freshly fetched profile) lives inside the async `initCloud()` effect (`App.tsx:151-162`) and only clears data if a *new* profile fetch later resolves with a *different* email — nothing gates what's rendered in the interim.

### Exploit Scenario
User A uses moniq on a shared/kiosk/family/work computer and simply closes the browser tab without clicking "Sign out" — the ordinary way almost everyone ends a session. Their token and full transaction/account/budget history remain in that browser's IndexedDB. User B later opens the same browser and navigates to the app's URL. Because `accessToken` and `isCloudInitialized` are both already true from local storage alone, the router immediately redirects to `/dashboard` and renders **User A's real financial data** — before any identity check has run. If A's token still silently refreshes successfully (which it will, for up to an hour or longer with the refresh cycle), B can browse A's full financial history indefinitely without ever being prompted to log in.

### Fix
Do not unlock protected routes purely from cached `lastSyncedAt`/`accessToken`. Require a fresh, successful profile-email verification (`fetchUserProfile()` + email match) to complete before rendering any financial data. Keep the loading/connecting state active until that check resolves, and treat "cached token present but not yet re-verified this page load" as a distinct, locked state — not equivalent to "verified this session."

**Suitable for:** a human or a strong AI agent with careful review — this is an auth-flow correctness change and should be tested against the full login/reload/logout/account-switch matrix before merging, not just the happy path.
```

---

## 17. [SECURITY — HIGH] Data-loss race: background token refresh can silently delete an in-flight transaction

```
[Data Loss] Token-refresh-triggered full resync can silently overwrite/delete a just-saved transaction
```

```markdown
**Type:** Bug / Data Loss
**Severity:** High
**Area:** Sync Engine

### Problem
A background silent token refresh (which happens roughly once per token lifetime — typically hourly — during ordinary continuous use, not just at login) re-triggers a full `SyncEngine.initialize()` pull-and-reconcile. If a user saves a transaction in the narrow window while that reconcile is in flight, the edit can be silently overwritten in IndexedDB and its queued sync operation deleted — with no error ever shown to the user. The transaction appears to save successfully, then vanishes permanently on the next reload.

### Evidence
- `src/App.tsx:130-202` — the cloud-init `useEffect` has `tokenExpiresAt` in its dependency array (line 195). `tokenExpiresAt` changes every time `silentRefresh()` succeeds (`src/lib/google.ts:71-116`), re-running `initCloud()` → `engine.initialize(sheetId)` — a full network pull + reconcile, not a lightweight check.
- `src/sync/SyncEngine.ts:384-400` — local entity arrays are read from the Zustand store *once*, after several `await`s (network fetch, migrations, header repair) — a stale snapshot.
- `src/sync/SyncEngine.ts:451-465` — the reconcile result is written back via `putMany(...)` and the **entire** sync queue is unconditionally cleared via `clearSyncQueue()`, then `lastSyncedAt` is bumped.

If a transaction is created/edited/deleted between the Zustand snapshot (line 386) and the final `putMany`/`clearSyncQueue` calls, that edit exists only in live Zustand state and an as-yet-unflushed `sync_queue` IndexedDB entry. `initialize()`'s stale `merged` array doesn't contain it, so `putMany` overwrites the IndexedDB record with the pre-edit version, and `clearSyncQueue()` deletes the queued op — the edit is now unrecoverable, since local in-memory state (which briefly still shows it) is not itself persisted anywhere.

### Scenario
A user enters a large expense right around the top of the hour. A background silent token refresh completes moments earlier, re-triggering a full resync. The save lands in the race window above. The transaction appears saved in the UI, but a few minutes later — or on the next reload — it has vanished. No error, no toast, no trace in Trash.

### Fix
1. Remove `tokenExpiresAt` from the effect's dependency array — a token refresh alone should not imply a full re-pull.
2. In `initialize()`, re-read `useDataStore.getState()` immediately before the final `putMany`/`clearSyncQueue` calls and re-merge any entities whose `updatedAt` is newer than the snapshot used for reconciliation.
3. At minimum, `clearSyncQueue()` should only remove the specific ops that were actually reconciled/pushed in this run (snapshot queue IDs at the start of `initialize()`, delete only those) rather than blanket-clearing the whole queue — so any op added mid-`initialize()` survives to the next flush.

**Suitable for:** a human or a strong AI agent with careful review — this is a correctness-critical fix to the core sync path; recommend a dedicated regression test that simulates a local write occurring mid-`initialize()` before merging.
```

---

## 18. [SECURITY — MEDIUM] OAuth access token logged in plaintext to the browser console on login

```
[Security] Remove console.log of the full OAuth token response on login
```

```markdown
**Type:** Security Vulnerability
**Severity:** Medium
**Area:** Auth

### Problem
`src/hooks/useHomeAuth.ts:33` — `console.log('Login Success:', tokenResponse)` logs the full Google OAuth token response, including the live `access_token`, in plaintext to devtools on every login. The CHANGELOG (v0.9.4) claims noisy diagnostic console logs were removed from Google Drive/sync interactions, but this specific line was missed.

### Exploit Scenario
A user shares a screen-recording or screenshot of devtools while troubleshooting/support (this app has no backend, so "open devtools and check the console" is a plausible ask during support), or a browser extension/support tool with console-read access captures it. The token is valid on Google's API until natural expiry (up to ~1 hour) and grants `drive.file`-scoped read/write access to files the app created in the user's Drive/Sheets.

### Fix
Remove the `console.log`, or redact the token before logging, e.g. `console.log('Login Success', { expires_in: tokenResponse.expires_in })`.

**Suitable for:** an AI coding agent — trivial, one-line fix.
```

---

## 19. [SECURITY — MEDIUM] "Reconnect" flow doesn't reset the sync engine or re-verify identity on a different account

```
[Security] Session-expired "Reconnect" flow can misdirect sync writes if a different Google account is chosen
```

```markdown
**Type:** Security Vulnerability
**Severity:** Medium
**Area:** Sync Engine / Session Management

### Problem
`SyncEngine` is a singleton that lazily creates and caches a `SheetClient` bound to one spreadsheet ID the first time it's needed (`src/sync/SyncEngine.ts:204-220`, `ensureClient`), and only discards that cache via an explicit `SyncEngine.reset()` — currently called only from the two dedicated "Sign out" actions. The `SessionExpiredBanner` "Reconnect" flow (`src/components/Layout/SessionExpiredBanner.tsx:11-20`) sets a new access token via `setAccessToken(...)` but never calls `SyncEngine.reset()` and never re-runs the account-switch email-comparison check that `App.tsx:151-162` uses during initial login.

### Exploit / Failure Scenario
A user with two Google accounts signed into the same browser (e.g. personal + work) is using moniq under account A when the token expires mid-session. They click "Reconnect" and, in Google's account chooser, select account B instead of A — an easy real-world mistake. moniq now attempts to push B's local pending edits using B's token, but still targeting A's cached spreadsheet ID. Because of the narrow `drive.file` scope this will usually fail with a 403 (B's token has no grant on a file it didn't create), but the app doesn't detect or surface this account mismatch — the user just sees a confusing, unexplained sync failure. In an edge case where B previously did have access to the same file, cross-account writes are possible.

### Fix
In `SessionExpiredBanner`'s (and `DemoExitDialog`'s) `onSuccess` handler, call `SyncEngine.reset()` before setting the new token, and re-run the same email-comparison account-switch check used during initial `initCloud` bootstrap immediately after any token acquisition — not only at first login.

**Suitable for:** an AI coding agent, with a manual test afterward simulating a mismatched-account reconnect.
```

---

## 20. [SECURITY — MEDIUM] Destructive schema migrations can proceed without a backup if the backup attempt fails

```
[Security] Schema migrations silently proceed without a backup if the pre-migration Drive backup fails
```

```markdown
**Type:** Security / Data Integrity
**Severity:** Medium
**Area:** Schema Migrations

### Problem
`src/schema/runner/sheetsMigrationRunner.ts:125-132` — before running destructive per-sheet rewrites (`safeRewrite`, which clears and rewrites entire sheet ranges), a Drive backup is attempted only if both `opts?.createBackup` and `opts.spreadsheetId` are provided, and if the backup attempt throws, the error is silently swallowed (`catch (_err) { /* Proceed without backup */ }`) and the migration proceeds anyway. `safeRewrite`'s own rollback only detects a row-count mismatch — it cannot catch column-level corruption from a buggy migration, and the rollback write itself is an unguarded API call that can also fail.

### Scenario
If Drive is briefly rate-limited or the backup-folder lookup fails at the exact moment a schema migration needs to run (e.g. right after an app update), the migration proceeds with zero backup. If the migration's `up()` writes correct row counts but corrupted column data, `safeRewrite`'s row-count-only verification won't catch it, and there is no backup to recover from.

### Fix
Treat backup failure as fatal for destructive migrations — abort and surface a clear error to the user rather than silently proceeding — or at minimum make `createBackup`/`spreadsheetId` non-optional for any migration path that calls `safeRewrite`.

**Suitable for:** an AI coding agent, but the resulting user-facing error state (what a user sees/can do if a migration can't safely proceed) should get a quick product/design sanity check.
```

---

## 21. [SECURITY — MEDIUM] No real cross-tab lock around schema migrations (broadcast-only, not a mutex)

```
[Security] Add a real cross-tab lock for schema migrations instead of a broadcast-only notification
```

```markdown
**Type:** Security / Data Integrity
**Severity:** Medium
**Area:** Schema Migrations

### Problem
`migrationChannel` (`src/schema/runner/migrationChannel.ts`) is a fire-and-forget `BroadcastChannel` notification, not a mutex. Two tabs open to the same account at the moment a new app version ships could both read the same stored schema version, both compute the same non-empty pending-migrations list, and both call `migration.up(client)` concurrently against the same Google Sheet. `safeRewrite`'s read-buffer-then-overwrite-then-verify sequence is not atomic against a concurrent writer from another tab.

### Scenario
A user has moniq open in two browser tabs (common — one on desktop, one left open from earlier) and the app updates (or a schema version bump ships) while both tabs are hydrated. Both tabs independently detect the pending migration and race to rewrite the same sheet, potentially corrupting the Transactions or Accounts sheet in a way the row-count-only verification doesn't catch (each tab may be comparing against the other tab's write, not its own).

### Fix
Use the Web Locks API (`navigator.locks.request(...)`) or an IndexedDB-based mutex with a real acquire/wait/release cycle to gate migration entry across tabs, rather than a post-hoc broadcast notification.

**Suitable for:** an AI coding agent, but this is concurrency-sensitive — recommend a test simulating two `SyncEngine`/migration-runner instances racing on the same pending migration.
```

---

## 22. Access token persisted in plaintext IndexedDB rather than session-scoped storage

```
Persist the OAuth access token in session-scoped storage instead of durable IndexedDB
```

```markdown
**Type:** Security Hardening
**Severity:** Low (defense-in-depth; compounds issue #16)
**Area:** Auth

### Problem
`src/store/slices/settingsSlice.ts:59-74` — the live bearer token is written unencrypted into the IndexedDB `meta` object store on every login/refresh and read back on every page load. This means the token outlives the browser tab and is recoverable by anyone with access to the browser profile's on-disk storage (shared computer, unlocked/stolen device, browser-sync backup) for as long as it remains unexpired — and, combined with issue #16, effectively indefinitely if silent refresh keeps succeeding.

### Fix
Consider binding the token to `sessionStorage` (cleared when the tab/browser closes) instead of IndexedDB, or rely on fixing issue #16 (re-verify identity on every fresh page load before trusting cached data) as the primary mitigation, since that addresses the root cause regardless of where the token is stored.

**Suitable for:** an AI coding agent, but should be scoped and reviewed together with issue #16 rather than done in isolation, since both touch the same login/reload flow.
```

---

## 23. `SyncEngine.performHardReset()` has no internal re-entrancy guard

```
Add an internal re-entrancy guard to SyncEngine.performHardReset()
```

```markdown
**Type:** Security Hardening
**Severity:** Low
**Area:** Sync Engine

### Problem
`src/sync/SyncEngine.ts:726-767` — `performHardReset()` only sets a status label; it has no internal flag preventing two concurrent invocations. The Settings page's `isResetting` React state (`src/pages/Settings/index.tsx:151,836`) prevents double-firing through the one shipped Danger Zone button, but the engine itself is unprotected — any other future call site would not be guarded.

### Fix
Add an internal `private resetting = false` flag inside `performHardReset()` that early-returns (or throws) if a reset is already in progress, independent of any UI-layer guard.

**Suitable for:** an AI coding agent — small, low-risk, defense-in-depth addition.
```

---

## 24. CSV export doesn't sanitize spreadsheet-formula characters (formula/CSV injection)

```
Sanitize leading formula characters in CSV export to prevent spreadsheet formula injection
```

```markdown
**Type:** Security Hardening
**Severity:** Low
**Area:** Transactions / Export

### Problem
The ledger CSV export (`Export CSV` button on the Transactions page, wired to `exportToCSV` in `src/utils/format.ts:50-109`, called from `src/pages/Transactions.tsx:50-51`) is a real, shipped feature — not hypothetical. The transaction `note` field is only quote-escaped (`` `"${note.replace(/"/g, '""')}"` ``, `format.ts:100`), with no check or neutralization of leading `=`, `+`, `-`, or `@` characters. If a transaction note is literally `=cmd|'/c calc'!A1` or `=HYPERLINK("http://evil.com","click")`, that exact string lands unmodified in the exported CSV cell.

### Why Low severity
The practical attack path is weak in this app's model: there's no multi-user data, so a user can only inject into their own export by typing it into their own transaction note. This only becomes a real risk if the exported file is later shared with or sent to someone else who opens it in Excel/Sheets, or if a future feature aggregates exports across multiple people. Still a cheap, standard fix worth applying since the underlying feature is real and shipped.

### Fix
Prefix any exported cell value that starts with `=`, `+`, `-`, `@`, tab, or CR with a leading `'` before quoting — the standard mitigation used by most CSV-export libraries:
```ts
const sanitizeCsvCell = (v: string) => /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
```
Apply to the `note` field in `exportToCSV`, and defensively to category/account/method labels even though those are developer/in-app-defined rather than arbitrary free text.

**Suitable for:** an AI coding agent — small, well-scoped, low-risk fix.
```

---

## 25. Add export to the Insights page (charts/summary data), matching the existing Ledger CSV export

```
Add data export to the Insights page (category breakdown, monthly trends, income vs. expense)
```

```markdown
**Type:** Feature
**Area:** Analytics / Export

### Problem
The Transactions ("Ledger") page already has a working CSV export (`Export CSV` button, `src/pages/Transactions.tsx:130-134` → `exportToCSV` in `src/utils/format.ts`) covering raw transaction rows. The Insights page (`src/pages/Insights.tsx`) has no equivalent — there's no way to export the category-spend breakdown, the 6-month trend data, or the income-vs-expense comparison that the page already computes and charts (via `useCategorySpend`/`useHistoricalData` in `src/hooks/useComputed.ts`).

### Scope
1. Add an "Export" action to the Insights page, similar in placement/style to the Transactions page's export button.
2. Export the already-computed aggregate data (category totals, monthly trend series, income/expense series) as CSV — this is a much smaller export than the raw ledger, since the numbers are already aggregated by the existing hooks; no new calculation logic should be needed, only a CSV-serialization function analogous to `exportToCSV` (e.g. `exportInsightsCSV`).
3. Apply the same formula-injection sanitization from issue #24 to any exported label field.
4. Decide whether to export one CSV covering all three views, or a separate export per chart/section — recommend starting with one combined export (e.g. separate labeled sections in one file) for simplicity, and splitting later only if requested.

**Suitable for:** an AI coding agent — the underlying data is already computed by existing hooks; this is primarily a serialization + UI-wiring task, following the exact pattern already established by the Ledger's `exportToCSV`.
```


