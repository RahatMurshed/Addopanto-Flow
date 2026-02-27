

# Fix: Outstanding Shows 0 in Financial Breakdown

## Root Cause

`totalInvoiced` is currently derived from the student's fee structure fields (`admission_fee_total`, `monthly_fee_amount`, `course_start_month`, `course_end_month`) rather than from actual payment rows. When `course_start_month` or `course_end_month` are null, `totalMonthlyMonths` = 0, and `totalInvoicedFromFees` collapses to just the admission fee or zero -- making Outstanding appear as 0.

Meanwhile, `totalPaid` sums only `status === "paid"` rows. Since all existing payment rows likely have `status = "paid"`, the two values end up equal.

## Fix

In `src/components/students/profile/FinancialBreakdown.tsx`, change the `summaryData` memo (lines 240-267) to:

- **totalInvoiced**: Sum the `amount` field of ALL `coursePayments` rows regardless of status
- **totalPaid**: Sum only rows where `status === "paid"`
- **Outstanding**: `totalInvoiced - totalPaid`

The `totalInvoicedFromFees` query (lines 100-119) and its return value (line 197) can be removed since they are no longer used.

### Specific changes in `summaryData` useMemo (lines 240-249):

```typescript
// BEFORE
const totalCourseFee = data?.totalInvoicedFromFees ?? 0;
const totalCoursePaid = coursePayments
  .filter((p) => p.status === "paid")
  .reduce((sum, p) => sum + p.amount, 0);
const totalCourseOutstanding = Math.max(0, totalCourseFee - totalCoursePaid);

// AFTER
const totalCourseFee = coursePayments.reduce((sum, p) => sum + p.amount, 0);
const totalCoursePaid = coursePayments
  .filter((p) => p.status === "paid")
  .reduce((sum, p) => sum + p.amount, 0);
const totalCourseOutstanding = Math.max(0, totalCourseFee - totalCoursePaid);
```

### Cleanup -- remove dead code:

- Lines 100-119: Remove the student fee structure query (`studentRow` fetch and `totalInvoicedFromFees` calculation)
- Line 197: Remove `totalInvoicedFromFees` from the return object

## Files Changed

- `src/components/students/profile/FinancialBreakdown.tsx` -- fix totalInvoiced calculation and remove unused fee-structure query

## What stays the same

- Payment fetching query (no status filter on the main query -- already correct)
- Course Payments tab, Product Purchases tab, revenue projection logic
- All other components untouched

