

## Fix: Students Incorrectly Showing as "Paid" After Enrollment

### Root Cause
The `computeStudentSummary` function in `src/hooks/useStudentPayments.ts` filters out only `cancelled` payments (line 345), but treats everything else -- including `unpaid` schedule rows -- as actual paid money. This means the auto-generated payment schedule (admission + monthly rows with `status: "unpaid"`) gets summed into `admissionPaid`, `totalPaid`, and `monthPaymentTotals`, making every newly enrolled student appear fully paid.

### Fix (single file change)

**File: `src/hooks/useStudentPayments.ts`**

Update `computeStudentSummary` to only count payments with `status = 'paid'` or `status = 'partial'` as actual money received:

1. **Line 345** - Keep filtering out cancelled, but also distinguish "paid/partial" from "unpaid" payments:
   - `activePayments` stays as non-cancelled (for determining which months exist)
   - Add a new `paidPayments` filter: payments where `status === 'paid' || status === 'partial'`

2. **Line 347** - `admissionPaid`: sum only from `paidPayments` (not all active)

3. **Lines 393-399** - `monthPaymentTotals`: only sum amounts from payments that are actually paid/partial

4. **Line 435** - `totalPaid`: sum only from `paidPayments`

5. **Line 436** - `monthlyPaidTotal`: sum only from paid/partial monthly payments

### Technical Details

```text
Before (broken):
  activePayments = payments.filter(p => p.status !== "cancelled")
  admissionPaid = admissionPayments.reduce(sum amounts)  // includes unpaid!
  totalPaid = activePayments.reduce(sum amounts)          // includes unpaid!

After (fixed):
  activePayments = payments.filter(p => p.status !== "cancelled")
  paidPayments = activePayments.filter(p => p.status === "paid" || p.status === "partial")
  admissionPaid = paidAdmissionPayments.reduce(sum amounts)  // only real payments
  totalPaid = paidPayments.reduce(sum amounts)               // only real payments
  monthPaymentTotals uses only paid/partial monthly payments
```

This is a single-file fix with no database changes needed. The payment schedule rows will correctly remain as "unpaid/pending" in the UI until an actual payment is recorded.

