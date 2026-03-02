
# Business Logic Review -- Final Check Results

## Status: All 25 fixes implemented. 2 issues found, 1 minor optimization noted.

---

## Issue 1 (Bug): Revenue deletion sets payment amount to 0

**File:** `src/hooks/useRevenues.ts`, line 191

When a revenue entry is deleted, the linked `student_payment` is reverted to `status: "unpaid"` but `amount` is set to **0**. This destroys the original scheduled payment amount. If the payment was a scheduled row (e.g., monthly fee of 5000), it becomes a 0-amount row, and the student's overdue/pending calculations will show 0 instead of the original fee.

**Additionally**, there is a trigger conflict: updating the `student_payments` row to `status: "unpaid"` triggers `sync_student_payment_revenue`, which (seeing a transition FROM paid TO not-paid) also deletes the revenue. Then line 195 tries to delete the same revenue again -- this is a double-delete. It doesn't error but it means the explicit deletion is redundant.

**Fix:** Remove `amount: 0` from the update. The trigger already handles revenue cleanup when status changes from "paid" to "unpaid", so the explicit delete on line 195 can be wrapped in a try-catch or removed (the trigger already did it). The payment should keep its original amount so it shows as the correct "due" amount.

```typescript
// Change from:
.update({ status: "unpaid", amount: 0 } as any)
// To:
.update({ status: "unpaid" } as any)
```

---

## Issue 2 (Minor redundancy): Duplicate enrollment completion

**File:** `src/hooks/useBatches.ts`, lines 146-153

The `onSuccess` handler completes enrollments when a batch is marked "completed". However, the database trigger `sync_enrollments_on_batch_completion` already does this exact work. The hook's update is redundant (second update matches 0 rows since the trigger already ran).

**Fix:** Remove the enrollment update from `onSuccess` and keep only the query invalidation. The trigger is the correct single source of truth.

```typescript
onSuccess: async (data: Batch, variables) => {
  if (data.status === "completed") {
    // Trigger already handles enrollment completion
    queryClient.invalidateQueries({ queryKey: ["batch_enrollments"] });
  }
  // ...rest unchanged
}
```

---

## Verified Correct (no issues found)

| Fix | Status | Verification |
|-----|--------|-------------|
| 1.1 Graduated enrollments | OK | Correctly sets enrollments to "completed" and clears batch_id |
| 1.2 Double payment block | OK | Checks paid rows before processing; throws descriptive error |
| 1.3 Batch transfer delete | OK | Cancels future unpaid payments, then deletes enrollment (reverted correctly) |
| 1.6 Duplicate salary block | OK | Checks existing salary for same employee+month before inserting |
| 1.7 Last admin protection | OK | Checks admin count in both update and remove mutations |
| 1.8 Audit log immutability | OK | Delete UI removed; DELETE RLS policy dropped via migration |
| 2.1 Dropout payment cancellation | OK | Sets future unpaid to "cancelled"; reactivation reverses it |
| 2.2 Completed batch enrollment block | OK | enrollmentSync checks batch status before creating enrollment |
| 2.3 Student custom fee priority | OK | generatePaymentSchedule uses student fee over batch default |
| 2.4 Overpayment warning | OK | Console warning logged during waterfall distribution |
| 2.5 Waterfall distribution | OK | Sorts by due_date, fills earliest first |
| 2.6 Batch extension warning | OK | Invalidates queries; component handles toast |
| 2.10 Salary before join date | OK | Compares payment month to employee join month |
| 2.11 Terminated employee warning | OK | Console warning, still allows recording |
| 2.12 Source/account deletion guard | OK | Both useDeleteExpenseAccount and useDeleteRevenueSource check linked entries |
| 3.1 Pre-enrollment payment warning | OK | Yellow banner in StudentPaymentDialog |
| 3.2 Batch fee propagation | OK | Toast with "Update" action button in BatchDetail |
| 3.3 Zero-price sales | OK | canSubmit allows unitPrice >= 0 |
| 3.4 Timezone-based month | OK | computeStudentSummary accepts optional companyTimezone |
| 3.5 Past start date warning | OK | Info banner in BatchDialog |
| Cancelled payment filtering | OK | computeStudentSummary filters at line 345; FinancialBreakdown filters at line 230; CoursePaymentsTab shows with strikethrough+grey badge |

---

## Summary

Two fixes needed:
1. **useRevenues.ts** -- Remove `amount: 0` from payment revert to preserve scheduled amount
2. **useBatches.ts** -- Remove redundant enrollment completion (trigger handles it)

Everything else is correct and consistent across the codebase.
