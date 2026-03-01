

## Minor Fixes: Cache Sync, Allocation Tooltip, and Financial Consistency Check

### 1. Dashboard/Reports Cache Consistency

**Problem:** Dashboard uses query key `["dashboard", user?.id, activeCompanyId]` while Reports uses `["revenue_summary_rpc", ...]` and `["expense_summary_rpc", ...]`. These are completely independent caches, so after recording a payment, Dashboard might show stale data while Reports is up-to-date (or vice versa).

**Fix:** In the Dashboard's `dashboardData` query, add a post-mutation invalidation that also clears the RPC summary keys. Specifically:
- In `useCreateRevenue`, `useUpdateRevenue`, `useDeleteRevenue` -- add `queryClient.invalidateQueries({ queryKey: ["dashboard"] })` alongside existing invalidations
- In `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense` -- same pattern
- In `useRealtimeSync.ts`, add `"dashboard"` and `"revenue_summary_rpc"` / `"expense_summary_rpc"` to the `TABLE_INVALIDATION_MAP` for `revenues` and `expenses` tables

**Files:** `src/hooks/useRevenues.ts`, `src/hooks/useExpenses.ts`, `src/hooks/useRealtimeSync.ts`

---

### 2. Allocations "All-Time" Tooltip on Reports

**Problem:** Account balance breakdown on Reports/Dashboard shows cumulative all-time totals even when a date filter is active. Users may think these are filtered.

**Fix:** Add an info tooltip on the account breakdown section in `Reports.tsx`:
- Next to the "Account Balances" card title, add an `Info` icon with a Tooltip: "Balances shown are cumulative all-time totals and are not affected by the date filter."

**Files:** `src/pages/Reports.tsx`

---

### 3. Financial Consistency Check (RPC + Cron Integration)

**Problem:** Revenue/payment consistency passed with zero data. Need an early warning system that runs daily.

**Implementation:**

**A. Create database function `verify_financial_consistency`:**
- Takes `_company_id UUID` as parameter
- Checks 3 conditions:
  1. `student_payments` with status not linked to any `revenues` entry (via `student_payment_id`)
  2. Duplicate `revenues` entries for the same `student_payment_id`
  3. `revenues` entries where `amount` differs from linked `student_payments.amount`
- For each discrepancy found, inserts a row into `audit_logs` with `action = 'financial_consistency_warning'` and details in `new_data`
- Returns a summary JSON with counts

**B. Update `auto-complete-batches` edge function:**
- After batch completion logic, fetch all distinct `company_id` values from `companies` table
- For each company, call `supabase.rpc("verify_financial_consistency", { _company_id: companyId })`
- Include results in the response

**C. Migration:** Single migration file creating the `verify_financial_consistency` function.

**Files:**
- New migration for `verify_financial_consistency` RPC function
- `supabase/functions/auto-complete-batches/index.ts` -- add consistency check call

---

### 4. Timezone Flag (Documentation Only)

**Action:** Add a `timezone` column (nullable text, default null) to the `companies` table via migration. No UI changes yet -- this is a placeholder for production use. When set, date comparisons in reporting should use it. For now, just the schema change.

**Files:** Same migration as item 3 above.

---

### Summary of Changes

| Item | Files | Type |
|---|---|---|
| Cache sync | `useRevenues.ts`, `useExpenses.ts`, `useRealtimeSync.ts` | Code edit |
| Allocation tooltip | `Reports.tsx` | Code edit |
| Consistency RPC | New migration | DB migration |
| Cron integration | `auto-complete-batches/index.ts` | Code edit |
| Timezone column | Same migration | DB migration |

