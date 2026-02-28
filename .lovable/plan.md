

## Minor Fixes and Unlinked Payments Section

### Overview
Four targeted improvements based on audit recommendations: standardize financial calculations, add delete-payment warning, add inactive-student warning for product sales, and create a dedicated "Unlinked Payments" section in the Course Payments tab.

---

### Fix A: Standardize FinancialBreakdown vs Banner calculations

**Problem:** The `FinancialSummaryTab` (inside `FinancialBreakdown`) calculates `totalCourseFee` by summing ALL payment row amounts (including unpaid schedule rows), while the `LifetimeValueBanner` uses batch defaults for its denominator. These can diverge.

**Solution:** Standardize both to use **actual payment row amounts** as the source of truth:
- In `FinancialBreakdown.tsx` (lines 227-254): The summary already uses payment rows -- this is correct. No change needed here.
- In `LifetimeValueBanner.tsx` / `computeLifetimeMetrics`: Update the "Total Invoiced" display concept. The Banner's Payment Rate already uses `totalExpected` (passed from `StudentDetail` which comes from `computeStudentSummary`). To ensure consistency, pass `totalExpected` from the profile page using the same `computeStudentSummary` logic that `StudentDetail` uses. Currently `totalExpected` is already passed -- verify it matches.
- **Action**: In `FinancialBreakdown.tsx`, fetch total expected from all enrollment payment rows (sum of `amount` column) and pass it as context so the Summary tab shows the same denominator the Banner uses. This means the Summary tab's "Total Invoiced" = sum of all payment row amounts (schedule + paid), which is already what it does. **No code change needed** -- both already use payment rows as source of truth. The Banner's Payment Rate uses batch defaults only as a fallback when `totalExpected` is not provided.

**Verdict**: After review, both are already consistent when `totalExpected` is passed. Mark as verified/no-op.

---

### Fix B: Sole payment deletion warning

**Problem:** When deleting the only payment for an enrollment, there's no special warning.

**Changes:**
- **`src/pages/StudentDetail.tsx`** (delete confirmation dialog, lines 803-817):
  - When `deletePaymentId` is set, check if this is the only paid payment for its `batch_enrollment_id`
  - If sole payment: show enhanced warning text: "This is the only payment recorded for this enrollment. Deleting it will mark the month as fully unpaid."
  - Keep as a warning only (not a hard block)

---

### Fix C: Product sales to inactive students warning

**Problem:** Product sales can be recorded for inactive students without any warning.

**Changes:**
- **`src/components/dialogs/ProductSaleDialog.tsx`**:
  - Add an `AlertDialog` confirmation (same pattern as Fix 4 in StudentPaymentDialog)
  - When a student is selected and their status is not 'active', show warning: "This student is currently [status]. Continue recording sale?"
  - Need to check the selected student's status from the `students` array
  - Add `AlertDialog` imports and state management for the warning flow

---

### Fix D: Unlinked Payments section in Course Payments tab

**Problem:** 8 legacy payments have `batch_enrollment_id = null` and show as "Unlinked (pre-tracking)" mixed into the main table.

**Changes:**

1. **`src/components/students/profile/FinancialBreakdown.tsx`** (lines 183-206):
   - Add `batch_enrollment_id` to the `CoursePaymentRow` interface and pass it through
   - Track which payments are unlinked (`batch_enrollment_id === null` AND multi-enrollment student)

2. **`src/components/students/profile/CoursePaymentsTab.tsx`**:
   - Add `batch_enrollment_id` to the `CoursePaymentRow` interface (optional, nullable)
   - Split `payments` into two arrays: `linkedPayments` and `unlinkedPayments`
   - Render the main table with `linkedPayments` only
   - Below the main table, if `unlinkedPayments.length > 0`, render:
     - A yellow warning banner with AlertTriangle icon: "The following payments were recorded before the enrollment tracking system was introduced. They are preserved as historical records and have not been automatically assigned to any batch."
     - A separate, simpler table showing the unlinked payments with columns: Due Date, Amount, Status, Payment Date, Method, Recorded By
   - Pagination applies only to the main linked table

3. **`src/components/students/profile/CoursePaymentsTab.tsx`** interface update:
   ```
   export interface CoursePaymentRow {
     // ... existing fields
     batch_enrollment_id?: string | null;  // new
   }
   ```

---

### Technical Details

**Files to modify:**
1. `src/components/students/profile/CoursePaymentsTab.tsx` -- Add unlinked section, update interface
2. `src/components/students/profile/FinancialBreakdown.tsx` -- Pass `batch_enrollment_id` through to CoursePaymentRow
3. `src/pages/StudentDetail.tsx` -- Enhance delete confirmation with sole-payment warning
4. `src/components/dialogs/ProductSaleDialog.tsx` -- Add inactive student warning dialog

**No database changes required** -- all fixes are frontend-only.

