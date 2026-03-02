

# Fix: Payment History Date Column Should Show `created_at` Instead of `payment_date`

## Problem

The Payment History table's Date column currently displays `payment_date` (which is the due date set during schedule generation). The user wants it to show `created_at` -- the actual timestamp when the payment record was created/recorded.

## Current State

- `src/pages/StudentDetail.tsx` line 656: displays `p.payment_date`
- Lines 145-152: sorting also uses `payment_date`

## Changes

### 1. `src/pages/StudentDetail.tsx` -- Display and sort by `created_at`

- **Line 656**: Change `p.payment_date` to `p.created_at` for the Date column display
- **Lines 147-151**: Update all sorting references from `payment_date` to `created_at`
- **Line 715**: Update the payment notes timeline sorting from `payment_date` to `created_at`

## Technical Details

- The `student_payments` table has a `created_at` column (timestamp with time zone, default `now()`)
- The `StudentPayment` interface in `useStudentPayments.ts` already includes `created_at: string`
- No database changes needed

## Testing Checklist

| # | Test | Expected Result | Pass |
|---|------|----------------|------|
| 1 | View Payment History on a student detail page | Date column shows the record creation date, not the due date | -- |
| 2 | Sort by Date Newest / Date Oldest | Payments sort by `created_at` | -- |

## Files Modified

- `src/pages/StudentDetail.tsx`

