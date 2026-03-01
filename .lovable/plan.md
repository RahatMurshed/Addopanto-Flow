

# System Sync Audit Report and Fix Plan

## Executive Summary

After a thorough audit of the entire financial data flow, I found **7 sync issues** across the system. Below is the detailed report and fix plan.

---

## Issue 1: Employee Salary Missing from Realtime Sync (CRITICAL)

**Status:** Unsynced
**Impact:** When User A records a salary payment, User B (in another tab) will NOT see updated expense balances or salary records until they manually refresh.

The `useRealtimeSync.ts` hook subscribes to 15 tables but is **missing** `employee_salary_payments`. Since salary payments now create linked expense records, the expense table change IS captured, but the salary tab itself won't refresh for other users.

**Fix:** Add `employee_salary_payments` to `TABLE_INVALIDATION_MAP`, `TABLE_LABELS`, and the channel subscriptions in `useRealtimeSync.ts`.

---

## Issue 2: Product Sale Missing Key Query Invalidations (MEDIUM)

**Status:** Partially synced
**Impact:** After recording a product sale, the Dashboard "all-time totals" card, Reports page summaries, and account balances may show stale data.

`useCreateProductSale` only invalidates: `product-sales`, `products`, `revenues`, `product-stock-movements`.

It is **missing**: `dashboard`, `reports`, `account_balances`, `allocations`, `revenue_summary_rpc`, `dashboard-totals`.

Similarly, `useDeleteProductSale` is missing these same keys.

**Fix:** Add the missing invalidation keys to both `useCreateProductSale` and `useDeleteProductSale` in `useProductSales.ts`.

---

## Issue 3: Salary Payment Missing `dashboard-totals` and RPC Summary Invalidation (MEDIUM)

**Status:** Partially synced
**Impact:** Dashboard all-time totals (which use the `get_dashboard_totals` RPC) won't refresh after a salary payment. The Reports page RPC summaries (`expense_summary_rpc`) also won't refresh.

`useCreateSalaryPayment` and `useDeleteSalaryPayment` invalidate `dashboard` and `reports` but miss `dashboard-totals`, `expense_summary_rpc`, `expense_summary`, and fund-tracking keys.

**Fix:** Add `dashboard-totals`, `expense_summary`, `expense_summary_rpc`, and fund-tracking invalidation keys.

---

## Issue 4: `dashboard-totals` Query Key Not Invalidated by Core Hooks (MEDIUM)

**Status:** Unsynced
**Impact:** The Dashboard uses a separate `dashboard-totals` query key for its RPC-based all-time totals. But `useCreateRevenue`, `useCreateExpense`, `useCreateStudentPayment` etc. invalidate `dashboard` -- not `dashboard-totals`. These are different keys, so the all-time totals card may be stale after any financial operation.

**Fix:** Add `dashboard-totals` invalidation to all financial mutation hooks: `useRevenues`, `useExpenses`, `useStudentPayments`, `useKhataTransfers`, and `useProductSales`.

---

## Issue 5: Revenue Page and Expense Page Missing `dashboard-totals` (LOW)

**Status:** Minor
**Impact:** Same root cause as Issue 4. The Revenue and Expenses pages themselves work fine, but navigating to Dashboard afterward may show stale all-time totals until the query refetches on its own (staleTime expiry).

**Fix:** Covered by Issue 4's fix.

---

## Issue 6: `useCreateProductSale` Doesn't Create Allocations (BUSINESS LOGIC)

**Status:** Potential issue
**Impact:** When a manual revenue is created via `useCreateRevenue`, it auto-generates allocation records for each expense account. But product sales generate revenue via a **database trigger** (`is_system_generated = true`). The DB trigger likely creates the revenue record but may not create allocations.

**Analysis needed:** This depends on the DB trigger implementation. If the trigger only inserts into `revenues` without calling allocation logic, then product sale revenue won't be allocated to expense sources.

**Fix:** Verify the DB trigger. If allocations are missing, either update the trigger or add allocation logic to `useCreateProductSale`.

---

## Issue 7: Realtime Sync Missing Employee Tables (LOW)

**Status:** Unsynced
**Impact:** `employee_attendance` and `employee_leaves` are not in the realtime sync. Since we've removed these tabs from the UI, this is low priority but the tables still exist in the DB.

**Fix:** Optional - can be skipped since these features are removed from EmployeeDetail.

---

## Summary Table

```text
+---+------------------------------------------+-----------+--------------------+
| # | Issue                                    | Severity  | File(s) to Change  |
+---+------------------------------------------+-----------+--------------------+
| 1 | Salary missing from realtime sync        | CRITICAL  | useRealtimeSync.ts |
| 2 | Product sale missing query invalidations | MEDIUM    | useProductSales.ts |
| 3 | Salary missing dashboard-totals/RPC keys | MEDIUM    | useEmployees.ts    |
| 4 | dashboard-totals not invalidated by core  | MEDIUM    | useRevenues.ts,    |
|   | financial hooks                          |           | useExpenses.ts,    |
|   |                                          |           | useStudentPayments |
|   |                                          |           | useKhataTransfers  |
| 5 | (Covered by #4)                          | LOW       | -                  |
| 6 | Product sale allocations (needs DB check) | UNKNOWN   | useProductSales.ts |
| 7 | Employee tables removed from UI          | LOW/SKIP  | -                  |
+---+------------------------------------------+-----------+--------------------+
```

## Implementation Plan

### Step 1: Fix useRealtimeSync.ts (Issue 1)
- Add `employee_salary_payments` entry to `TABLE_INVALIDATION_MAP` with keys: `["employee-salary", "employees", "expenses", "account_balances", "dashboard", "dashboard-totals", "reports"]`
- Add to `TABLE_LABELS`: `"Salary payments"`
- Add `.on("postgres_changes", ...)` subscription for `employee_salary_payments`

### Step 2: Fix useProductSales.ts (Issue 2)
- Add to both `useCreateProductSale` and `useDeleteProductSale` onSuccess:
  - `dashboard`, `dashboard-totals`, `reports`, `account_balances`, `allocations`, `revenue_summary_rpc`, `revenue_summary`

### Step 3: Fix useEmployees.ts (Issue 3)
- Add to both salary mutation onSuccess handlers:
  - `dashboard-totals`, `expense_summary`, `expense_summary_rpc`

### Step 4: Fix core financial hooks (Issue 4)
- Add `dashboard-totals` invalidation to onSuccess of:
  - `useCreateRevenue`, `useUpdateRevenue`, `useDeleteRevenue`
  - `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`
  - `useCreateStudentPayment`, `useUpdateStudentPayment`, `useDeleteStudentPayment`
  - `useCreateKhataTransfer` (need to check this hook too)

### Step 5: Verify product sale DB trigger (Issue 6)
- Query the database to check if the trigger that creates revenue from product sales also creates allocation records
- If not, add allocation creation to `useCreateProductSale`

No database migrations needed -- all fixes are frontend query cache invalidation and realtime subscription updates.

