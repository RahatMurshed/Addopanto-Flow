
# Database and Schema Audit Report

---

## 1. TABLE STRUCTURE

### Tables Found (42 total, including 2 views)

**Data tables (40):** allocations, audit_logs, batch_enrollments, batches, companies, company_creation_requests, company_join_requests, company_memberships, courses, currency_change_logs, dashboard_access_logs, duplicate_dismissals, employee_attendance, employee_leaves, employee_salary_payments, employees, expense_accounts, expenses, investments, khata_transfers, loan_repayments, loans, moderator_permissions, monthly_fee_history, product_categories, product_sales, product_stock_movements, products, profit_distributions, registration_requests, revenue_sources, revenues, sales_note_categories, stakeholders, student_batch_history, student_payments, student_sales_notes, student_siblings, students, suppliers, user_profiles, user_roles

**Views (2):** companies_public, students_safe

| Check | Status | Details |
|-------|--------|---------|
| All PKs are UUID | PASS | Every table uses `id uuid DEFAULT gen_random_uuid()` |
| company_id on tenant tables | PASS | All company-scoped tables have `company_id uuid NOT NULL` |
| created_at timestamps | PASS | Present on all tables |
| updated_at timestamps | WARNING | Missing on: allocations, audit_logs, dashboard_access_logs, duplicate_dismissals, company_join_requests, currency_change_logs, registration_requests. Minor -- most are log/immutable tables. |
| created_by / user_id audit trail | PASS | Tables that need it have user_id or created_by |
| Orphaned tables | WARNING | `moderator_permissions` and `registration_requests` -- unclear if still used by application code. `companies_public` view may be unused. |
| Redundant columns | WARNING | `students.batch_id` is a legacy column superseded by `batch_enrollments`. Still referenced by some code as a fallback. Not harmful but redundant. Similarly `batches.user_id` and `batches.created_by` appear to serve the same purpose. |

---

## 2. PRIMARY AND FOREIGN KEYS

### Foreign Key Relationships

| Check | Status | Details |
|-------|--------|---------|
| Students deleted -> cascade batch_enrollments | PASS | `batch_enrollments_student_id_fkey` ON DELETE CASCADE |
| Students deleted -> cascade student_payments | PASS | `student_payments_student_id_fkey` ON DELETE CASCADE |
| Students deleted -> cascade student_sales_notes | PASS | `student_sales_notes_student_id_fkey` ON DELETE CASCADE |
| Students deleted -> cascade monthly_fee_history | PASS | ON DELETE CASCADE |
| Students deleted -> cascade student_siblings | PASS | ON DELETE CASCADE |
| Students deleted -> cascade duplicate_dismissals | PASS | ON DELETE CASCADE (both a and b) |
| Batches deleted -> cascade batch_enrollments | PASS | ON DELETE CASCADE |
| Courses deleted -> cascade batches | FAIL | `batches_course_id_fkey` is ON DELETE SET NULL, not CASCADE. Deleting a course orphans batches instead of removing them. |
| Companies deleted -> cascade everything | FAIL | 12 company_id FKs use ON DELETE NO ACTION instead of CASCADE. Deleting a company will fail with FK violations. Affected: allocations, expense_accounts, expenses, khata_transfers, monthly_fee_history, revenue_sources, revenues, student_payments, student_sales_notes, student_siblings, students, user_profiles. |
| batch_enrollments deleted -> cascade student_payments | WARNING | `student_payments_batch_enrollment_id_fkey` is ON DELETE SET NULL. Payments become unlinked rather than deleted. This is a design choice but may cause orphaned payment data. |
| Missing FK: student_payments -> batch_enrollments | PASS | FK exists |
| Missing FK: product_sales -> students | PASS | FK exists (ON DELETE SET NULL) |

### Critical FK Issues

**12 tables have `company_id` FK with NO ACTION instead of CASCADE:**
- allocations, expense_accounts, expenses, khata_transfers, monthly_fee_history, revenue_sources, revenues, student_payments, student_sales_notes, student_siblings, students, user_profiles

This means deleting a company record will fail unless all child records are manually deleted first (which the reset-company-data edge function does handle, but direct DB operations will break).

---

## 3. CONSTRAINTS AND VALIDATION

| Check | Status | Details |
|-------|--------|---------|
| CHECK constraints on enum columns | FAIL | No CHECK constraints exist on any table. batch_enrollments.status, student_payments.status, students.status, batches.status are all unconstrained text columns. Any arbitrary string can be inserted. |
| Batch capacity >= 0 | FAIL | No CHECK constraint on `batches.max_capacity`. Negative values are technically allowed. |
| Payment amount > 0 | FAIL | No CHECK constraint on `student_payments.amount` or `expenses.amount`. Zero or negative values can be inserted. |
| Unique active enrollment per student+batch | WARNING | There is a UNIQUE constraint on `(student_id, batch_id)` but it is NOT a partial unique index filtered by `status = 'active'`. This means a student cannot have two enrollments for the same batch even if one is completed. Re-enrollment after completion would require deleting the old record. |
| NOT NULL on critical columns | PASS | company_id, student_id, amount, batch_id are all NOT NULL where needed |

### Recommended Validation Triggers (not CHECK constraints per Supabase guidelines)

The following should be implemented as BEFORE INSERT/UPDATE triggers:
1. `batch_enrollments.status` must be IN ('active', 'completed')
2. `student_payments.status` must be IN ('paid', 'unpaid', 'partial')
3. `students.status` must be IN ('active', 'inactive', 'graduated')
4. `student_payments.amount` must be > 0
5. `batches.max_capacity` must be >= 0 when not null

---

## 4. ROW LEVEL SECURITY (RLS)

| Check | Status | Details |
|-------|--------|---------|
| RLS enabled on all tables | PASS | All 42 tables/views have `rowsecurity = true` |
| SELECT scoped to company_id | PASS | All company-scoped tables use `company_id = get_active_company_id(auth.uid())` |
| INSERT scoped to company_id | PASS | All insert policies check company_id |
| UPDATE scoped to company_id | PASS | Where update is allowed |
| DELETE scoped to company_id | PASS | Where delete is allowed |
| DEO restriction on student_payments | PASS | Policy includes `NOT is_data_entry_moderator(...)` |
| DEO restriction on student_sales_notes | PASS | SELECT filters by `created_by = auth.uid()` for DEO |
| Companies INSERT restricted to Cipher | PASS | Policy: `is_cipher(auth.uid())` |
| user_profiles scoped to own user | PASS | FK to auth.users + policies check user_id |
| Leaked password protection | WARNING | Supabase linter reports leaked password protection is disabled |

---

## 5. INDEXES

| Table | Check | Status | Details |
|-------|-------|--------|---------|
| student_payments | (student_id, company_id) | PASS | `idx_student_payments_company_student` covers this |
| student_payments | (batch_enrollment_id) | PASS | `idx_student_payments_enrollment` |
| student_payments | (status, due_date) | PASS | `idx_student_payments_status_due` |
| batch_enrollments | (student_id, company_id) | PASS | `idx_batch_enrollments_student` |
| batch_enrollments | (batch_id, status) | WARNING | Index exists on `batch_id` alone but not `(batch_id, status)`. Queries filtering active enrollments per batch would benefit from a composite index. |
| students | (company_id, status) | PASS | `idx_students_company_status` |
| students | (company_id, created_by) for DEO | FAIL | No index on `(company_id, user_id)` for DEO filtering. `idx_students_user_id` exists but is not compound with company_id. |
| student_sales_notes | (student_id, company_id) | WARNING | Separate indexes on student_id and company_id exist but no compound index. |
| student_sales_notes | (created_by) | FAIL | No index on `created_by` for DEO filtering |
| audit_logs | (record_id, company_id) | FAIL | No index on `record_id`. Only `company_id` and `user_id` are indexed individually. |

---

## 6. DATA INTEGRITY ISSUES

| Check | Status | Count | Details |
|-------|--------|-------|---------|
| Orphaned batch_enrollments (batch_id not in batches) | PASS | 0 | Clean |
| Orphaned student_payments (student_id not in students) | PASS | 0 | Clean |
| Unlinked payments (batch_enrollment_id IS NULL) | WARNING | 8 | 8 payments have no batch enrollment link. These may be legacy payments from before the enrollment system was introduced. |
| Payments with amount <= 0 | PASS | 0 | Clean |
| Students with invalid batch_id | PASS | 0 | Clean |
| Duplicate active enrollments (same student+batch) | PASS | 0 | Clean |
| NULL company_id on students | PASS | 0 | Clean |

---

## 7. MISSING TABLES

| Table | Status | Details |
|-------|--------|---------|
| student_sales_notes | PASS | Exists |
| student_tags | FAIL | Does not exist |
| student_tag_assignments | FAIL | Does not exist |
| batch_enrollments | PASS | Exists |
| audit_logs | PASS | Exists (note: named `audit_logs` not `audit_log`) |

---

## 8. SCHEMA CONSISTENCY

| Check | Status | Details |
|-------|--------|---------|
| FK column naming (_id suffix) | PASS | Consistent across all tables |
| Date columns (timestamptz vs date) | PASS | Timestamps use `timestamp with time zone`, dates use `date` appropriately |
| Currency/amount columns | PASS | All use `numeric` type |
| Boolean naming (is_ prefix) | WARNING | Inconsistent. `dashboard_access_logs` uses `is_cipher`, `is_anomaly` (correct), but `company_memberships` uses bare names like `data_entry_mode`, `can_add_expense`, `deo_students` (no is_ prefix). Not a bug but inconsistent. |
| Duplicate column purposes | WARNING | `batches` has both `user_id` and `created_by` -- likely both reference the creating user |

---

## Prioritized Fix List

### Critical (will cause bugs or security issues)

1. **12 company_id FKs missing CASCADE** -- allocations, expense_accounts, expenses, khata_transfers, monthly_fee_history, revenue_sources, revenues, student_payments, student_sales_notes, student_siblings, students, user_profiles all use ON DELETE NO ACTION. Company deletion will fail at the database level.

2. **No validation triggers on enum columns** -- batch_enrollments.status, student_payments.status, students.status accept any text value. Invalid data can be inserted silently.

3. **No validation trigger on payment amount** -- student_payments.amount and expenses.amount can be zero or negative.

### Important (causes data quality issues)

4. **Courses -> Batches FK is SET NULL, not CASCADE** -- Deleting a course leaves orphaned batches with null course_id instead of cleaning up.

5. **batch_enrollments unique constraint is total, not partial** -- `UNIQUE(student_id, batch_id)` prevents re-enrollment after completion. Should be a partial unique index on `status = 'active'` only.

6. **Missing tables: student_tags, student_tag_assignments** -- Referenced in earlier requirements but never created.

7. **Missing index: students (company_id, user_id)** for DEO filtering performance.

8. **Missing index: audit_logs (record_id)** for entity lookup.

9. **Missing index: student_sales_notes (created_by)** for DEO filtering.

10. **Missing compound index: batch_enrollments (batch_id, status)** for enrollment count queries.

### Minor (improvements)

11. **8 unlinked payments** (batch_enrollment_id IS NULL) -- likely legacy data; should be investigated and linked or documented.

12. **Leaked password protection disabled** -- Enable in auth settings.

13. **Boolean naming inconsistency** in company_memberships -- cosmetic, no functional impact.

14. **Redundant students.batch_id column** -- Legacy field; should be deprecated once all code uses batch_enrollments exclusively.

15. **Redundant batches.user_id + created_by** -- Same data stored twice.

16. **Possibly unused tables**: moderator_permissions, registration_requests, companies_public view -- verify if still referenced by code.
