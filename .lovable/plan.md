
# Business Logic Audit Report

## 1. STUDENT LIFECYCLE LOGIC

### 1.1 Inactive student with active enrollments
- **Scenario:** Student is set to "inactive" or "dropout" via QuickActionsPanel
- **Current behavior:** Enrollments are set to "inactive" and `batch_id` is cleared. Overdue alerts stop because `computeStudentSummary` uses `course_end_month` to cap billing range. However, no future unpaid payment rows are cancelled or waived -- they remain as "unpaid" records in `student_payments`.
- **Expected behavior:** When a student is marked dropout, future unpaid payment schedule rows (months after the dropout date) should be cancelled/waived. Currently they sit orphaned in the database and could resurface if the student is reactivated.
- **Severity:** Important
- **Suggested fix:** On dropout/inactive transition, update future unpaid `student_payments` rows to status "cancelled" for months after the status change date.

### 1.2 Graduated student with active enrollments
- **Scenario:** Student is marked "graduated" via QuickActionsPanel
- **Current behavior:** The `graduated` status does NOT trigger any enrollment deactivation. Unlike `inactive`/`dropout` which set enrollments to "inactive" and clear `batch_id`, graduating a student leaves all active enrollments untouched.
- **Expected behavior:** Graduating should mark active enrollments as "completed" (not "inactive") and clear `batch_id`.
- **Severity:** Critical
- **Suggested fix:** In `QuickActionsPanel.handleStatusConfirm`, add a branch for `graduated` that sets active enrollments to `completed`.

### 1.3 Enrollment date after batch end date
- **Scenario:** Student is enrolled in a batch that already ended
- **Current behavior:** The `BatchEnrollDialog` now blocks enrollment into "completed" batches (recently fixed). However, `enrollmentSync.ts` (`syncBatchEnrollment`) does NOT check batch status -- it will happily create an enrollment into a completed batch when triggered from `StudentDialog` or the Add Student flow.
- **Expected behavior:** All enrollment paths should validate batch status.
- **Severity:** Critical
- **Suggested fix:** Add batch status check in `syncBatchEnrollment()` before creating a new enrollment.

### 1.4 Student with zero enrollments but payment records
- **Scenario:** Payments can be recorded via `StudentPaymentDialog` without selecting an enrollment (the `batch_enrollment_id` field is optional).
- **Current behavior:** Payments with `batch_enrollment_id = null` are valid. This happens when recording payments from the student detail page without any enrollment context.
- **Expected behavior:** This is acceptable for historical/manual payments. No issue.
- **Severity:** Minor (design choice, not a bug)

### 1.5 Duplicate students
- **Scenario:** Two students with same name, phone, AND father's name
- **Current behavior:** The system has duplicate detection (`useDuplicateDetection`) that warns during creation but does NOT block it. Duplicates can be created, then merged later via the `StudentDuplicates` page.
- **Expected behavior:** Current behavior is acceptable -- warning without blocking is the correct UX for educational institutions where genuine duplicates (e.g., siblings) exist.
- **Severity:** Minor (design choice)

---

## 2. PAYMENT & FEE LOGIC

### 2.1 Student custom fee vs batch default fee
- **Scenario:** Batch has default_monthly_fee of 2000, student has monthly_fee_amount of 1500
- **Current behavior:** Payment schedule generation in `enrollmentSync.ts` uses the BATCH default fee, not the student's custom fee. The student's `monthly_fee_amount` is only used in `computeStudentSummary` for display calculations. Changing the batch fee later does NOT update existing student fees.
- **Expected behavior:** Schedule generation should use the student's custom fee if set, falling back to batch default. This mismatch means unpaid schedule rows may have the wrong amount.
- **Severity:** Important
- **Suggested fix:** In `generatePaymentSchedule`, check student's `monthly_fee_amount` and use it if > 0, falling back to `batch.default_monthly_fee`.

### 2.2 Overpayment on a single month
- **Scenario:** Monthly fee is 2000, student pays 2500 for one month
- **Current behavior:** In `useCreateStudentPayment`, when updating an existing unpaid row, the entire payment amount is written to the row regardless of whether it exceeds the fee. The excess is NOT applied to the next month. In `computeStudentSummary`, if `paid >= fee` the month is marked "paid", but the excess is effectively lost in the summary calculations.
- **Expected behavior:** Overpayment should either be blocked with a warning, applied as advance payment, or clearly shown in the summary.
- **Severity:** Important
- **Suggested fix:** Add overpayment validation in the payment dialog. If overpayment is intentional, create an advance credit record or split across months.

### 2.3 Partial multi-month lump sum payment
- **Scenario:** 3 months due (1500 each = 4500 total), student pays 3750 (covers 2.5 months)
- **Current behavior:** In `useCreateStudentPayment`, payment amount is divided equally across `months_covered` (`rowPayment = paymentData.amount / paymentData.months_covered.length * (row.months_covered.length || 1)`). For 3 months at 3750, each gets 1250. Since 1250 < 1500, all three are marked "partial". This is mathematically correct but operationally odd -- the user likely intends 2 months fully paid and 1 partial.
- **Expected behavior:** The system should fill months in chronological order, marking each as paid until the remaining amount can only partially cover the next month.
- **Severity:** Important
- **Suggested fix:** Implement waterfall distribution: apply payment to earliest months first until fully paid, then partial for the remainder.

### 2.4 Zero-amount payment
- **Scenario:** Admin records a payment with amount = 0
- **Current behavior:** The `paymentSchema` in `StudentPaymentDialog` uses `z.number().positive()` which blocks amount = 0. This is correct.
- **Expected behavior:** Already handled.
- **Severity:** N/A (no issue)

### 2.5 Double payment for same month
- **Scenario:** Admin records January fee twice
- **Current behavior:** `useCreateStudentPayment` checks for existing unpaid/partial rows matching the months and UPDATES them rather than creating new rows. However, if the first payment already marked the month as "paid", a second payment creates a NEW row (since there's no "unpaid" row to match). This results in double-counting in `computeStudentSummary`.
- **Expected behavior:** Block recording payment for an already-paid month, or show a warning.
- **Severity:** Critical
- **Suggested fix:** In the payment dialog or mutation, check if any selected month already has a "paid" status row and warn/block.

### 2.6 Zero admission fee creates a payment row
- **Scenario:** Batch has admission_fee = 0 (waived)
- **Current behavior:** In `enrollmentSync.ts`, the condition `if (batch.default_admission_fee && Number(batch.default_admission_fee) > 0)` correctly skips creating a row when fee is 0. No issue.
- **Severity:** N/A (no issue)

### 2.7 Batch with 0 monthly fee and 0 admission fee
- **Scenario:** Both fees are 0
- **Current behavior:** No payment schedule rows are generated. `computeStudentSummary` will show 0 expected, 0 paid, effectively "fully paid". This is correct for free courses.
- **Severity:** N/A (no issue)

### 2.8 Payment before enrollment date
- **Scenario:** Payment date is set before the student's enrollment date
- **Current behavior:** No validation prevents this. The payment dialog allows any date.
- **Expected behavior:** Should warn (not block) when payment date is before enrollment date.
- **Severity:** Minor
- **Suggested fix:** Add a soft warning in `StudentPaymentDialog` when `payment_date < student.enrollment_date`.

### 2.9 Batch transfer mid-month payment handling
- **Scenario:** Student transfers from Batch A to Batch B in the middle of a month
- **Current behavior:** `syncBatchEnrollment` DELETES the old enrollment entirely (only "active" status). Payment schedule rows linked to the old enrollment remain orphaned (their `batch_enrollment_id` points to a deleted enrollment). New schedule rows are generated for the new batch starting from scratch.
- **Expected behavior:** Payments already made for the old batch should be preserved. The old enrollment should be marked "transferred" rather than deleted, keeping payment history intact.
- **Severity:** Critical
- **Suggested fix:** Change `syncBatchEnrollment` to update old enrollment status to "transferred" instead of deleting. This preserves payment history linkage.

---

## 3. BATCH & ENROLLMENT LOGIC

### 3.1 Batch end date extended -- no new payment rows
- **Scenario:** Batch duration extended from 6 to 9 months
- **Current behavior:** Updating a batch via `useUpdateBatch` only updates the batch record. No new payment schedule rows are generated for existing students.
- **Expected behavior:** Admin should be prompted to generate additional payment rows for the extended months, or at minimum warned that existing students won't get new schedule rows.
- **Severity:** Important
- **Suggested fix:** After batch duration increase, offer to regenerate missing payment schedule rows for enrolled students.

### 3.2 Batch monthly fee changed after enrollment
- **Scenario:** Batch monthly fee increased from 1500 to 2000
- **Current behavior:** Existing unpaid schedule rows retain the old amount (1500). Only new enrollments get 2000.
- **Expected behavior:** This is actually correct behavior -- existing students should keep their original agreed fee. The batch default is just a template. However, there's no way for an admin to bulk-update existing unpaid rows to the new rate.
- **Severity:** Minor
- **Suggested fix:** Consider adding a "propagate fee change" option when updating batch fees.

### 3.3 Batch manually completed before end date
- **Scenario:** Admin manually marks a batch as "completed"
- **Current behavior:** `useUpdateBatch` only updates the batch status. It does NOT complete active enrollments. The auto-complete cron only runs on expired batches. So active enrollments remain "active" even though the batch is completed.
- **Expected behavior:** Manually completing a batch should also complete its active enrollments, just like the auto-complete cron does.
- **Severity:** Critical
- **Suggested fix:** In the batch edit/update flow, when status changes to "completed", also update active enrollments to "completed".

### 3.4 Batch with future start date and enrolled students
- **Scenario:** Batch starts next month, students enrolled now
- **Current behavior:** This is allowed and is standard practice (pre-enrollment). Payment schedule rows use the batch start date for due dates, so future months show as "pending" not "overdue". This is correct.
- **Severity:** N/A (no issue)

### 3.5 Batch with 0 duration
- **Scenario:** `course_duration_months` is 0
- **Current behavior:** In `generatePaymentSchedule`, the loop `for (let i = 0; i < durationMonths; i++)` won't execute when `durationMonths` is 0. Only an admission fee row would be created. This is acceptable for one-off courses.
- **Severity:** N/A (no issue)

### 3.6 Completed enrollment despite unpaid fees
- **Scenario:** Batch ends, student has unpaid fees
- **Current behavior:** The auto-complete cron marks enrollments as "completed" regardless of payment status. The student still owes money.
- **Expected behavior:** This is a policy decision. Completion should NOT be blocked by unpaid fees (a student can complete a course academically while still owing money). The current "Historical Due" label for completed enrollments (recently added) is the correct approach.
- **Severity:** N/A (design choice, recently addressed)

---

## 4. REVENUE & FINANCIAL LOGIC

### 4.1 Revenue timing -- recorded on payment, not promise
- **Scenario:** When is revenue recorded?
- **Current behavior:** Revenue is created by a database trigger (`trg_auto_create_payment_revenue`) when a student payment is inserted/updated with status "paid". Unpaid schedule rows do NOT create revenue. This is correct cash-basis accounting.
- **Expected behavior:** Already correct.
- **Severity:** N/A (no issue)

### 4.2 Revenue deleted but payment still shows "paid"
- **Scenario:** Admin manually deletes a revenue entry from the Revenue page
- **Current behavior:** The revenue record is deleted, but the linked `student_payments` row retains `status = "paid"`. The `student_payment_id` FK on revenues is nullable and has no cascade. This creates a ghost payment -- the student appears paid but no corresponding revenue exists.
- **Expected behavior:** Deleting a revenue entry linked to a student payment should either be blocked or should also revert the payment status.
- **Severity:** Critical
- **Suggested fix:** Either prevent deletion of system-generated revenue entries (where `is_system_generated = true`), or cascade the deletion to revert the payment status.

### 4.3 Product sale revenue timing
- **Scenario:** Product sold on credit (payment_status = "pending")
- **Current behavior:** The `useCreateProductSale` mutation inserts the sale, and a trigger likely creates a revenue entry. Need to verify if the trigger checks `payment_status`. The `product_sale_id` column on revenues suggests revenue is created regardless of payment status.
- **Expected behavior:** Revenue should only be recognized when payment_status is "paid", consistent with student payment behavior.
- **Severity:** Important
- **Suggested fix:** Update the product sale revenue trigger to only fire when `payment_status = 'paid'`.

### 4.4 No revenue sources configured
- **Scenario:** Company has no revenue sources
- **Current behavior:** Student payment dialog has a revenue source selector that defaults to the first available source. If none exist, `source_id` is null on the payment. The revenue trigger may still fire with `source_id = null`.
- **Expected behavior:** Payments should work without a revenue source. Revenue entries with null source should be categorized as "Uncategorized" in reports.
- **Severity:** Minor

### 4.5 Revenue/expense mismatch with student payments
- **Scenario:** Total student payments do not match total revenue
- **Current behavior:** If the revenue trigger fails silently, or if revenue entries are manually deleted, the totals will diverge. The financial consistency check RPC (`verify_financial_consistency`) runs in the auto-complete cron to detect this.
- **Expected behavior:** The consistency check exists but its results are only logged, not surfaced to the admin.
- **Severity:** Important
- **Suggested fix:** Surface consistency check results on the dashboard or settings page.

---

## 5. MULTI-ENROLLMENT EDGE CASES

### 5.1 Cross-batch payment recording
- **Scenario:** Student in Course A and Course B, admin records payment
- **Current behavior:** `StudentPaymentDialog` fetches all ACTIVE enrollments and shows a batch selector. The admin must select which enrollment to pay against. If they pick the wrong one, the payment is recorded against the wrong batch. However, the payment's `batch_enrollment_id` correctly links it.
- **Expected behavior:** Current behavior is acceptable -- explicit enrollment selection is the right approach.
- **Severity:** N/A (no issue)

### 5.2 Dropout from one course, active in another
- **Scenario:** Student drops Course A but remains in Course B
- **Current behavior:** There's no per-enrollment dropout mechanism. The `QuickActionsPanel` sets the STUDENT status to "dropout" which deactivates ALL enrollments. You can't drop one course without affecting others.
- **Expected behavior:** Should support per-enrollment status changes (remove from batch) separately from student-level status.
- **Severity:** Important
- **Suggested fix:** The "Remove from Batch" feature handles per-enrollment removal. The student status should remain "active" unless they drop ALL courses. Currently, removing from a batch doesn't change student status, which is correct. But setting student status to "dropout" affects all enrollments, which is problematic for multi-enrolled students.

### 5.3 Payment rate for multi-enrolled students
- **Scenario:** Course A 100% paid, Course B 0% paid
- **Current behavior:** `computeStudentSummary` aggregates ALL payments across all enrollments, and `computeLifetimeMetrics` calculates a single payment rate from total expected. So the overall rate would be 50%. This is mathematically correct but could be misleading.
- **Expected behavior:** Consider showing per-enrollment payment rates alongside the aggregate. Currently acceptable.
- **Severity:** Minor

---

## 6. EMPLOYEE & SALARY LOGIC

### 6.1 Salary before join date
- **Scenario:** Record salary for a month before employee's joining date
- **Current behavior:** No validation. The salary payment form accepts any month string.
- **Expected behavior:** Should warn or block salary recording for months before `join_date`.
- **Severity:** Important
- **Suggested fix:** Validate `payment.month` >= employee join month in `useCreateSalaryPayment`.

### 6.2 Duplicate month salary
- **Scenario:** Same month's salary paid twice
- **Current behavior:** No uniqueness check on (employee_id, month). A second payment for the same month creates a duplicate expense.
- **Expected behavior:** Should block or warn about duplicate month payments.
- **Severity:** Critical
- **Suggested fix:** Check for existing salary payment with same employee_id + month before inserting.

### 6.3 Terminated employee salary
- **Scenario:** Employee terminated, admin records future salary
- **Current behavior:** No validation on employment_status. Payments can be recorded for terminated employees.
- **Expected behavior:** Should warn when recording salary for a non-active employee.
- **Severity:** Important
- **Suggested fix:** Check `employment_status` before allowing salary recording.

### 6.4 Salary auto-creates expense
- **Scenario:** Is salary tracked as expense?
- **Current behavior:** Yes, via database trigger `trg_auto_create_salary_expense`. This is correct and automatic.
- **Severity:** N/A (no issue)

---

## 7. PRODUCT & INVENTORY LOGIC

### 7.1 Selling physical product with 0 stock
- **Scenario:** Product stock is 0, someone tries to sell it
- **Current behavior:** `ProductSaleDialog` checks `isOverStock = isPhysical && quantity > stockAvailable` and disables submit. This correctly prevents overselling physical products. Digital/service products are exempt.
- **Severity:** N/A (no issue)

### 7.2 Negative stock from adjustment
- **Scenario:** Manual stock adjustment to negative
- **Current behavior:** `StockAdjustmentDialog` shows "New stock cannot be negative" warning and disables submit when `newStock < 0`. Correct.
- **Severity:** N/A (no issue)

### 7.3 Product sale deleted -- stock restoration
- **Scenario:** Sale is deleted
- **Current behavior:** The delete confirmation mentions "restore stock" -- this is likely handled by a database trigger. The `useDeleteProductSale` mutation invalidates product queries which would refresh stock.
- **Expected behavior:** Should be handled atomically. Verify the trigger exists.
- **Severity:** Minor (needs trigger verification)

### 7.4 Zero-price product sale
- **Scenario:** Product price is 0
- **Current behavior:** `ProductSaleDialog` requires `unitPrice > 0` in the `canSubmit` check. A product with price 0 would fail unless the admin manually sets a price.
- **Expected behavior:** Should allow 0-price products (free samples/promotional). Current behavior is overly restrictive.
- **Severity:** Minor
- **Suggested fix:** Allow 0-price sales or make the check `unitPrice >= 0`.

---

## 8. MEMBERS & PERMISSION LOGIC

### 8.1 Company with zero admins
- **Scenario:** Only admin demotes themselves
- **Current behavior:** No validation prevents the last admin from being demoted or removed.
- **Expected behavior:** Should block removal/demotion of the last admin.
- **Severity:** Critical
- **Suggested fix:** Before admin demotion/removal, check if they're the last admin and block if so.

### 8.2 Removed member's data
- **Scenario:** Member removed from company
- **Current behavior:** Records created by that member (students, payments, expenses) remain with `user_id` pointing to the removed user. No cascading delete. Records are NOT orphaned -- they're still accessible. The `user_id` is just metadata (who created it), not access control.
- **Expected behavior:** This is correct behavior. Historical records should persist.
- **Severity:** N/A (no issue)

### 8.3 Contradictory permissions
- **Scenario:** mod_payments_edit = true but mod_payments_add = false
- **Current behavior:** Each permission is independent. You can edit but not add. This is logically valid (e.g., a reviewer who can fix errors but shouldn't create new entries).
- **Expected behavior:** Already valid.
- **Severity:** N/A (no issue)

---

## 9. DATE & TIME LOGIC

### 9.1 Timezone handling
- **Scenario:** Payment due dates and "current month" calculations
- **Current behavior:** `computeStudentSummary` uses `new Date()` for current month, which is CLIENT browser time. Due dates are stored as DATE (no timezone). The comparison `m < currentMonth` uses string comparison of "YYYY-MM" format.
- **Expected behavior:** For institutions in a single timezone (e.g., Bangladesh UTC+6), this works fine. But the client clock could differ from server, causing a payment to appear overdue on one device but not another at month boundaries.
- **Severity:** Minor
- **Suggested fix:** Consider using company timezone for "current month" determination.

### 9.2 Batch start date in the past
- **Scenario:** Creating a batch with past start date
- **Current behavior:** Allowed. Past months' payment rows are generated with past due dates. They will immediately appear as overdue in `computeStudentSummary`.
- **Expected behavior:** Should warn that past months will appear overdue immediately.
- **Severity:** Minor

---

## 10. AUDIT & COMPLIANCE LOGIC

### 10.1 Fee change history
- **Scenario:** Student's monthly fee is changed
- **Current behavior:** The `monthly_fee_history` table preserves all fee changes with `effective_from` dates. This is correct and comprehensive.
- **Severity:** N/A (no issue)

### 10.2 Audit log deletion
- **Scenario:** Can audit logs be deleted?
- **Current behavior:** YES -- Cipher users can delete audit logs (RLS policy: "Only cipher users can delete audit logs"). The AuditLog page has bulk delete functionality for Cipher users.
- **Expected behavior:** Audit logs should be immutable for compliance. Financial audit trails should never be deletable.
- **Severity:** Critical
- **Suggested fix:** Remove the DELETE RLS policy on audit_logs. Remove the delete UI from the AuditLog page. Audit logs should be append-only.

### 10.3 Revenue source deletion with linked entries
- **Scenario:** Revenue source is deleted that has linked revenue entries
- **Current behavior:** The `source_id` FK on revenues is nullable. If the revenue source is deleted, existing revenue entries retain `source_id` pointing to a deleted record. Queries joining to revenue_sources would show null for the source name.
- **Expected behavior:** Should either block deletion of sources with linked entries, or set `source_id` to null (soft-delete the source instead).
- **Severity:** Important
- **Suggested fix:** Use soft-delete (status = "inactive") for revenue sources and expense accounts instead of hard delete.

### 10.4 Financial change traceability
- **Scenario:** Are all financial changes tracked?
- **Current behavior:** The audit_logs table captures INSERT/UPDATE/DELETE on key tables including student_payments, revenues, expenses, and khata_transfers. Each entry includes user_id, user_email, old_data, and new_data. This provides complete traceability.
- **Severity:** N/A (no issue -- well implemented)

---

## PRIORITIZED FIX LIST

### Critical (must fix -- data integrity at risk)
1. **Graduated students don't complete enrollments** (1.2) -- enrollment leak
2. **Double payment for same month not blocked** (2.5) -- financial data corruption
3. **Batch transfer deletes enrollment instead of archiving** (2.9) -- payment history loss
4. **Manual batch completion doesn't complete enrollments** (3.3) -- enrollment status inconsistency
5. **Deleting revenue doesn't revert payment status** (4.2) -- ghost payments
6. **Duplicate month salary not blocked** (6.2) -- double expense
7. **Last admin can be removed** (8.1) -- company lockout risk
8. **Audit logs are deletable** (10.2) -- compliance violation

### Important (should fix -- incorrect business logic)
9. **Dropout students' future payments not cancelled** (1.1)
10. **enrollmentSync doesn't check batch status** (1.3)
11. **Payment schedule uses batch fee, not student custom fee** (2.1)
12. **Overpayment not handled** (2.2)
13. **Multi-month payment distribution is equal, not waterfall** (2.3)
14. **Batch extension doesn't generate new payment rows** (3.1)
15. **Product sale revenue ignores payment_status** (4.3)
16. **Financial consistency results not surfaced** (4.5)
17. **Student-level dropout affects all enrollments** (5.2)
18. **Salary before join date not validated** (6.1)
19. **Terminated employee salary not blocked** (6.3)
20. **Revenue/expense source deletion with linked entries** (10.3)

### Minor (nice to have -- edge cases)
21. Payment before enrollment date warning (2.8)
22. Batch fee change propagation option (3.2)
23. Zero-price product sale blocked (7.4)
24. Timezone-based current month (9.1)
25. Past batch start date warning (9.2)
