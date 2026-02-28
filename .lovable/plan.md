
## Fix Student Page Filters (Monthly Paid, Admission Status, and Others)

### Root Cause Analysis

There are **3 interconnected bugs** causing the filters to malfunction:

---

### Bug 1: Client-side filters don't work with server-side pagination (Critical)

The `admissionStatus` and `monthlyStatus` filters are applied **client-side on the current page only** (lines 134-160 in `Students.tsx`). This fundamentally breaks with server-side pagination:

- User selects "Monthly Paid" -- only students on page 1 are checked
- Students matching "Monthly Paid" on pages 2-10 are never shown
- The pagination count still says "200 students" but the table shows fewer rows
- Changing pages doesn't help because each page is independently filtered

**Fix:** Move these filters to work across ALL students by filtering against `allStudents` + `allPayments` (which are already fetched), then paginate the filtered result client-side. This means:
- Compute summaries for ALL students (already done at line 115-122)
- Apply admission/monthly filters on the full `allStudents` list
- Client-side paginate the filtered result
- The server-side pagination continues to handle search, status, batch, and other DB-level filters
- When admission/monthly filters are active, switch to client-side pagination mode

### Bug 2: Students with no `billing_start_month` pass "Monthly Paid" filter incorrectly

In `computeStudentSummary`, if `billing_start_month` is null/empty, `allMonths` ends up empty. This makes all month arrays (overdue, pending, partial) empty. The "Monthly Paid" filter check (line 154) returns `true` for these students since there are no overdue/pending/partial months -- but they haven't actually paid anything.

**Fix:** In the monthly filter logic, add a check: if a student has a monthly fee > 0 but no billing_start_month set, treat them as "pending" (not "paid").

### Bug 3: `useStudentPayments()` hits 1000-row default limit

The `useStudentPayments()` hook (line 46-54) fetches ALL payments for the company without any `.limit()` or batched fetching. Supabase silently caps at 1000 rows. For companies with >1000 payment records, summaries become inaccurate and filters produce wrong results.

**Fix:** Add batched fetching (same pattern as `useAllStudents`) to `useStudentPayments` when fetching all payments (no `studentId` parameter).

---

### Technical Changes

**File: `src/pages/Students.tsx`**
- When `admissionStatus` or `monthlyStatus` filters are active, compute filtered students from `allStudents` + `allStudentSummaries` instead of just the current page
- Implement client-side pagination for the filtered result
- Update the pagination display to show correct counts
- When these filters are "all", use existing server-side pagination as-is

**File: `src/hooks/useStudentPayments.ts`**
- In `useStudentPayments()`, when no `studentId` is provided (fetching all), use batched fetching with `.range()` to handle >1000 payments
- Add the missing billing_start_month null check in the filter logic

**File: `src/pages/Students.tsx` (filter logic)**
- Fix the "Monthly Paid" filter: if student has `monthly_fee_amount > 0` but no `billing_start_month`, classify as "pending" not "paid"
- Fix the "Monthly Pending" filter: same null-check to avoid false negatives

---

### How it works after the fix

1. User selects "Monthly Paid" filter
2. System iterates ALL students (from `allStudents` cache), computes each summary
3. Filters to only students where all billed months are paid
4. Paginates the filtered list client-side
5. Shows correct count: "Showing 1-50 of 87 students"
6. Page navigation works correctly within the filtered set

Server-side filters (search, status, batch, gender, class, address) continue to work as before. The admission/monthly filters overlay on top.
