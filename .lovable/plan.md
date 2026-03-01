# Comprehensive End-to-End Integration Test Plan

## Overview

This plan creates a temporary edge function (`seed-test-data`) to insert realistic test data into the Grammar Addopanto company (`0f108cf2-94a8-4e36-b117-7a786ac6b51e`), then runs 12 structured tests against the seeded data. The edge function is deleted after testing.

**Key context discovered:**

- Company ID: `0f108cf2-94a8-4e36-b117-7a786ac6b51e`, Admin user: `23bc783f-4df6-4581-8022-e6185bfdec1c`
- Database currently has 0 students for this company
- `student_payments` cascade-deletes when student is deleted (`ON DELETE CASCADE`)
- `product_sales` sets null on student delete (`ON DELETE SET NULL`)
- `remove_student_from_batch` RPC handles batch removal with revenue cleanup
- `get_dashboard_totals` uses direct SUM queries on `revenues` and `expenses` tables (no row limit issue for totals)
- `verify_financial_consistency` RPC detects orphan payments, duplicate revenues, and amount mismatches

---

## STEP 1: Create and Deploy `seed-test-data` Edge Function

### File: `supabase/functions/seed-test-data/index.ts`

A single POST endpoint using the service role key to bypass RLS. Inserts data in FK-safe order:

1. **Revenue Sources** (2): "Tuition Fees", "Product Sales"
2. **Expense Accounts** (3): "Rent" (40%), "Utilities" (30%), "Marketing" (30%)
3. **Product Categories** (1): "Study Materials"
4. **Courses** (3): "English Mastery", "Practice Club", "Advanced Writing"
5. **Batches** (5):
  - English Mastery B1: 6 months ago to 2 months ago (completed)
  - English Mastery B2: 2 months ago to +2 months (active)
  - Practice Club B1: 1 month ago to +3 months (active)
  - Practice Club B2: 3 months ago to +1 month (active)
  - Advanced Writing B1: 5 months ago to 1 month ago (completed)
6. **Products** (3): Grammar Workbook (250 BDT), Notebook Set (150 BDT), Pen Pack (80 BDT)
7. **Students** (20): Realistic BD names, phones (01XXX-XXXXXX format), statuses (12 active, 3 inactive, 2 graduated, 2 dropout, 1 inquiry/"Test Multi")
8. **Batch Enrollments** (22): 15 active students in active batches, 3 in completed batches (status=completed), "Test Multi" in English Mastery B2 + Practice Club B1
9. **Monthly Fee History**: One baseline record per student
10. **Student Payments** (~60+ records):
  - 5 students fully paid (admission + all monthly)
    - 4 partially paid (2-3 months paid)
    - 3 overdue (unpaid with past due_dates)
    - 2 with partial status payments
    - 1 admission-only (monthly all unpaid)
    - "Test Multi" with payments across both enrollments
11. **Revenue Records**: Auto-generated via DB triggers for paid payments (verified via consistency check)
12. **Product Sales** (5): Across 5 students, mix of paid/pending/partial
13. **Expenses** (10): Across 3 expense accounts, last 3 months
14. **Sales Notes** (5): 3 on "Test Multi", 2 on another student

### Config update: `supabase/config.toml`

Add `[functions.seed-test-data]` with `verify_jwt = false`.

### Idempotency check

The function will refuse to run if students already exist for this company.

---

## STEP 2: Deploy, Invoke, and Verify Seed

1. Deploy the edge function
2. Invoke via `curl_edge_functions` with POST
3. Verify counts via SQL queries:
  - Students = 20
  - Batches = 5
  - Enrollments = 22
  - Payments > 50
  - Product sales = 5
  - Expenses = 10

---

## STEP 3: Run 12 Tests via SQL Queries and Browser

### Test 1 -- Dashboard Stats Accuracy

- Query `SELECT SUM(amount) FROM revenues WHERE company_id = '...'`
- Query `SELECT SUM(amount) FROM expenses WHERE company_id = '...'`
- Calculate net and compare with `get_dashboard_totals` RPC output
- Navigate to dashboard in browser, extract displayed values, compare

### Test 2 -- Overdue Detection

- Query unpaid payments with due_date < today for active students in active batches
- Verify inactive/graduated/dropout students are excluded
- Navigate to a batch detail page in browser, check overdue section

### Test 3 -- Student Profile Financial Accuracy (Test Multi)

- Query all payments, enrollments, product sales for "Test Multi"
- Calculate expected lifetime value, payment rate, revenue projection
- Navigate to Test Multi's profile in browser, compare displayed values

### Test 4 -- Partial Payment Status

- Query student_payments where status = 'partial'
- Verify amount < expected monthly fee
- Check Financial Breakdown display in browser

### Test 5 -- Cascade Delete Test

- Record total revenue before delete
- Pick a student with 3+ paid payments, note their total
- Delete via Supabase query (service role)
- Verify revenue decreased, no orphaned records remain

### Test 6 -- Remove From Batch Test

- Pick a student with paid payments in a batch
- Call `remove_student_from_batch` RPC
- Verify student exists, enrollment gone, payments deleted, revenue decreased

### Test 7 -- Multi-Enrollment Payment Recording

- Browser test: open Test Multi's profile, attempt to record payment
- Verify batch selector shows both enrollments
- (May be limited by browser automation capabilities)

### Test 8 -- Batch Auto-Completion

- Query batch statuses for completed batches (English Mastery B1, Advanced Writing B1)
- Verify enrollments in those batches have status = 'completed'
- Note: The seed function will insert these with status='completed' directly since end_date is past

### Test 9 -- Revenue vs Payment Consistency

- Run the 3 consistency queries (orphans, duplicates, mismatches)
- Report exact counts

### Test 10 -- 1000-Row Limit Stress Test

- Insert 1100 additional payment rows via service role
- Query `get_dashboard_totals` and verify it returns correct total (it uses SUM, not row fetch)
- Clean up extra rows after

### Test 11 -- Financial Consistency Checker

- Insert one intentional orphan payment (paid, no revenue)
- Call `verify_financial_consistency` RPC
- Check audit_logs for warning entry
- Clean up

### Test 12 -- DEO Data Isolation

- This requires logging in as a DEO user in the browser -- will be tested if a DEO account exists, otherwise reported as SKIPPED

---

## STEP 4: Cleanup

1. Delete the `seed-test-data` edge function code and config entry
2. Remove deployed function via `delete_edge_functions`
3. Test data remains in the database for ongoing manual testing

---

## STEP 5: Report

Generate a structured report with PASS/FAIL/PARTIAL for each of the 12 tests, exact values found vs expected, and a prioritized bug list.

---

## Technical Notes

- The seed function uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY` to bypass all RLS
- Revenue records for "paid" payments should be auto-generated by database triggers (the `sync_student_payment_to_revenue` trigger). If not, the seed function will insert them manually.
- Completed batches are inserted with `status: 'completed'` directly since auto-complete only runs via cron
- Payment schedules are generated inline in the seed function (not via the frontend's `generatePaymentSchedule` utility)
- `product_sales` with `payment_status: 'paid'` should trigger revenue creation via the `sync_product_sale_to_revenue` trigger
- All monetary amounts use BDT (the company's default currency)  

  ### Three Things to Watch
  **1 — Test 12 (DEO Isolation) may be skipped:** If no DEO account exists the test gets skipped. Tell Lovable:
  > Before running the seed function, create a test DEO user account in the test company with minimal permissions. This makes Test 12 testable rather than skipped.
  **2 — Test 8 (Batch Auto-Completion) is pre-seeded as completed:** The seed function inserts completed batches directly with `status = 'completed'` — this doesn't actually test the auto-complete cron. Tell Lovable:
  > For Test 8, additionally create one extra batch with `end_date = yesterday` and `status = 'active'` — then manually trigger the `auto-complete-batches` edge function and verify it correctly changes this batch to `completed`. This tests the actual cron logic not just pre-seeded data.
  **3 — Test 7 (Multi-Enrollment Payment Recording) is browser-dependent:** Lovable may not be able to fully automate this. Tell Lovable:
  > For Test 7, at minimum verify via SQL that after seeding, "Test Multi" has exactly 2 `batch_enrollments` rows with different `batch_id` values, and that existing payments are correctly separated by `batch_enrollment_id`. Mark browser interaction portion as manual verification needed.
  ---
  ### One Addition I Recommend
  Add this to the test plan before Step 4 cleanup:
  > **Test 13 — Billing Start Month Test:** Enroll a new student in Practice Club Batch 1 (which started 1 month ago) with `billing_start_month` set to the current month. Verify that the generated payment schedule starts from this month — NOT from the batch start date 1 month ago. Verify no overdue rows are created for the past month. This tests the `billing_start_month` fix from A4.