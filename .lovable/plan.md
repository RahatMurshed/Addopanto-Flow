

# Fix P0: Revenue Inflation Bug

## Problem
The `sync_student_payment_revenue` trigger creates a revenue record for **every** student payment insert/update, regardless of payment status. This means "unpaid" and "partial" payments generate phantom revenue, inflating dashboard totals.

## Root Cause
The trigger function `sync_student_payment_revenue()` has no conditional check on `NEW.status`. It blindly inserts/updates revenue on every `INSERT` or `UPDATE` operation.

## Fix Strategy
Modify the trigger function to be **status-aware**:

| Payment Status | Action on INSERT | Action on UPDATE |
|---|---|---|
| `paid` | Create revenue + allocations | Update revenue (or create if transitioning to paid) |
| `unpaid` / `partial` | Do nothing | Delete existing revenue + allocations (if transitioning away from paid) |

## Technical Changes

**Single database migration** that replaces the `sync_student_payment_revenue()` function with updated logic:

1. **INSERT**: Only create revenue and allocations when `NEW.status = 'paid'`
2. **UPDATE**:
   - If status changed **to** `paid`: Insert new revenue + allocations (same as INSERT path)
   - If status changed **from** `paid` to something else: Delete existing revenue and allocations
   - If status remains `paid` but amount/date/source changed: Update revenue and recalculate allocations (existing behavior)
   - If status is not `paid` and wasn't `paid`: Do nothing
3. **DELETE**: Already handled (returns OLD, cascade handles cleanup)

**Data cleanup**: Delete all existing revenue records linked to non-paid student payments to fix the current inflated state:
```sql
DELETE FROM revenues
WHERE student_payment_id IN (
  SELECT id FROM student_payments WHERE status != 'paid'
)
AND is_system_generated = true;
```

## Impact
- Dashboard totals will drop to reflect only actual paid revenue
- Existing "paid" payment revenues remain untouched
- Future unpaid/partial payments will no longer inflate financials
- No frontend code changes needed

