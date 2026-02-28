

## Server-Side Search with Click-to-Search Across the Entire System

### Overview

Two fundamental changes system-wide:
1. Replace all auto-search/debounce patterns with a **click-to-search** UX (user types, clicks Search button or presses Enter, then results load)
2. Move all **client-side search and filtering to server-side** queries where possible

---

### 1. Reusable SearchBar Component

Create `src/components/shared/SearchBar.tsx` -- a standardized search input used across all pages:
- Text input + Search button (icon button beside the input)
- Pressing Enter also triggers search
- Clear button (X) to reset and immediately re-fetch with empty search
- Optional `placeholder` and `isLoading` props
- Controlled: parent passes `onSearch(value: string)` callback
- Does NOT auto-search on typing; only fires on button click or Enter

---

### 2. Page-by-Page Changes

#### A. Students Page (`StudentFilters.tsx`)
- Replace the debounced search input with the new `SearchBar` component
- Remove the 500ms debounce timer and "min 3 chars" logic
- Search triggers on button click / Enter, updating `filters.search` immediately
- All advanced text filters (class, city, state, area, PIN, academic year) also switch to explicit apply: add an "Apply Filters" button in the advanced section instead of individual debounce timers
- Remove all 6 debounce `useEffect` hooks for text inputs

#### B. Courses Page (`Courses.tsx` + `useCourses.ts`)
- Replace the inline search `<Input>` with `SearchBar`
- Hook already does server-side search -- no hook changes needed
- Search state updates only on click/Enter

#### C. Batches Page (`Batches.tsx` + `useBatches.ts`)
- Replace inline search `<Input>` with `SearchBar`
- Hook already does server-side search -- no hook changes needed

#### D. Employees Page (`Employees.tsx`)
- Replace inline search `<Input>` with `SearchBar`
- Hook already does server-side search/filter/pagination -- no hook changes needed

#### E. Products Page (`Products.tsx` + `useProducts.ts`)
- Replace inline search `<Input>` with `SearchBar`
- **Hook change**: `useProducts` already accepts `search` filter and does server-side ilike -- verify it works, just need to wire it up properly instead of the client-side `.filter()` in the page
- Remove the in-memory `products` filter memo; pass search/status/category to the hook directly
- Update `useProducts` to also accept category filter server-side (add `.eq("category", category)` when not "all")

#### F. Revenue Page (`Revenue.tsx` + `useRevenues.ts`)
- Replace inline search `<Input>` with `SearchBar`
- **Hook change**: Update `useRevenues()` to accept `{ search, sourceFilter }` params
  - Server-side search: `.or("description.ilike.%search%")` on the revenues query
  - Server-side source filter: `.eq("source_id", sourceId)` when not "all"
- Remove the client-side `searchedRevenues` and `filteredBySource` memos
- Remove the debounce `useEffect`

#### G. Expenses Page (`Expenses.tsx` + `useExpenses.ts`)
- Replace inline search `<Input>` with `SearchBar`
- **Hook change**: Update `useExpenses()` to accept `{ search, accountFilter }` params
  - Server-side search: `.or("description.ilike.%search%")` on expenses query
  - Server-side account filter: `.eq("expense_account_id", accountId)` when not "all"
- Remove client-side search/filter memos
- Remove the debounce `useEffect`

#### H. BatchDetail Page (`BatchDetail.tsx`)
- Replace the student search input with `SearchBar`
- Student filtering within a batch is inherently client-side (students are already loaded for analytics), so this stays client-side but uses click-to-search UX

#### I. CategoryProducts Page (`CategoryProducts.tsx`)
- Replace inline search with `SearchBar`
- Products within a category are already loaded client-side, use click-to-search UX

#### J. AuditLog Page (`AuditLog.tsx`)
- Replace inline search with `SearchBar`
- Audit logs are fetched via hook; if hook supports server-side search, wire it up; otherwise click-to-search on client-side filtered data

---

### 3. Hook Updates Summary

| Hook | Current | Change |
|---|---|---|
| `useStudents` | Server-side search/filter/pagination | No change needed |
| `useCourses` | Server-side search + status | No change needed |
| `useBatches` | Server-side search + status | No change needed |
| `useEmployees` | Server-side everything | No change needed |
| `useProducts` | Server-side search exists but page uses client-side | Wire page to use hook filters; add category filter to hook |
| `useRevenues` | No search/filter params | Add search + source_id filter params |
| `useExpenses` | No search/filter params | Add search + account_id filter params |

---

### 4. Technical Details

**Files to create:**
1. `src/components/shared/SearchBar.tsx` -- Reusable search input + button component

**Files to modify:**
1. `src/components/students/StudentFilters.tsx` -- Replace debounce with SearchBar + Apply button
2. `src/pages/Courses.tsx` -- Use SearchBar
3. `src/pages/Batches.tsx` -- Use SearchBar
4. `src/pages/Employees.tsx` -- Use SearchBar
5. `src/pages/Products.tsx` -- Use SearchBar, wire server-side filters
6. `src/hooks/useProducts.ts` -- Add category server-side filter
7. `src/pages/Revenue.tsx` -- Use SearchBar, remove client-side search
8. `src/hooks/useRevenues.ts` -- Add search + source filter params
9. `src/pages/Expenses.tsx` -- Use SearchBar, remove client-side search
10. `src/hooks/useExpenses.ts` -- Add search + account filter params
11. `src/pages/BatchDetail.tsx` -- Use SearchBar
12. `src/pages/CategoryProducts.tsx` -- Use SearchBar
13. `src/pages/AuditLog.tsx` -- Use SearchBar

**No database changes required** -- all changes are frontend query parameter wiring.

---

### 5. SearchBar Component Design

```text
+------------------------------------------+----------+
| Search students, batches...       [X]    | [Search] |
+------------------------------------------+----------+
```

- Input field with placeholder text
- X button appears when text is present (clears and triggers empty search)
- Search button with Search icon triggers the search
- Enter key in input also triggers search
- Optional loading spinner on the Search button while query is fetching

