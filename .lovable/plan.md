

# Fix: Backfill Missing Expense Records for Old Salary Payments

## Root Cause

You have **12 salary payments** recorded, but only **6 have linked expense records** on the Expenses page. The missing 6 were created during a data restore (before the salary-to-expense sync feature existed). That's why you see the salary on the employee's page but NOT on the Expenses page.

```text
+---+------------------+--------+----------+--------------+
| # | Employee         | Month  | Amount   | Has Expense? |
+---+------------------+--------+----------+--------------+
| 1 | Jahangir Alam    | 2026-04| 22,000   | YES          |
| 2 | Jahangir Alam    | 2026-02| 22,000   | YES          |
| 3 | Raju Miah        | 2026-03| 12,000   | YES          |
| 4 | Mohammad Hasan   | 2026-03| 25,000   | YES          |
| 5 | Jahangir Alam    | 2026-03| 22,000   | YES          |
| 6 | Ayesha Siddiqua  | 2026-03| 18,000   | YES          |
| 7 | Mohammad Hasan   | 2026-02| 25,000   | MISSING      |
| 8 | Raju Miah        | 2026-02| 12,000   | MISSING      |
| 9 | Jahangir Alam    | 2026-02| 22,000   | MISSING      |
|10 | Ayesha Siddiqua  | 2026-03| 18,000   | MISSING      |
|11 | Ayesha Siddiqua  | 2026-02| 18,000   | MISSING      |
|12 | Mohammad Hasan   | 2026-03| 25,000   | MISSING      |
+---+------------------+--------+----------+--------------+
```

All future salary recordings will work correctly (the fix is already in place). We just need to backfill the 6 old records.

## Fix Plan

### Step 1: Backfill missing expense records via SQL migration

Write a one-time SQL migration that:
- Finds all `employee_salary_payments` that have NO matching expense record (no `[SALARY:id]` in any expense description)
- For each, creates an expense record with:
  - `amount` = the salary's `net_amount`
  - `date` = the salary's `payment_date`
  - `description` = `Salary - [employee_name] - [month] [SALARY:salary_id]`
  - `expense_account_id` = the company's first/default "Salary" expense account
  - `company_id` and `user_id` from the salary record

### Step 2: Add a database trigger to prevent future gaps

Create a Postgres trigger on `employee_salary_payments` INSERT that automatically creates the linked expense record at the database level. This ensures the expense is ALWAYS created even if the frontend code fails or is bypassed (e.g., during data restores).

This makes the system bulletproof -- no more missing expenses regardless of how salary records are created.

## Technical Details

**Database migration (single SQL script):**
1. Backfill query joins `employee_salary_payments` with `employees` to get names, LEFT JOINs with `expenses` to find gaps, and INSERTs missing expense records
2. The trigger function `fn_auto_create_salary_expense()` fires AFTER INSERT on `employee_salary_payments` and creates the linked expense automatically
3. The `useCreateSalaryPayment` hook's manual expense insertion will be made idempotent (check if trigger already created it) to avoid duplicates during the transition

**Frontend change:**
- Update `useCreateSalaryPayment` in `useEmployees.ts` to skip manual expense creation if a trigger-created expense already exists (prevents duplicates)

