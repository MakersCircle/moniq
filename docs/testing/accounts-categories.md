# Accounts, Payment Methods & Categories Test Coverage

This document details test cases covering `src/pages/Settings/Accounts.tsx`, `src/pages/Settings/Methods.tsx`, `src/pages/Settings/Categories.tsx`, their form components (`src/components/Forms/AccountForm.tsx`, `src/components/Forms/CategoryForm.tsx`), and the store logic in `src/store/slices/accountSlice.ts` and `src/store/slices/categorySlice.ts`.

## 1. Unit Tests (`accountSlice.test.ts`, `categorySlice.test.ts`)
Focuses purely on store/business logic: CRUD mutations, soft-delete guards, cross-entity dependency checks, and reordering — independent of the UI.

### Account Slice — Create / Update / Archive / Restore
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-01 | `addAccount` with methodName provided | Creates account with new UUID, `isDeleted: false`, `createdAt`/`updatedAt` set; creates a linked `PaymentMethod` with `name` = methodName, `linkedAccountId` = new account id, `isActive: true`; returns `{ accountId, methodId }` |
| U-02 | `addAccount` without methodName | Auto-created default payment method's `name` falls back to the account's `name` |
| U-03 | `addAccount` persistence | Both the new account and its default method are written via `put('accounts', ...)` / `put('methods', ...)` and marked dirty (`markDirty('account', id, 'create')`, `markDirty('method', methodId, 'create')`) |
| U-04 | `addAccount` state update | New account appended to `accounts[]` and new method appended to `methods[]` in a single `set` call |
| U-05 | `updateAccount` with partial patch | Merges patch into existing account, bumps `updatedAt`, leaves other accounts untouched |
| U-06 | `updateAccount` on unknown id | No matching account patched; array reference still replaced but no entry changes |
| U-07 | `archiveAccount` | Sets `isActive: false` on the target account, bumps `updatedAt`, persists via `put`, marks dirty as `update` |
| U-08 | `archiveAccount` does not touch linked methods | Payment methods linked to the archived account remain `isActive: true` (only the account itself is archived) |
| U-09 | `restoreAccount` on a soft-deleted account | Sets `isDeleted: false` on the account and bumps `updatedAt` |
| U-10 | `restoreAccount` cascades to linked methods | Any payment method with matching `linkedAccountId` that was also soft-deleted (`isDeleted: true`) is restored (`isDeleted: false`) alongside the account |
| U-11 | `restoreAccount` leaves unrelated methods alone | Methods linked to other accounts, or already-active methods, are not modified or re-persisted |

### Account Slice — Delete Guards
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-12 | `deleteAccount` when account referenced by a non-deleted transaction entry | Returns `{ success: false, reason: 'This account is referenced by existing transactions. Archive it instead.' }`; no state mutation |
| U-13 | `deleteAccount` when only soft-deleted transactions reference the account | Transaction check ignores `isDeleted: true` transactions; deletion proceeds if no other guard trips |
| U-14 | `deleteAccount` when a linked payment method is used in a transaction | Returns `{ success: false, reason: 'Linked payment method(s) "<names>" are used in transactions. Archive the account instead.' }` with all offending method names comma-joined |
| U-15 | `deleteAccount` when account referenced by a non-deleted budget | Returns `{ success: false, reason: 'This account is referenced by a budget. Remove the budget first.' }` |
| U-16 | `deleteAccount` with no transactions, no in-use methods, no budgets | Returns `{ success: true }`; account set to `isDeleted: true`; all linked (non-deleted) methods also set to `isDeleted: true` in the same update |
| U-17 | `deleteAccount` success persists cascaded methods | Every linked method that was cascade-deleted is individually `put('methods', ...)` and `markDirty('method', id, 'update')` |
| U-18 | `deleteAccount` guard precedence | When both a direct-transaction reference and a budget reference exist, the transaction guard (checked first) is the one returned |

### Payment Method Slice — Create / Update / Archive
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-19 | `addMethod` | Creates method with new UUID, `isDeleted: false`, timestamps set; appended to `methods[]`; persisted and marked dirty as `create` |
| U-20 | `updateMethod` with partial patch | Merges patch, bumps `updatedAt`, persists only the updated record |
| U-21 | `archiveMethod` | Sets `isActive: false`, bumps `updatedAt`, persists, marks dirty as `update` |

### Payment Method Slice — Delete Guards
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-22 | `deleteMethod` on unknown or already-deleted id | Returns `{ success: false, reason: 'Method not found.' }` without mutating state |
| U-23 | `deleteMethod` when method used in a non-deleted transaction | Returns `{ success: false, reason: 'This method is used in existing transactions. Archive it instead.' }` |
| U-24 | `deleteMethod` when method is the only active method linked to its account (last-active-method guard) | Returns `{ success: false, reason: 'This is the only active payment method for its linked account. Create another method first, or unlink and then delete.' }` |
| U-25 | `deleteMethod` when another active, non-deleted method shares the same `linkedAccountId` | Last-active-method guard does not trip; deletion proceeds (subject to other guards) |
| U-26 | `deleteMethod` when method has no `linkedAccountId` | Last-active-method guard is skipped entirely (guard only applies when `linkedAccountId` is set) |
| U-27 | `deleteMethod` with no transactions and guard clear | Returns `{ success: true }`; method set to `isDeleted: true`, persisted, marked dirty as `update` |
| U-28 | `deleteMethod` guard precedence | When both the transaction-usage guard and the last-active-method guard would trip, the transaction-usage guard (checked first) is returned |

### Category Slice — Create / Update / Archive
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-29 | `addCategory` | Creates category with new UUID, `isDeleted: false`, timestamps set; appended to `categories[]`; persisted and marked dirty as `create`; returns `{ id }` |
| U-30 | `updateCategory` with partial patch | Merges patch, bumps `updatedAt`, persists only the updated record |
| U-31 | `archiveCategory` | Sets `isActive: false`, bumps `updatedAt`, persists, marks dirty as `update` |

### Category Slice — Delete Guards
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-32 | `deleteCategory` when category referenced by a non-deleted transaction entry | Returns `{ success: false, reason: 'This category is referenced by existing transactions.' }` |
| U-33 | `deleteCategory` when only soft-deleted transactions reference it | Transaction check ignores `isDeleted: true` transactions; deletion proceeds if budget guard also clear |
| U-34 | `deleteCategory` when category has a non-deleted budget assigned | Returns `{ success: false, reason: 'This category has a budget assigned. Remove the budget first.' }` |
| U-35 | `deleteCategory` with no transactions, no budgets | Returns `{ success: true }`; category set to `isDeleted: true`, persisted, marked dirty as `update` |
| U-36 | `deleteCategory` guard precedence | When both transaction and budget references exist, the transaction guard (checked first) is returned |

### Reordering
| ID | Scenario | Expected Outcome |
|---|---|---|
| U-37 | `reorderMethods(ids)` with full id list | Each method's `sortOrder` is set to its index in `ids`; `updatedAt` bumped; each reordered method persisted via `put` and marked dirty as `update` |
| U-38 | `reorderMethods(ids)` with a subset of ids (others untouched) | Methods whose id is not found in `ids` (`indexOf === -1`) are returned unchanged, keeping their existing `sortOrder` |
| U-39 | `reorderCategories(ids)` with full id list | Each category's `sortOrder` is set to its index in `ids`; persisted and marked dirty as `update` |
| U-40 | `reorderCategories(ids)` scoped to one group | Methods/categories outside the reordered group retain their prior `sortOrder` (verifies the page-level "merge other group's cats back in" pattern used by `Categories.tsx`'s `handleReorder`) |

## 2. Component Tests
Focuses on form validation/rendering behavior (`AccountForm.test.tsx`, `CategoryForm.test.tsx`) and page-level list rendering and wiring (`Accounts.test.tsx`, `Methods.test.tsx`, `Categories.test.tsx`). Uses `@testing-library/react`.

### AccountForm
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-01 | Render with no `initialData` (create mode) | Shows empty "Display Name" input, shows the "Payment Method Name" field, `type` defaults to `'Asset'`, balance input empty |
| C-02 | Render with `initialData` (edit mode) | Fields pre-filled from `initialData`; "Payment Method Name" field is hidden entirely (only shown on create) |
| C-03 | Submit with empty name | Shows "display name required" error; `onSave` not called |
| C-04 | Typing in name field clears prior error | Error message disappears once name field is edited |
| C-05 | Method name auto-fill (not yet edited by user) | Typing into "Display Name" mirrors the value into the "Payment Method Name" field as long as user hasn't manually edited it |
| C-06 | Method name auto-fill stops once user edits method name directly | After editing "Payment Method Name" manually, further edits to "Display Name" no longer overwrite it |
| C-07 | Submit with method name left blank | `onSave` called with `methodName` equal to the trimmed account name (fallback) |
| C-08 | Submit with valid, non-empty initial balance | `onSave` called with `initialBalance` parsed as a float |
| C-09 | Submit with non-numeric initial balance | `initialBalance` defaults to `0` (NaN guarded) |
| C-10 | Toggling account `type` to `'Liability'` | "Savings Account" checkbox becomes disabled and visually de-emphasized; `isSavings` forced to `false` |
| C-11 | Toggling account `type` back to `'Asset'` | "Savings Account" checkbox re-enabled; previous `isSavings` value not force-cleared |
| C-12 | "Exclude from Net Worth" checkbox | Toggling sets `excludeFromNet` in submitted payload regardless of account type |
| C-13 | Cancel button click | Calls `onCancel`, does not call `onSave` |
| C-14 | Custom `submitLabel` prop | Submit button renders the provided label text |
| C-15 | Description textarea | Free-text value is trimmed and included in the submitted payload |

### CategoryForm
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-16 | Render with no `initialData` (create mode) | `group` defaults to `'Needs'`, "Head" and "Sub-head" inputs empty |
| C-17 | Render with `initialData` (edit mode) | Fields pre-filled from `initialData.group` / `.head` / `.subHead` |
| C-18 | Submit with empty head | Shows "head required" error; `onSave` not called |
| C-19 | Focusing the "Head" input | Opens the autocomplete dropdown listing all distinct existing category heads (alphabetically sorted, deduplicated) |
| C-20 | Typing in "Head" input | Dropdown list filters to heads containing the typed substring (case-insensitive); dropdown re-opens on each keystroke |
| C-21 | Clicking a suggestion in the autocomplete dropdown | Sets "Head" input to the clicked value and closes the dropdown |
| C-22 | Blurring the "Head" input | Dropdown closes after a short delay (allows click-through on suggestions) |
| C-23 | Submit with head+subHead combination matching an existing active category (duplicate-head+subhead guard) | Shows "already exists" error (case-insensitive comparison on both head and subHead); `onSave` not called |
| C-24 | Submit with head matching an existing category but different subHead | No duplicate error; `onSave` called (head alone is not unique, the head+subHead pair must be) |
| C-25 | Editing an existing category and resubmitting unchanged head+subHead | Duplicate guard does not fire against itself — the check excludes a match equal to `initialData.head`/`initialData.subHead` |
| C-26 | Editing an existing category and changing its head+subHead to collide with a *different* existing category | Duplicate guard fires normally |
| C-27 | Submit with valid, unique head | `onSave` called with trimmed `head`, trimmed `subHead`, selected `group`, and `isActive` from `initialData` (or `true` for new) |
| C-28 | Changing the `group` select | Submitted payload reflects the newly selected `CategoryGroup` |
| C-29 | Cancel button click | Calls `onCancel`, does not call `onSave` |

### Accounts Page
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-30 | Initial render with active accounts | Each active account renders name, type/description line, formatted `initialBalance` with currency symbol, and a "Savings" badge when `isSavings` is true |
| C-31 | Active count in header | "Active Accounts (N)" reflects `activeAccounts.length`, excluding archived and deleted accounts |
| C-32 | Archived section visibility | Archived-accounts section only renders when `archivedAccounts.length > 0` |
| C-33 | "Add Account" button | Opens modal in create mode (`editing === null`), title shows "New Account" |
| C-34 | Edit (pencil) icon click | Opens modal pre-populated with the clicked account's data, title shows "Edit Account" |
| C-35 | Archive icon click on active account | Calls `archiveAccount(id)`; account moves out of the active list into archived on next render |
| C-36 | "Restore" click on archived account | Calls `updateAccount(id, { isActive: true })` and clears any prior delete-error message for that id |
| C-37 | "Delete" click succeeding | Calls `deleteAccount(id)`; on `{ success: true }` no error is shown and any prior error for that id is cleared |
| C-38 | "Delete" click failing (blocked by transaction/method/budget guard) | Shows the slice's `reason` string inline beneath that account's row; account remains in the archived list |
| C-39 | Delete error falls back when `reason` missing | Displays generic "Cannot delete." text if `result.reason` is undefined |
| C-40 | Form submit in create mode | Calls `addAccount(payload, methodName)` with `isActive: true` always set on the payload, then closes the modal |
| C-41 | Form submit in edit mode | Calls `updateAccount(editing.id, payload)` (no `methodName` argument), then closes the modal |

### Payment Methods Page
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-42 | Initial render with active methods | Rendered in ascending `sortOrder`; each row shows method name and linked account name (via `ArrowRight` + account lookup) |
| C-43 | Linked account not found | Falls back to displaying "Unknown" when `accounts.find(...)` returns nothing |
| C-44 | "Add Method" button | Opens modal in create mode with empty `name`/`linkedAccountId` and cleared error |
| C-45 | Edit (pencil) icon click | Opens modal pre-filled with the method's `name` and `linkedAccountId` |
| C-46 | Save with empty name | Shows "display name required" error; does not call `addMethod`/`updateMethod` |
| C-47 | Save with name but no linked account | Shows "linked account required" error; does not save |
| C-48 | Save with both fields valid (create mode) | Calls `addMethod({ name, linkedAccountId, isActive: true })`, closes modal |
| C-49 | Save with both fields valid (edit mode) | Calls `updateMethod(editing.id, { name, linkedAccountId, isActive: true })`, closes modal |
| C-50 | Linked-account select options | Only lists accounts where `isActive && !isDeleted` |
| C-51 | Archive icon click | Calls `archiveMethod(id)` |
| C-52 | Restore click | Calls `updateMethod(id, { isActive: true })`, clears row's delete error |
| C-53 | Delete click succeeding | Calls `deleteMethod(id)`; no error shown on success |
| C-54 | Delete click failing (last-active-method or in-use guard) | Shows the slice's `reason` string inline beneath that method's row |
| C-55 | Drag-reorder interaction | Dragging a `Reorder.Item` to a new position calls `reorderMethods` with the full reordered id list via `handleReorder` |

### Categories Page
| ID | Scenario | Expected Outcome |
|---|---|---|
| C-56 | Initial render grouped by `CategoryGroup` | Categories are bucketed into sections per `GROUPS` order (`Income, Needs, Wants, Invest, Lend, Borrow`); a group section is omitted entirely when it has zero active categories |
| C-57 | Category row content | Shows `head`, and `subHead` only when present |
| C-58 | "Add Category" button | Opens modal in create mode |
| C-59 | Edit (pencil) icon click | Opens modal pre-filled with `group`, `head`, `subHead`, `isActive` |
| C-60 | Archive icon click | Calls `archiveCategory(id)` |
| C-61 | Restore click on archived category | Calls `updateCategory(id, { isActive: true })`, clears row's delete error |
| C-62 | Delete click succeeding | Calls `deleteCategory(id)`; no error shown on success |
| C-63 | Delete click failing (transaction/budget guard) | Shows the slice's `reason` string inline beneath that category's row |
| C-64 | Drag-reorder within a single group | `handleReorder(group, newOrder)` recombines `newOrder` for that group with all other groups' untouched categories, then calls `reorderCategories` with the full merged id list (order of other groups preserved) |
| C-65 | Form submit in create mode | Calls `addCategory(payload)` with `subHead` coerced to `undefined` when blank |
| C-66 | Form submit in edit mode | Calls `updateCategory(editing.id, payload)` |

## 3. End-to-End Tests
Focuses on full user flows through the real UI: creating, editing, archiving, restoring, and deleting Accounts, Payment Methods, and Categories, including guard-triggered error states and drag-reorder persistence across reloads.

### Accounts — Create, Edit, Archive, Restore, Delete
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-01 | Create a new account with default payment method name | New account card appears in the active list with correct name, type, and opening balance; a matching payment method (same name) appears on the Payment Methods page linked to it |
| E-02 | Create a new account with a custom payment method name | Account appears on Accounts page; the linked method on the Payment Methods page shows the custom name, not the account name |
| E-03 | Create account marked "Savings" | Account card shows the "Savings" badge |
| E-04 | Create a "Liability" type account | Account card shows type "Liability"; icon switches to credit-card style |
| E-05 | Edit an existing account's name and balance | Card updates in place with new name and new opening balance; "Payment Method Name" field is not shown during edit |
| E-06 | Archive an active account | Account disappears from the active list and appears under "Archived Accounts" |
| E-07 | Restore an archived account | Account moves back into the active list; its previously-archived default payment method remains usable |
| E-08 | Delete an archived account with no transactions | Account row disappears entirely from the archived list; its linked payment method also disappears from the Payment Methods page |
| E-09 | Attempt to delete an archived account referenced by a transaction | Inline error "This account is referenced by existing transactions. Archive it instead." appears under the row; account remains listed |
| E-10 | Attempt to delete an archived account whose linked method is used in a transaction | Inline error naming the in-use method(s) appears; account remains listed |
| E-11 | Attempt to delete an archived account referenced by a budget | Inline error "This account is referenced by a budget. Remove the budget first." appears; account remains listed |

### Payment Methods — Create, Edit, Archive, Restore, Delete, Reorder
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-12 | Create a new payment method linked to an existing account | New method card appears in the active list showing its name and linked account |
| E-13 | Attempt to save a new method with no display name | Inline "display name required" error shown; modal stays open |
| E-14 | Attempt to save a new method with no linked account selected | Inline "linked account required" error shown; modal stays open |
| E-15 | Edit a method's name and linked account | Card updates in place with new name and new linked-account label |
| E-16 | Archive an active method | Method disappears from the active list and appears under "Archived Methods" |
| E-17 | Restore an archived method | Method reappears in the active list |
| E-18 | Delete an archived, unused, non-last method | Method row disappears entirely |
| E-19 | Attempt to delete an archived method used in a transaction | Inline error "This method is used in existing transactions. Archive it instead." appears; method remains listed |
| E-20 | Attempt to delete the only active method linked to an account | Inline error about being the only active payment method appears; method remains listed |
| E-21 | Drag-reorder active methods, then reload the page | New order persists after reload (verifies `reorderMethods` write-through to storage) |

### Categories — Create, Edit, Archive, Restore, Delete, Reorder, Autocomplete
| ID | Scenario | Expected Outcome |
|---|---|---|
| E-22 | Create a new category under a chosen group | New category card appears under the correct group section with correct head/sub-head |
| E-23 | Create a category in a previously-empty group | New group section appears with its heading and the new category |
| E-24 | Attempt to save a category with empty head | Inline "head required" error shown; modal stays open |
| E-25 | Type a partial head that matches existing categories | Autocomplete dropdown appears below the input listing matching existing heads |
| E-26 | Click a suggestion from the autocomplete dropdown | Head input fills with the selected value and the dropdown closes |
| E-27 | Attempt to create a category with a head+sub-head pair that already exists | Inline "already exists" error shown; modal stays open, category not created |
| E-28 | Edit an existing category, keeping its head+sub-head unchanged, and save | Save succeeds (no false-positive duplicate error against itself) |
| E-29 | Edit a category's group | Category card moves from its old group section to the new group section |
| E-30 | Archive an active category | Category disappears from its group section and appears under "Archived Categories" |
| E-31 | Restore an archived category | Category reappears in its original group section |
| E-32 | Delete an archived category with no transactions or budgets | Category row disappears entirely |
| E-33 | Attempt to delete an archived category referenced by a transaction | Inline error "This category is referenced by existing transactions." appears; category remains listed |
| E-34 | Attempt to delete an archived category referenced by a budget | Inline error "This category has a budget assigned. Remove the budget first." appears; category remains listed |
| E-35 | Drag-reorder categories within one group, then reload the page | New order within that group persists after reload; categories in other groups are unaffected |
