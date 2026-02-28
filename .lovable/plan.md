

# Courses, Batches, and Enrollment Module Audit Report

---

## 1. COURSES MODULE

| Check | Status | Details |
|-------|--------|---------|
| Courses list filtered by company_id | PASS | `useCourses` applies `.eq("company_id", activeCompanyId)` on every query. |
| Admin can create courses | PASS | `useCreateCourse` sets `company_id` and `user_id` from session. RLS INSERT policy: `is_company_admin OR is_cipher`. |
| Admin can edit courses | PASS | RLS UPDATE policy: `is_company_admin OR is_cipher`. Frontend: `effectiveCanEdit` check. |
| Admin can delete courses | PASS | RLS DELETE policy: `is_company_admin OR is_cipher`. Frontend: `effectiveCanDelete` check. |
| Course deletion cascade | WARNING | FK `batches.course_id -> courses` is ON DELETE CASCADE, so deleting a course cascades to all batches. `batch_enrollments.batch_id -> batches` is also CASCADE, BUT `student_payments.batch_enrollment_id -> batch_enrollments` is RESTRICT. This means deleting a course with any paid students will FAIL with a FK constraint error. The error message shown to the user will be a raw database error, not a friendly message. |
| Course deletion with active students warning | WARNING | `CourseDetail` only hides the Delete button when `courseBatches.length === 0`. On the `Courses` list page, there is NO check at all -- the delete button shows and the delete proceeds without checking for batches or enrolled students. The delete will fail at DB level due to RESTRICT on payments, but with an unfriendly error. |
| Duplicate course name validation | FAIL | No unique index on `(company_id, course_name)`. No frontend or backend check. Users can create multiple courses with identical names in the same company. |
| Course field validation | PASS | `CourseDialog` uses Zod schema: `course_name` required (1-100 chars), `course_code` required (1-50 chars), `duration_months` min 1, `status` enum. |
| Course list pagination | PASS | Uses `usePagination` with client-side pagination. All courses loaded at once. |
| Scale concern - all courses loaded | WARNING | `useCourses` fetches ALL courses for the company. Additionally, `Courses` page fetches ALL students (`useAllStudents`), ALL payments (`useStudentPayments`), and ALL enrollments to compute analytics client-side. For companies with thousands of students, this will cause severe performance issues. |
| Courses RLS SELECT missing company_id filter | WARNING | Courses SELECT policy is `is_company_member(auth.uid(), company_id) AND NOT is_data_entry_moderator(...)` -- note it does NOT require `company_id = get_active_company_id(auth.uid())`. A user who is a member of multiple companies could theoretically see courses from all their companies. The frontend filters by `activeCompanyId`, but the RLS is overly permissive compared to other tables. |

---

## 2. BATCHES MODULE

| Check | Status | Details |
|-------|--------|---------|
| Batch list filtered by company_id | PASS | `useBatches` applies `.eq("company_id", activeCompanyId)`. |
| Batch list filtered by course_id | WARNING | `useBatches` does NOT filter by `course_id`. It fetches ALL batches for the company. Course-specific filtering happens client-side in `CourseDetail` via `allBatches.filter(b => b.course_id === id)`. This works but loads unnecessary data. |
| Batch capacity enforced at enrollment | PASS | `BatchEnrollDialog.handleEnroll` checks `max_capacity` vs active enrollment count before inserting. |
| Batch capacity enforced when editing to lower value | FAIL | `BatchDialog` allows editing `max_capacity` to any value >= 1. No check prevents setting capacity below current enrollment count. A batch with 20 students could have its capacity set to 5 with no error. |
| Batch dates validated (end > start) | PASS | `batchSchema` has a Zod `.refine()` checking `end_date > start_date`. DB trigger `validate_batch_dates` also enforces this server-side. |
| Batch deletion cascade | WARNING | FK chain: `batches -> batch_enrollments (CASCADE) -> student_payments (RESTRICT)`. Deleting a batch with ANY student payments will fail at DB level. The frontend checks `studentCount > 0` and blocks deletion with a toast, which is good. But if there are enrollments with no payments, deletion would succeed and cascade-delete the enrollments silently. |
| Batch status auto-update on end_date | FAIL | There is NO automatic process (cron, trigger, or scheduled function) to update batch status when `end_date` passes. Status changes are manual only via the edit dialog. |
| Batch fees validated as positive | PASS | `batchSchema` validates `default_admission_fee: z.number().min(0)` and `default_monthly_fee: z.number().min(0)`. |
| Editing batch fees effect on existing payments | PASS (by design) | Editing batch fees does NOT retroactively affect existing payment schedule rows. This is correct -- existing payments should be immutable. New enrollments after the fee change will use the updated fees. |
| Batch detail student count source | PASS | `BatchDetail` fetches from `batch_enrollments` (active status) and builds `enrolledStudentIdSet` from that. Does NOT use `students.batch_id`. |
| Batch search/filter on list | PASS | Search by name/code, filter by status (active/completed/archived), sort by multiple criteria, date range filter. |
| Batch deletion with enrolled students (frontend) | PASS | Both `Batches` and `CourseDetail` pages check `studentCount > 0` before allowing deletion. Shows toast: "This batch has X student(s). Remove or reassign them first." |

---

## 3. ENROLLMENT FLOW

| Check | Status | Details |
|-------|--------|---------|
| Enroll Student modal flow | PASS | `BatchEnrollDialog` opens from BatchDetail. Search students, check existing enrollment, check capacity, insert `batch_enrollments` record. |
| batch_enrollments record created correctly | PASS | Inserts with `student_id`, `batch_id`, `company_id`, `created_by`, `status: 'active'`, `total_fee: 0`. |
| students.batch_id updated on enrollment | PASS (partial) | `BatchEnrollDialog` only sets `students.batch_id` if the student has NO existing primary batch (`!student.batch_id`). This is correct for multi-enrollment support. |
| Payment schedule auto-generated on enrollment (BatchEnrollDialog) | FAIL | `BatchEnrollDialog.handleEnroll` does NOT call `generatePaymentSchedule` or `syncBatchEnrollment`. It only creates the `batch_enrollments` record. No admission fee row and no monthly fee rows are generated. Payment schedule is ONLY generated when using `syncBatchEnrollment` (called from `StudentDialog`/`StudentWizardDialog` edit mode and `AddStudent`). |
| Admission fee auto-created on enrollment | FAIL | Same as above -- no admission fee payment row created via `BatchEnrollDialog`. |
| Batch student count updates after enrollment | PASS | `BatchEnrollDialog` closes dialog on success. `BatchDetail` refetches `batch_enrollments` query via React Query cache invalidation. |
| Student profile enrollment timeline updates | WARNING | No explicit query invalidation for the student profile's enrollment timeline after enrolling via `BatchEnrollDialog`. The enrollment timeline may show stale data until next refetch. |
| Enrollment from student profile page | WARNING | No direct "Enroll in Batch" action from the student profile `QuickActionsPanel`. Enrollment is only possible from `BatchDetail` page. |
| Rollback on partial enrollment failure | FAIL | `BatchEnrollDialog.handleEnroll` creates the enrollment record, then optionally updates `students.batch_id`. If the second step fails, the enrollment exists but batch_id is not set. No transaction wrapping. Similarly, `syncBatchEnrollment` deletes old enrollment, creates new one, then generates payment schedule -- if schedule generation fails, enrollment exists with no payments. No rollback. |

---

## 4. BATCH STUDENT LIST (BatchDetail page)

| Check | Status | Details |
|-------|--------|---------|
| Fetching from batch_enrollments (correct) | PASS | Uses `batchEnrollments` query filtering by `batch_id` and `status: 'active'`, then intersects with `allStudents` via `enrolledStudentIdSet`. |
| Payment status per student accurate | PASS | Uses `computeStudentSummary` with effective fees (student fee or batch default fallback). Shows admission status, monthly payment progress, overdue counts. |
| Action buttons role-restricted | PASS | Edit/Payment buttons gated by `canEdit`/`canAddRevenue`. Remove button visible only for admins/cipher. |
| Student navigation from batch | PASS | "View Profile" button navigates to `/students/${s.id}/profile`. Payment context is NOT batch-scoped -- it shows ALL payments for the student, not just this batch's payments. |
| Payment context is batch-scoped | WARNING | When clicking "Record Payment" from BatchDetail, the `StudentPaymentDialog` receives the student but the `batchEnrollmentId` is resolved from `batchEnrollments` data. However, the payment dialog itself does not restrict payment viewing to this batch only. The student summary shown includes ALL payments across all batches. |
| Remove from Batch behavior | PASS | Uses `remove_student_from_batch` RPC which atomically: deletes linked revenues, deletes linked payments, deletes enrollment, clears `students.batch_id` if matching, creates audit log. Shows confirmation dialog with payment total. |
| Removed students update list | PASS | After removal, query invalidation triggers refetch of `batch_enrollments`, `students`, `revenues`, `allocations`, `dashboard`, `reports`. |

---

## 5. PAYMENT SCHEDULE GENERATION

| Check | Status | Details |
|-------|--------|---------|
| When are payment rows created | WARNING | Only via `syncBatchEnrollment` -> `generatePaymentSchedule`. This is called from: (1) `AddStudent.handleSubmit`, (2) `StudentDialog`/`StudentWizardDialog` on batch change. NOT called from `BatchEnrollDialog` (the primary enrollment UI). This means the main enrollment flow creates NO payment schedule. |
| How many rows created | PASS | One admission fee row (if > 0) + one row per month of `course_duration_months` (if > 0). |
| Due dates calculated correctly | PASS | Uses `addMonths(startDate, i)` for each month. A 4-month batch starting Mar 1 creates: Mar 1, Apr 1, May 1, Jun 1. |
| Status of new payment rows | PASS | All created with `status: "unpaid"`. |
| billing_start_month respected | FAIL | `generatePaymentSchedule` uses `batch.start_date` for all students, regardless of the student's `billing_start_month`. A student joining mid-batch gets payment rows from batch start, not their join date. |
| Past-due rows for mid-batch enrollment | WARNING | If a student enrolls in a batch that already started 2 months ago, they get payment rows from the batch start date (2 months ago) with `status: "unpaid"`. These will immediately appear as overdue. No distinction between "was late" and "just enrolled." |
| Duplicate payment rows on re-enrollment | WARNING | `syncBatchEnrollment` deletes the old enrollment (and its payments via the RPC or direct delete). However, the delete in `syncBatchEnrollment` uses `.delete().eq("status", "active")`. If there are payments linked to the enrollment, the DELETE will fail due to RESTRICT FK constraint. The function logs the error but continues, potentially creating a second enrollment with duplicate payment rows. |
| Payment rows when batch duration extended | PASS (by design) | No automatic regeneration. Existing payment rows stay as-is. Admin must manually add new payment rows. |

---

## 6. BATCH COMPLETION

| Check | Status | Details |
|-------|--------|---------|
| Auto-completion on end_date | FAIL | No automatic process exists. No cron job, no database trigger, no scheduled edge function. Batch status remains "active" indefinitely even after end_date passes. |
| Manual completion | PASS | Admin can change batch status to "completed" via `BatchDialog` edit. |
| Unpaid rows on completion | WARNING | When batch status is changed to "completed", nothing happens to unpaid payment rows. They remain with `status: "unpaid"` and continue showing as overdue in the system. No automatic write-off or archival. |
| Enrollment timeline shows completed | WARNING | `EnrollmentTimeline` reads from `batch_enrollments.status`. But completing a BATCH (setting `batches.status = 'completed'`) does NOT update `batch_enrollments.status` for enrolled students. The enrollment records stay as "active" even though the batch is completed. |
| Student moved to new batch on completion | PASS (by design) | Students remain enrolled with their current status. No auto-migration to a new batch. This is correct behavior. |

---

## 7. MODERATOR and DEO ACCESS

| Check | Status | Details |
|-------|--------|---------|
| DEO blocked from Courses page | PASS | `AccessGuard` rule `deoCoursePages`: `isDenied: ctx.isDataEntryModerator`. Shows "Courses are not available in Data Entry Mode." |
| DEO blocked from BatchDetail page | PASS | `AccessGuard` rule `deoBatchPages`: `isDenied: ctx.isDataEntryModerator`. Additionally, `BatchDetail` has a `useEffect` redirect for DEO without `canEditBatch`. |
| DEO blocked at RLS level | PASS | Courses SELECT RLS: `NOT is_data_entry_moderator(...)`. Batches SELECT RLS: `NOT is_data_entry_moderator(...)`. |
| Moderator Normal with view permission | PASS | Non-DEO moderators can view courses and batches. The `deoCourses` rule only blocks moderators without ANY batch permissions. |
| Moderator can enroll students | PASS | `BatchEnrollDialog` enrollment insert uses the user's session. RLS for `batch_enrollments` INSERT requires `is_company_admin OR is_cipher`, which means moderators CANNOT enroll students even with permissions. Wait -- this is a problem. |
| Moderator enrollment RLS | FAIL | `batch_enrollments` INSERT RLS policy: `is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())`. This means ONLY admins and cipher users can insert enrollments. Moderators with batch permissions see the "Enroll Student" button in the UI but the database INSERT will fail with an RLS violation. |
| Moderator can create/delete courses | PASS (backend blocks) | Courses INSERT/UPDATE/DELETE RLS all require `is_company_admin OR is_cipher`. Moderators are blocked at DB level even if frontend shows buttons. |
| Moderator batch CRUD | PASS | Batches INSERT uses `company_can_add_batch` (allows moderator with `deo_batches`). UPDATE uses `company_can_edit_batch`. DELETE uses `company_can_delete_batch`. These correctly check moderator permissions. |
| Frontend shows course CRUD buttons to moderators | WARNING | `effectiveCanAdd = canAddRevenue || canAddBatch`. A moderator with batch permissions will see "Create Course" button, but the DB will reject the insert. The button should be hidden for non-admin users. |

---

## 8. DATA CONSISTENCY CHECKS

| Check | Status | Details |
|-------|--------|---------|
| Active enrollments past batch end_date | PASS | Query returned 0 rows. No stale active enrollments found (likely because no batches have end_dates set, or no completed batches exist yet). |
| students.batch_id mismatch with enrollments | PASS | Query returned 0 rows. No mismatches found (likely no student data currently exists). |
| Stored student_count mismatch | N/A | No stored `student_count` column on batches table. Counts are always computed from `batch_enrollments` at query time. |
| Payment rows before batch start_date | N/A | Cannot verify without data. By code review: `generatePaymentSchedule` starts from `batch.start_date`, so this should not occur unless manually created payments predate the batch. |
| Active enrollments after batch end_date | N/A | No data to verify. By code review: no validation prevents enrollment after `batch.end_date`. |
| Orphaned enrollments (deleted batch) | PASS | `batch_enrollments.batch_id -> batches` is ON DELETE CASCADE. Deleting a batch auto-deletes its enrollments (if no RESTRICT from payments). |

---

## Prioritized Fix List

### Critical

1. **BatchEnrollDialog does NOT generate payment schedule** -- The primary enrollment UI (`BatchEnrollDialog` on BatchDetail page) creates the enrollment record but does NOT call `generatePaymentSchedule`. No admission or monthly fee rows are created. Fix: call `generatePaymentSchedule` after successful enrollment insert, or better yet, call `syncBatchEnrollment` which handles both enrollment creation and schedule generation.

2. **Moderators cannot enroll students despite UI showing the button** -- `batch_enrollments` INSERT RLS requires `is_company_admin OR is_cipher`. Moderators with batch/enrollment permissions will get a silent RLS failure. Fix: update the RLS policy to include `company_can_add_batch(company_id, auth.uid())` or create a dedicated `company_can_enroll_student` permission function.

3. **No duplicate course name validation** -- Multiple courses with identical names can be created in the same company. Fix: add a unique index on `(company_id, course_name)` or at minimum add a frontend check before insert.

### Important

4. **Batch capacity not validated when editing to lower value** -- Admin can set `max_capacity` below current enrollment count. Fix: add a pre-save check in the frontend that compares new capacity against current active enrollments. Optionally add a DB trigger.

5. **No auto-completion for batches past end_date** -- Batch status stays "active" forever. Fix: either add a scheduled edge function to mark batches as completed, or add a DB trigger on batch status queries.

6. **Batch completion doesn't update enrollment status** -- Setting `batches.status = 'completed'` leaves all `batch_enrollments` as `status = 'active'`. Fix: add a trigger or frontend logic that updates enrollment statuses when batch status changes to completed.

7. **billing_start_month ignored in payment schedule generation** -- `generatePaymentSchedule` always starts from batch start_date regardless of student's `billing_start_month`. Fix: check if student has a `billing_start_month` and use it as the starting month for payment rows if it's after the batch start.

8. **Frontend shows Course CRUD buttons to moderators** -- Moderators with batch permissions see "Create Course" and "Edit Course" buttons, but DB rejects the operations (courses INSERT/UPDATE/DELETE require admin or cipher). Fix: use a separate `canEditCourse` / `canAddCourse` permission check that requires admin role.

9. **Course deletion has inconsistent protection** -- `CourseDetail` hides Delete when batches exist, but `Courses` list page shows Delete for any course. Both will fail at DB with unfriendly RESTRICT error if payments exist. Fix: check for batches before deletion on the list page too, and provide a friendly error message.

10. **Courses SELECT RLS doesn't filter by active_company_id** -- Unlike other tables, the courses SELECT policy only checks `is_company_member` without `company_id = get_active_company_id(auth.uid())`. A multi-company user could see courses from inactive companies. Fix: add the `active_company_id` check to match other tables.

### Minor

11. **No enrollment from student profile** -- Students can only be enrolled from the BatchDetail page. Consider adding an "Enroll in Batch" action to the student profile QuickActionsPanel.

12. **No rollback on partial enrollment failure** -- If enrollment succeeds but schedule generation fails, data is left in an inconsistent state. Consider wrapping in an RPC or adding cleanup logic.

13. **Mid-batch enrollment creates immediately overdue rows** -- Students enrolled mid-batch get payment rows from batch start, immediately appearing overdue. Consider only generating rows from enrollment date forward, or marking historical rows differently.

14. **All-data loading for analytics is unscalable** -- Courses and Batches pages load ALL students and ALL payments client-side for analytics computation. This will degrade at scale. Consider server-side aggregation views or RPC functions.

15. **Unpaid payment rows not handled on batch completion** -- When a batch is marked completed, unpaid rows remain and show as overdue indefinitely. Consider adding a "write off" or "archive" option for remaining unpaid rows.

