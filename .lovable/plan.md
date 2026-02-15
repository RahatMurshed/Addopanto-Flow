
## Add Advanced Filter and Search to All List Sections

### Summary
Add consistent search, filter, and sort controls to 5 pages: Revenue history, Expense history, StudentDetail payment history, Batches table, and BatchDetail students table. All filtering is client-side on already-loaded data.

---

### 1. Revenue Page (`src/pages/Revenue.tsx`)

**Current state**: Has date filter and pagination but no search/source filter/sort on the history table.

**Add to the Revenue History Card header (between CardTitle and table):**
- Debounced text search input (filters by description, 300ms delay)
- Source dropdown filter (populated from `sources` array): All Sources, then each source name
- Sort dropdown: Date Newest, Date Oldest, Amount High-Low, Amount Low-High
- Reset button with active filter count badge
- Results count text when filtered

**Logic changes:**
- Add state: `searchQuery`, `sourceFilter`, `sortBy`
- Add `searchedRevenues` memo that applies search + source filter + sort on top of `filteredRevenues`, then pass to `usePagination` instead of `filteredRevenues`
- Reset pagination on filter change

---

### 2. Expenses Page (`src/pages/Expenses.tsx`)

**Current state**: Has date filter and pagination but no search/account filter/sort on the history table.

**Add to the Expense History Card header:**
- Debounced text search input (filters by description)
- Account/source dropdown filter (populated from `accounts` array): All Sources, then each account name
- Sort dropdown: Date Newest, Date Oldest, Amount High-Low, Amount Low-High
- Reset button with active filter count badge
- Results count when filtered

**Logic changes:**
- Same pattern as Revenue: `searchQuery`, `accountFilter`, `sortBy` state
- `searchedExpenses` memo applied before pagination

---

### 3. StudentDetail Payment History (`src/pages/StudentDetail.tsx`)

**Current state**: No search, no filters, no pagination on payment history table. Shows all payments.

**Add filter bar above the payment history table:**
- Debounced text search (description, receipt number)
- Type filter dropdown: All / Admission / Monthly
- Method filter dropdown: All / Cash / Bank Transfer / Mobile Banking / Other
- Sort dropdown: Date Newest, Date Oldest, Amount High-Low, Amount Low-High
- Reset button
- Results count when filtered

**Logic changes:**
- Add state: `paymentSearch`, `typeFilter`, `methodFilter`, `paymentSort`
- Add `filteredPayments` memo that filters and sorts `payments`
- Add `usePagination(filteredPayments)` for paginated display
- Add `TablePagination` component below the table

---

### 4. Batches Page (`src/pages/Batches.tsx`)

**Current state**: Already has search input and status filter. Missing sort.

**Add sort dropdown next to the existing status filter:**
- Sort options: Name A-Z, Name Z-A, Newest First, Oldest First, Most Students, Fewest Students

**Logic changes:**
- Add `sortBy` state
- Apply sort to `batches` before passing to `usePagination`
- Since `useBatches` returns server-filtered data, sort is applied client-side via a `sortedBatches` memo

---

### 5. BatchDetail Students Table (`src/pages/BatchDetail.tsx`)

**Current state**: Has student name search. Missing status and payment status filters.

**Add filters next to existing search:**
- Status dropdown: All / Active / Inactive / Graduated
- Payment status dropdown: All / Paid / Pending / Overdue / Partial (based on computed `worstStatus`)
- Sort dropdown: Name A-Z, Name Z-A, Newest Enrolled, Most Pending

**Logic changes:**
- Add state: `studentStatusFilter`, `paymentStatusFilter`, `studentSort`
- Apply filters in `batchStudents` memo (status filter) and add a new `filteredBatchStudents` memo that also filters by payment status (requires computed summaries)
- Pass filtered list to pagination

---

### Technical Details

**Shared patterns across all pages:**
- Search uses debounced local state (300ms `setTimeout` in `useEffect`)
- Search input with `Search` icon left, `X` clear button right (matching `StudentFilters` pattern)
- Select dropdowns use Radix `Select` component with sentinel `"all"` value
- Sort dropdown uses `SlidersHorizontal` icon prefix
- Reset button appears only when filters are non-default, shows active count via `Badge`
- Results count text: "Showing X of Y [items]" when any filter is active
- `pagination.resetPage()` called in `useEffect` when any filter state changes

**Files to modify:**
- `src/pages/Revenue.tsx` -- add search, source filter, sort to history table
- `src/pages/Expenses.tsx` -- add search, account filter, sort to history table
- `src/pages/StudentDetail.tsx` -- add search, type/method filter, sort, pagination to payment history
- `src/pages/Batches.tsx` -- add sort dropdown to existing filter bar
- `src/pages/BatchDetail.tsx` -- add status filter, payment status filter, sort to student table

**No new components or database changes needed.** All filtering is client-side on existing data.
