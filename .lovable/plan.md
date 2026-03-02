
# Business Logic Fixes -- Implementation Plan

This plan addresses all 25 issues from the approved audit, grouped into phases by priority.

---

## Phase 1: Critical Fixes (8 issues)

### 1.1 Graduated students don't complete enrollments
**File:** `src/components/students/profile/QuickActionsPanel.tsx`
- In `handleStatusConfirm` (line 94), add a branch for `graduated` status
- When status is `graduated`, update active `batch_enrollments` to `status: "completed"` (not "inactive") and clear `batch_id`
- Currently only `inactive`/`dropout` trigger enrollment changes

### 1.2 Double payment for same month not blocked
**File:** `src/hooks/useStudentPayments.ts`
- In `useCreateStudentPayment` mutationFn (line 88), before the existing unpaid/partial row check, add a query for rows with `status = "paid"` matching the selected `months_covered`
- If any paid rows are found, throw an error: "Payment already recorded for [month]. Cannot record duplicate payment."

### 1.3 Batch transfer deletes enrollment instead of archiving
**File:** `src/utils/enrollmentSync.ts`
- In `syncBatchEnrollment` (line 26-34), change the `.delete()` to `.update({ status: "transferred" })` for old enrollments
- This preserves payment history linkage since `student_payments.batch_enrollment_id` still points to a valid record

### 1.4 Manual batch completion doesn't complete enrollments
**File:** `src/hooks/useBatches.ts`
- In `useUpdateBatch` `onSuccess` callback (line 144), check if the updated batch status is `"completed"`
- If so, run an additional update: set all `batch_enrollments` with `status = "active"` and matching `batch_id` to `status = "completed"`

### 1.5 Deleting revenue doesn't revert payment status (ghost payments)
**File:** `src/hooks/useRevenues.ts`
- In `useDeleteRevenue` mutationFn (line 180), before deleting the revenue record:
  - Query the revenue to get `student_payment_id`
  - If `student_payment_id` is not null, update the linked `student_payments` row to `status = "unpaid"` and `amount = 0`
- This prevents ghost payments where a student appears paid but no revenue exists

### 1.6 Duplicate month salary not blocked
**File:** `src/hooks/useEmployees.ts`
- In `useCreateSalaryPayment` mutationFn (line 256), before inserting:
  - Query `employee_salary_payments` for existing rows with same `employee_id` and `month`
  - If found, throw error: "Salary for [month] has already been recorded for this employee."

### 1.7 Last admin can be removed/demoted
**File:** `src/pages/CompanyMembers.tsx`
- In `removeMemberMutation` (line 153), before deleting:
  - Query count of members with `role = "admin"` for the company
  - If count is 1 and the member being removed is an admin, throw error
- In `updateMemberMutation` (line 137), when role is being changed FROM admin:
  - Same admin count check; block if last admin

### 1.8 Audit logs are deletable -- make immutable
**File:** `src/pages/AuditLog.tsx`
- Remove the bulk delete UI (delete button, selection checkboxes, delete dialog) from the audit log page
- Remove the `handleBulkDelete` function and related state
- **Database migration:** Remove the DELETE RLS policy on `audit_logs` table to make it append-only at the database level

---

## Phase 2: Important Fixes (12 issues)

### 2.1 Dropout students' future payments not cancelled
**File:** `src/components/students/profile/QuickActionsPanel.tsx`
- In `handleStatusConfirm`, after setting enrollments to inactive for dropout/inactive:
  - Update `student_payments` where `student_id` matches, `status = "unpaid"`, and `due_date > current date` to `status = "cancelled"`

### 2.2 enrollmentSync doesn't check batch status
**File:** `src/utils/enrollmentSync.ts`
- In `syncBatchEnrollment`, before creating a new enrollment (line 37):
  - Fetch the batch's status
  - If status is `"completed"`, log a warning and skip enrollment creation
  - This closes the second enrollment path (StudentDialog/Add Student) that bypasses BatchEnrollDialog's check

### 2.3 Payment schedule uses batch fee, not student custom fee
**File:** `src/utils/enrollmentSync.ts`
- In `generatePaymentSchedule` (line 147), after fetching the batch:
  - Also fetch the student's `monthly_fee_amount`
  - Use `student.monthly_fee_amount > 0 ? student.monthly_fee_amount : batch.default_monthly_fee` for the monthly fee

### 2.4 Overpayment warning
**File:** `src/hooks/useStudentPayments.ts`
- In the unpaid row update logic (line 108-133), after calculating `rowPayment`:
  - If `rowPayment > originalDue`, log a warning but still proceed (soft warning, not a block)
  - The toast notification should mention "Overpayment of X recorded"

### 2.5 Multi-month payment waterfall distribution
**File:** `src/hooks/useStudentPayments.ts`
- Replace the equal-distribution logic (line 112) with waterfall:
  - Sort matching unpaid rows by `due_date` ascending
  - For each row: apply min(remaining amount, row's scheduled amount), mark paid/partial accordingly
  - Reduce remaining amount until 0

### 2.6 Batch extension doesn't generate new payment rows
**File:** `src/hooks/useBatches.ts`
- In `useUpdateBatch`, in the `onSuccess` handler:
  - If `course_duration_months` increased, show a toast warning: "Batch duration extended. Existing students may need updated payment schedules."
  - This is a warning-only approach for now; auto-generation of rows would require comparing old vs new duration

### 2.7 Product sale revenue ignores payment_status
**Database migration:** Update or create a trigger on `product_sales` that only creates a revenue entry when `payment_status = 'paid'`. Add a second trigger for UPDATE that creates revenue when status changes to 'paid'.

### 2.8 Financial consistency results not surfaced
**File:** `src/components/dashboard/DashboardStats.tsx` (or new component)
- Add a warning banner on the dashboard if the last consistency check found mismatches
- Query the results from the auto-complete cron's output or store them in a new `system_health_checks` table

### 2.9 Student-level dropout affects all enrollments
**File:** `src/components/students/profile/QuickActionsPanel.tsx`
- Add a confirmation dialog enhancement: when setting student to dropout and they have multiple active enrollments, warn that ALL enrollments will be deactivated
- Suggest using "Remove from Batch" for per-enrollment removal instead

### 2.10 Salary before join date not validated
**File:** `src/hooks/useEmployees.ts`
- In `useCreateSalaryPayment`, before inserting:
  - Fetch the employee's `join_date`
  - If `payment.month < format(join_date, "yyyy-MM")`, throw error with message

### 2.11 Terminated employee salary not blocked
**File:** `src/hooks/useEmployees.ts`
- In `useCreateSalaryPayment`, before inserting:
  - Fetch the employee's `employment_status`
  - If status is `"terminated"`, show a warning toast but still allow (soft block)

### 2.12 Revenue/expense source deletion with linked entries
**File:** `src/hooks/useRevenueSources.ts` and `src/hooks/useExpenseAccounts.ts`
- In the delete mutation, before deleting:
  - Check if any revenues/expenses reference this source
  - If yes, block deletion with error: "Cannot delete source with linked entries. Archive it instead."

---

## Phase 3: Minor Fixes (5 issues)

### 3.1 Payment before enrollment date warning
**File:** `src/components/dialogs/StudentPaymentDialog.tsx`
- Add soft warning when `payment_date < student.enrollment_date`

### 3.2 Batch fee change propagation option
**File:** `src/pages/BatchDetail.tsx`
- After saving batch fee change, offer toast action to "Update unpaid rows to new fee"

### 3.3 Zero-price product sale allowed
**File:** `src/components/dialogs/ProductSaleDialog.tsx`
- Change `unitPrice > 0` to `unitPrice >= 0` in canSubmit check

### 3.4 Timezone-based current month
**File:** `src/hooks/useStudentPayments.ts`
- In `computeStudentSummary`, use company timezone for currentMonth instead of local browser time

### 3.5 Past batch start date warning
**File:** `src/components/dialogs/BatchDialog.tsx`
- Show info banner when start_date is in the past

---

## Database Migration Required

A single migration for:
1. Remove DELETE RLS policy on `audit_logs` (Issue 1.8)
2. Add/update trigger on `product_sales` to only create revenue when `payment_status = 'paid'` (Issue 2.7)

```sql
-- 1. Make audit logs immutable
DROP POLICY IF EXISTS "Only cipher users can delete audit logs" ON audit_logs;

-- 2. Product sale revenue trigger update (check if existing trigger needs modification)
-- Will verify exact trigger name and update condition to check payment_status
```

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/students/profile/QuickActionsPanel.tsx` | Graduated enrollment completion, dropout payment cancellation, multi-enrollment warning |
| `src/hooks/useStudentPayments.ts` | Double payment block, waterfall distribution, overpayment warning |
| `src/utils/enrollmentSync.ts` | Archive instead of delete, batch status check, custom fee usage |
| `src/hooks/useBatches.ts` | Manual completion syncs enrollments, extension warning |
| `src/hooks/useRevenues.ts` | Revenue deletion reverts payment status |
| `src/hooks/useEmployees.ts` | Duplicate salary block, join date validation, terminated warning |
| `src/pages/CompanyMembers.tsx` | Last admin protection |
| `src/pages/AuditLog.tsx` | Remove delete UI |
| `src/hooks/useRevenueSources.ts` | Block deletion with linked entries |
| `src/hooks/useExpenseAccounts.ts` | Block deletion with linked entries |
| `src/components/dialogs/StudentPaymentDialog.tsx` | Pre-enrollment payment warning |
| `src/components/dialogs/ProductSaleDialog.tsx` | Allow zero-price sales |
| `src/components/dialogs/BatchDialog.tsx` | Past start date warning |
| Database migration | Remove audit delete policy, fix product sale trigger |

Total: ~14 files modified, 1 database migration
