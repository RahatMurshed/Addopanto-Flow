

# Fix Reset Company Data — CORS, Deletion Order, and Missing Tables

## Root Cause Analysis

Three issues prevent the reset from working:

### Issue 1: CORS Blocking
The `ALLOWED_ORIGINS` list only includes `addopantoflow.lovable.app` and the old preview domain. The current preview domain `58aee540-d716-4564-805b-e26d9615ae54.lovableproject.com` is not listed, so the browser blocks the request entirely.

### Issue 2: Wrong Deletion Order (the `v_batch` error)
The edge function log shows: `record "v_batch" is not assigned yet` when deleting `revenue_sources`.

Chain of events:
1. `revenue_sources` is deleted at position 5 in the list
2. `student_payments.source_id` has a FK to `revenue_sources` with ON DELETE SET NULL
3. This triggers an UPDATE on `student_payments`, firing `validate_student_payment_amount`
4. That trigger function accesses `v_batch.default_admission_fee` — but `v_batch` is only assigned when `student.batch_id IS NOT NULL`
5. For students with no batch, it crashes

Fix: Delete `student_payments` before `revenue_sources`.

### Issue 3: 18+ Missing Tables
The current deletion list has 17 tables. The database has 40+ tables. These are missing:
- `student_tag_assignments`, `student_tags`
- `student_sales_notes`, `sales_note_categories`
- `duplicate_dismissals`
- `product_sales`, `product_stock_movements`, `products`, `product_categories`
- `employee_attendance`, `employee_leaves`, `employee_salary_payments`, `employees`
- `batch_enrollments`
- `profit_distributions`, `loan_repayments`, `loans`, `investments`, `stakeholders`
- `suppliers`, `moderator_permissions`, `registration_requests`

## Changes

### 1. Update CORS in all 7 edge functions

Replace the static `ALLOWED_ORIGINS` array with a dynamic `isAllowedOrigin()` function that checks:
- Exact: `https://addopantoflow.lovable.app`
- Exact: `https://58aee540-d716-4564-805b-e26d9615ae54.lovableproject.com`
- Pattern: `https://*--58aee540-d716-4564-805b-e26d9615ae54.lovable.app` (preview subdomains)

Files:
- `supabase/functions/reset-company-data/index.ts`
- `supabase/functions/bulk-import-students/index.ts`
- `supabase/functions/merge-students/index.ts`
- `supabase/functions/unmerge-students/index.ts`
- `supabase/functions/admin-users/index.ts`
- `supabase/functions/check-ban/index.ts`
- `supabase/functions/company-join/index.ts`

### 2. Fix deletion order and add missing tables in `reset-company-data`

New FK-safe deletion order (children before parents):

```text
1.  student_tag_assignments    (FK -> student_tags, students)
2.  student_tags               (FK -> companies)
3.  student_sales_notes        (FK -> students)
4.  sales_note_categories      (FK -> companies)
5.  duplicate_dismissals       (FK -> students)
6.  product_sales              (FK -> products, students)
7.  product_stock_movements    (FK -> products)
8.  products                   (FK -> product_categories)
9.  product_categories         (FK -> companies)
10. profit_distributions       (FK -> investments)
11. loan_repayments            (FK -> loans)
12. loans                      (FK -> stakeholders)
13. investments                (FK -> stakeholders)
14. stakeholders               (FK -> companies)
15. employee_attendance        (FK -> employees)
16. employee_leaves            (FK -> employees)
17. employee_salary_payments   (FK -> employees)
18. employees                  (FK -> companies)
19. suppliers                  (FK -> companies)
20. allocations                (FK -> revenues, expense_accounts)
21. khata_transfers            (FK -> expense_accounts)
22. expenses                   (FK -> expense_accounts)
23. batch_enrollments          (FK -> batches, students) -- before student_payments due to RESTRICT
24. student_payments           (FK -> students; source_id -> revenue_sources SET NULL) -- BEFORE revenue_sources
25. monthly_fee_history        (FK -> students)
26. student_siblings           (FK -> students)
27. student_batch_history      (FK -> students)
28. revenues                   (FK -> revenue_sources SET NULL)
29. revenue_sources            (FK -> companies) -- AFTER student_payments
30. expense_accounts           (FK -> companies)
31. students                   (FK -> batches)
32. batches                    (FK -> courses)
33. courses                    (FK -> companies)
34. moderator_permissions
35. registration_requests
36. audit_logs
37. currency_change_logs
38. dashboard_access_logs
39. company_join_requests
```

Then delete non-admin memberships (same as before).

Tables NOT deleted (intentionally preserved):
- `companies` — the company entity itself
- `company_memberships` with role='admin' — the admin user
- `user_profiles`, `user_roles` — platform-level user data
- `rate_limits` — system table
- `company_creation_requests` — platform-level

### 3. Deploy all 7 edge functions

All edge functions will be redeployed after CORS and logic updates.

