

## Fix: Payment Trigger Counts Unpaid Schedule Rows as "Already Paid"

### Problem
When you try to record a real payment for a student, the system says "Overpayment: admission fee exceeded. Maximum allowed: 0. Already paid: 2500." This happens because the validation trigger counts the auto-generated unpaid schedule rows as if they were actual payments.

### Root Cause
The previous fix added an early return to skip validation when inserting `unpaid` rows. However, when inserting a real `paid` payment, the trigger's SUM queries use `status != 'cancelled'` -- which still includes `unpaid` rows in the "already paid" total.

For this student: the schedule has an unpaid admission row of 2,500. When you try to record an actual admission payment, the trigger sums that unpaid 2,500 and says "already paid: 2500", blocking the real payment.

### Fix
**Database migration** -- Update the `validate_student_payment_amount` function to exclude `unpaid` rows from the "already paid" totals:

1. **Admission check (line 39)**: Change `AND status != 'cancelled'` to `AND status NOT IN ('cancelled', 'unpaid')`
2. **Monthly check (line 58)**: Change `AND sp.status != 'cancelled'` to `AND sp.status NOT IN ('cancelled', 'unpaid')`

This ensures only actual payments (`paid`, `partial`) count toward the overpayment check, while schedule placeholders (`unpaid`) are ignored.

### Impact
- Recording real payments will work correctly
- Overpayment protection still applies (sums actual paid/partial payments)
- No code changes needed -- database-only fix
