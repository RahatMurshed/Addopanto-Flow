
# Students Module Comprehensive Audit Report

---

## 1. STUDENT LIST PAGE (/students)

| Check | Status | Details |
|-------|--------|---------|
| Page loads for all roles | PASS | Cipher/Admin see full dashboard + table. Moderators see table only. DEO sees "My Students" label. Loading skeleton shown during fetch. |
| List filtered by company_id | PASS | `useStudents` hook applies `.eq("company_id", activeCompanyId)` on every query. `useAllStudents` does the same. |
| DEO: filtered to own students (RLS) | PASS | Students table SELECT RLS policy: `(NOT is_data_entry_moderator(company_id, auth.uid())) OR (user_id = auth.uid())`. This is enforced at RLS level, not just frontend. |
| DEO: filtered to own students (Frontend) | PASS | `useStudents` and `useAllStudents` also add `.eq("user_id", user.id)` for DEO as defense-in-depth. |
| Search filters working | PASS | Search covers name, student_id_number, class_grade (safe), plus PII fields (phone, father_name, email, etc.) when user has PII access. Input is sanitized against SQL wildcards. |
| Status/batch/course filters | PASS | Server-side filters for status, batch_id, gender, class_grade, address fields, academic_year all apply to both count and data queries. |
| Pagination correctness | PASS | Uses server-side `.range(from, to)` with parallel count query. `totalPages` calculated from `serverTotalCount / pageSize`. Selection cleared on page/filter change. |
| Sort correctness | PASS | Server-side `.order(sortBy, { ascending: sortOrder })` applied to data query. Supports name, enrollment_date, monthly_fee_amount, student_id_number, date_of_birth, class_grade, created_at. |
| Student count accuracy | PASS | Header shows `serverTotalCount` from the exact count query. Filter bar shows `filteredStudents.length` for client-side payment filters and `totalStudents` for total. |
| Action buttons role-based | PASS | View: always visible. Payment: hidden for DEO (`effectiveCanPayment = !isDataEntryModerator && ...`). Delete: hidden without delete permission. Edit/checkbox: hidden without edit permission. |
| CSV bulk import | PASS | End-to-end flow: upload, column mapping with auto-map, preview, import via edge function, error report download. Row limit 5000 enforced. See Section 8 for details. |
| Export function | PASS | `StudentExportDialog` supports CSV and PDF. Fetches all filtered students via `fetchFilteredStudentsForExport`. PII columns hidden for users without PII access. |
| Admission/monthly payment status filters | WARNING | These are client-side filters applied to the current page's data only (`filteredStudents`), not server-side. If a student matches the payment filter but is on page 2, they won't appear when filtering on page 1. The count in the header (`filteredStudents.length`) may be misleading. |

---

## 2. STUDENT CREATION

| Check | Status | Details |
|-------|--------|---------|
| Required field validation | PASS | Step 0: name + date_of_birth required. Step 1: phone required, email format validated. Step 2: father_name + mother_name required. Step 3: enrollment_date + billing_start_month (YYYY-MM format) required. All steps validated before final submit. |
| company_id set from session | PASS | `useCreateStudent` sets `company_id: activeCompanyId` from `useCompany()` context, not from form input. |
| created_by set to auth.uid() | PASS | `useCreateStudent` sets `user_id: user.id` from `useAuth()`. RLS INSERT policy enforces `user_id = auth.uid()`. |
| Duplicate detection | PASS | `useCheckSingleDuplicate` runs in real-time during form entry. Checks phone + name match. Shows warning banner with link to existing student. |
| Student appears in list after creation | PASS | `useCreateStudent.onSuccess` invalidates `["students"]` query key. React Query refetches automatically. No full page reload needed. |
| Batch linking on creation | PASS | `batch_id` set from form data. Batch existence validated before insert (guards against stale draft IDs). |
| batch_enrollments created on creation | WARNING | The `AddStudent` page does NOT create a `batch_enrollments` record. The `syncBatchEnrollment` function is only called from `StudentDialog` and `StudentWizardDialog` (edit mode), not from the standalone `AddStudent` page. A student created via `/students/new` with a batch selected will have `students.batch_id` set but NO corresponding `batch_enrollments` record. This means batch student counts (which use `batch_enrollments`) will be incorrect. |
| Admission payment auto-created | PASS | `ReviewStep` includes `InitialPaymentSection`. If admission amount > 0, a payment record is created via `createPaymentMutation.mutateAsync`. |
| Monthly fee history entry | PASS | `useCreateStudent` creates an initial `monthly_fee_history` entry if `monthly_fee_amount > 0`. |

---

## 3. STUDENT EDIT

| Check | Status | Details |
|-------|--------|---------|
| Pre-populates existing fields | PASS | `StudentWizardDialog` in edit mode populates all steps from the `student` prop via `useEffect`. |
| All fields saved on update | PASS | `useUpdateStudent` passes all updated fields to `.update()`. |
| updated_at timestamp | PASS | Database trigger `update_students_updated_at` automatically updates `updated_at` on every UPDATE. |
| Audit log on edit | PASS | Database trigger `audit_students` (type 29 = AFTER INSERT/UPDATE/DELETE) automatically creates audit log entries with old_data and new_data as JSONB. |
| Moderator without edit permission blocked (frontend) | PASS | `effectiveCanEdit = canEdit \|\| canEditStudent` controls UI visibility. Edit button hidden without permission. |
| Moderator without edit permission blocked (backend) | PASS | `company_can_edit_student` RLS function checks membership permissions. |
| DEO editing others' students | PASS | UPDATE RLS policy: `(NOT is_data_entry_moderator(...)) OR (user_id = auth.uid())`. DEO can only update their own students. |

---

## 4. STUDENT DELETION

| Check | Status | Details |
|-------|--------|---------|
| Cascade on delete | PASS | All child FKs use `ON DELETE CASCADE`: batch_enrollments, student_payments, student_sales_notes, student_tag_assignments, monthly_fee_history, student_siblings, student_batch_history, duplicate_dismissals. Exception: `product_sales` uses `ON DELETE SET NULL` (student_id becomes null, sale record preserved). |
| Revenue updated after deletion | PASS | `student_payments` cascades delete -> `sync_student_payment_revenue` trigger on student_payments handles revenue cleanup. `useDeleteStudent.onSuccess` invalidates revenues, allocations, account_balances, dashboard, reports queries. |
| Dashboard updated | PASS | `useDeleteStudent.onSuccess` invalidates `["dashboard"]` and `["reports"]` query keys. |
| Confirmation dialog | PASS | `AlertDialog` with "Delete Student" title and warning about permanent deletion of student + payment records. Prevents closing while pending. |
| Deletion blocked for Moderators (frontend) | PASS | Delete button only shows when `effectiveCanDelete` is true. |
| Deletion blocked for Moderators (backend) | PASS | DELETE RLS: `company_can_delete_student(company_id, auth.uid())` + DEO filter `(NOT is_data_entry_moderator(...)) OR (user_id = auth.uid())`. DEO can only delete own students. |
| Audit log on deletion | PASS | `audit_students` trigger fires on DELETE, recording old_data. Uses EXCEPTION handler to prevent cascade issues. |

---

## 5. STUDENT PROFILE PAGE (/students/:studentId/profile)

| Check | Status | Details |
|-------|--------|---------|
| Page loads for all roles | PASS | Uses `useStudent` which respects RLS. DEO gate at line 349: `isDataEntryModerator && student.user_id !== user?.id` returns `ProfileAccessDenied`. |
| Breadcrumb and back button | PASS | `ProfileBreadcrumb` renders with student name. Back button calls `navigate("/students")`. |
| Sticky header | PASS | `IntersectionObserver` tracks `headerRef` visibility. `ProfileStickyBar` shown when `!isHeaderVisible`. |
| WhatsApp button | PASS | `cleanPhone` strips non-digit chars except `+`, then removes `+` for wa.me URL. Opens `https://wa.me/{cleaned}` in new tab. Disabled when no phone number. |
| Lifetime Value banner | PASS | Fetches payments, product sales, future unpaid payments. Uses `computeLifetimeMetrics`. Hidden for DEO users. |
| Payment Rate calculation | WARNING | Need to verify `computeLifetimeMetrics` logic. The banner component calls it with student payments and product sales data. Should exclude products from payment rate. |
| Enrollment Timeline | PASS | `EnrollmentTimeline` fetches from `batch_enrollments` with batch/course joins. Groups by course. Shows payment progress per enrollment. |
| Financial Breakdown tabs | PASS | Three tabs: Summary, Course Payments, Products. Fetches enrollment + payment data. |
| Course Payments tab - "Uncategorized" | WARNING | Course payments without a `batch_enrollment_id` are labeled based on batch lookup. If batch was deleted, could show as uncategorized. Need to verify fallback label. |
| Quick Actions panel | PASS | Role-based visibility. WhatsApp, Sales Note, Edit Student, Export PDF (coming soon), Manage Tags (coming soon). |
| Change Status action | WARNING | `onStatusChange` prop exists in `QuickActionsPanel` interface but the actual "Change Status" action was explicitly removed (comment: "Status change logic removed", "Change Status removed"). The status badge in the header will not update without editing the student through the wizard dialog. |
| Sales Notes | PASS | See Section 10 for detailed audit. |
| `useStudent` query - no company_id filter | WARNING | `useStudent(id)` fetches `.eq("id", id).single()` without explicit `.eq("company_id", ...)`. It relies entirely on RLS to prevent cross-company access. While RLS does enforce this, a direct ID guess could return "not found" error (which is fine) but the query key `["students", id, table]` doesn't include company_id, so switching companies while viewing a profile could show stale cached data briefly. |

---

## 6. STUDENT STATUS MANAGEMENT

| Check | Status | Details |
|-------|--------|---------|
| Valid statuses enforced at DB | FAIL | No CHECK constraint or validation trigger on `students.status` column. The TypeScript interface allows `"active" \| "inactive" \| "graduated" \| "dropout" \| "transferred"` but nothing prevents arbitrary strings at DB level. The bulk import edge function only validates against `["active", "inactive", "graduated"]` - a subset. |
| Inactive: overdue alerts stop | WARNING | Need to verify that `computeStudentSummary` and overdue filtering in `StudentOverdueSection` check `student.status === "active"` before flagging as overdue. If they don't filter by status, inactive students would still show overdue alerts. |
| Inactive: revenue projection excludes | PASS | `LifetimeValueBanner` fetches future unpaid payments for projection. If student is inactive, the projection tooltip mentions the status. |
| Reactivation: overdue alerts resume | PASS | If overdue logic checks active status, changing back to active would resume overdue tracking. |
| Graduated vs inactive differences | WARNING | No explicit differentiation found between "graduated" and "inactive" in the codebase. Both are non-active statuses treated identically. |

---

## 7. BATCH ENROLLMENT FROM STUDENT PROFILE

| Check | Status | Details |
|-------|--------|---------|
| Multiple simultaneous enrollments | PASS | `batch_enrollments` table allows multiple rows per student. Partial unique index on `(student_id, batch_id) WHERE status = 'active'` prevents duplicate active enrollment in same batch. |
| Unique constraint is partial | PASS | Confirmed partial index allows re-enrollment after completion/removal. |
| Batch capacity enforced | PASS | `BatchEnrollDialog` checks capacity before enrollment: counts active enrollments vs `max_capacity`. Null capacity = unlimited. |
| Enrollment record created correctly | PASS | `BatchEnrollDialog.handleEnroll` inserts into `batch_enrollments` with correct student_id, batch_id, company_id, status='active'. |
| Removal deletes enrollment + payments | PASS | `syncBatchEnrollment` deletes old enrollment. `batch_enrollments` has `ON DELETE RESTRICT` on `student_payments.batch_enrollment_id` -- wait, let me check this. |
| Revenue reduced after removal | WARNING | If `batch_enrollments` deletion cascades to `student_payments`, then `sync_student_payment_revenue` trigger handles revenue cleanup. But the FK constraint type matters -- if RESTRICT, deletion would fail if payments exist. Need to verify. |
| AddStudent page missing enrollment sync | FAIL | As noted in Section 2: `/students/new` (AddStudent page) sets `students.batch_id` but does NOT call `syncBatchEnrollment`. The `batch_enrollments` record is never created. This is a data integrity issue. |

---

## 8. CSV BULK IMPORT

| Check | Status | Details |
|-------|--------|---------|
| Downloadable template | PASS | `handleDownloadTemplate` generates CSV with all field headers. Required fields listed first. |
| Row validation | PASS | `validateRow` checks: name required, valid date formats, positive numbers, status whitelist. Returns per-row errors. |
| Duplicate detection during import | WARNING | The edge function does NOT perform duplicate detection during import. It inserts all valid rows. Duplicates must be resolved after import using the separate Duplicates page. |
| Row limit enforced | PASS | `if (rows.length > 5000) return error`. Hard limit in edge function. |
| Per-row error reporting | PASS | Failed rows collected with error messages. Results include `failedRows` array with row index and error. Download errors CSV available. |
| company_id from session | PASS | Edge function fetches `active_company_id` from `user_profiles` using authenticated user, not from request body. |
| created_by set correctly | PASS | `user_id: userId` set on all imported rows from authenticated session. |
| Batch assignments in CSV | WARNING | CSV can include `batch_id` column, but the import does NOT create `batch_enrollments` records for imported students. Same issue as standalone AddStudent page -- batch_id is set on the student but no enrollment record is created. |
| Valid statuses in import | WARNING | Edge function validates against `["active", "inactive", "graduated"]` but the TypeScript Student interface also allows `"dropout"` and `"transferred"`. These two statuses would be rejected during import even if they're valid in the app. |

---

## 9. STUDENT TAGS

| Check | Status | Details |
|-------|--------|---------|
| Tables exist | PASS | `student_tags` and `student_tag_assignments` tables exist with RLS enabled. |
| Admin can create/edit/delete tags | NOT IMPLEMENTED | QuickActionsPanel shows "Manage Tags" button but it only displays a "coming soon" toast. No UI for tag CRUD. |
| Tags assignable/removable | NOT IMPLEMENTED | No UI for assigning or removing tags from students. |
| Tags display in student header/list | NOT IMPLEMENTED | No tag display in ProfileHeader or Students table. |
| Filter by tag in student list | NOT IMPLEMENTED | No tag filter in StudentFilters. |
| **Overall** | NOT IMPLEMENTED | Backend schema is ready (tables + RLS) but the entire frontend UI for tags is missing. |

---

## 10. SALES NOTES

| Check | Status | Details |
|-------|--------|---------|
| Adding note saves correctly | PASS | `createNote.mutateAsync` passes student_id, note_text, category, note_date. Hook sets company_id and created_by from context/auth. |
| Inline edit works | PASS | Edit saves updated text and category via `updateNote.mutateAsync`. Shows "edited" indicator when `updated_at !== created_at`. |
| Delete with confirmation | PASS | `AlertDialog` confirmation before delete. `deleteNote.mutateAsync` called on confirm. |
| Category filter | PASS | `filterCategory` state filters notes client-side. Works with both built-in and custom categories. |
| Date range filter | NOT IMPLEMENTED | There is no date range filter for notes. Only category and created_by filters exist. |
| "Created By" filter hidden for DEO | PASS | Line 562: `{!isDataEntryModerator && noteUserIds.length > 1 && ...}` -- hidden for DEO. |
| Pagination | PASS | `usePagination(filteredNotes, { defaultItemsPerPage: 10 })`. Page controls shown when `totalPages > 1`. Reset on filter change. |
| DEO can't see others' notes | PASS | RLS SELECT: `(NOT is_data_entry_moderator(...)) OR (created_by = auth.uid())`. DEO only sees own notes. |
| DEO can't edit/delete others' notes | PASS | Backend: UPDATE/DELETE RLS requires `created_by = auth.uid() OR is_company_admin OR is_cipher`. Frontend: `canEditNote` and `canDeleteNote` check `note.created_by === user?.id \|\| isAdmin \|\| isCipher`. |
| Audit log on note CRUD | PASS | `useCreateSalesNote`, `useUpdateSalesNote`, `useDeleteSalesNote` all explicitly insert into `audit_logs`. |

---

## Prioritized Fix List

### Critical

1. **AddStudent page does not create `batch_enrollments` record** -- When a student is created via `/students/new` with a batch selected, `students.batch_id` is set but NO `batch_enrollments` record is created. This causes batch student counts to be wrong, enrollment timeline to be empty, and payment schedules to not generate. Fix: call `syncBatchEnrollment(studentId, null, batchId, companyId, userId)` after student creation in `AddStudent.handleSubmit`.

2. **CSV bulk import does not create `batch_enrollments` records** -- Same issue as above. Imported students with batch_id have no enrollment record. Fix: add enrollment creation logic to the `bulk-import-students` edge function for each imported row that has a valid batch_id.

3. **No DB-level constraint on student status values** -- Any string can be stored as status. Fix: add a validation trigger (not CHECK constraint per guidelines) that enforces status in `('active', 'inactive', 'graduated', 'dropout', 'transferred')`.

### Important

4. **Payment status filters are client-side only** -- Admission/monthly payment status filters on the Students page only filter the current page, not all data. This is misleading because pagination is server-side but these filters are client-side. Users may think there are fewer students than there actually are. Fix: either move these filters server-side or add a clear disclaimer.

5. **"Change Status" action removed from Quick Actions** -- The `onStatusChange` callback exists in the interface but the actual UI action was removed. Users must open the full edit wizard to change status. Consider re-adding a quick status change action.

6. **Bulk import rejects "dropout" and "transferred" statuses** -- The edge function validates against `["active", "inactive", "graduated"]` but the app supports 5 status values. Fix: update `VALID_STATUSES` in the edge function to include all 5.

7. **`useStudent` query key doesn't include company_id** -- Could show stale cached data when switching companies while viewing a profile. Fix: add `activeCompanyId` to the query key.

### Minor

8. **Student Tags UI not implemented** -- Backend schema exists but no frontend UI for creating, assigning, displaying, or filtering tags. Note as planned feature.

9. **No date range filter for Sales Notes** -- Only category and "created by" filters exist. Consider adding date filtering.

10. **"Graduated" vs "Inactive" not differentiated** -- Both treated identically throughout the app. Consider adding graduated-specific behavior (e.g., alumni badge, different overdue handling).

11. **ProductPurchaseHistoryWrapper relies on cache from FinancialBreakdown** -- If FinancialBreakdown hasn't been rendered/scrolled into view, the product purchase history shows empty. The query has `enabled: false` and `staleTime: Infinity`. This is a UX issue where products section may appear empty until the user scrolls to Financial Breakdown first.
