

# Fix: Enrollment Fails Due to Cross-Batch Payment Validation

## Problem

The `validate_student_payment_amount` database trigger blocks payment schedule generation when enrolling a student into a second batch. The trigger checks admission/monthly overpayment across **all** batches globally, so existing payments from Batch-1 cause "Overpayment: admission fee exceeded" when creating unpaid schedule rows for Batch-2.

DB error: `Overpayment: admission fee exceeded. Maximum allowed: 0. Already paid: 2500.`

## Root Cause

The trigger (`validate_student_payment_amount`) has two issues:
1. It validates **unpaid schedule rows** -- these are just placeholders and should be skipped
2. It sums admission payments across **all** batch enrollments instead of scoping to the current enrollment

## Solution

Modify the `validate_student_payment_amount` trigger to **skip validation entirely when the payment status is 'unpaid'**. Schedule rows (status = 'unpaid') are auto-generated placeholders, not actual payments. Validation should only apply when a payment is being recorded (status = 'paid' or 'partial').

## Changes

### 1. Database migration -- Update `validate_student_payment_amount` function

Add an early return at the top of the function:

```sql
-- Skip validation for unpaid schedule rows (auto-generated placeholders)
IF NEW.status = 'unpaid' THEN
  RETURN NEW;
END IF;
```

Additionally, scope the admission overpayment check to the same `batch_enrollment_id` (when present), so payments from one batch don't interfere with another batch's limits:

```sql
-- When checking admission totals, scope to the same enrollment
AND (NEW.batch_enrollment_id IS NULL 
     OR batch_enrollment_id = NEW.batch_enrollment_id)
```

Same scoping for the monthly fee check.

## Technical Details

- **Security**: No RLS changes needed. The trigger remains SECURITY DEFINER.
- **Edge cases**: If `batch_enrollment_id` is NULL (legacy payments without enrollment), validation falls back to global scope -- preserving backward compatibility.
- **No code changes**: Only a single database migration is needed.

## Testing Checklist

| # | Test | Expected Result | Pass |
|---|------|----------------|------|
| 1 | Enroll student (with existing Batch-1 payments) into Batch-2 | Enrollment succeeds, schedule rows created | -- |
| 2 | Record an actual overpayment on a batch | Trigger still blocks the overpayment | -- |
| 3 | Enroll a fresh student into a batch | Schedule generated normally | -- |

## Files Modified

- New migration SQL file (database trigger update only)

## Rollback Notes

Revert the migration by restoring the original `validate_student_payment_amount` function body (remove the `IF NEW.status = 'unpaid'` early return and the `batch_enrollment_id` scoping).
