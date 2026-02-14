

# Fix: Cross-Page Data Synchronization

## Problem
When you add, edit, or delete a student payment, revenue, expense, or transfer, the changes only update the page you're on. The Dashboard and Reports pages show stale data because they use independent query keys that aren't being invalidated by mutation hooks.

## Solution
Add `["dashboard"]` and `["reports"]` to the cache invalidation list in every mutation hook that modifies financial data. This ensures all pages refresh automatically when any data changes.

## Changes

### 1. `src/hooks/useStudentPayments.ts`
Add invalidation for `["dashboard"]`, `["reports"]`, `["revenue_summary"]`, and `["expense_summary"]` in all three mutations (create, update, delete).

### 2. `src/hooks/useRevenues.ts`
Add `["dashboard"]` and `["reports"]` invalidation to create, update, and delete revenue mutations.

### 3. `src/hooks/useExpenses.ts`
Add `["dashboard"]` and `["reports"]` invalidation to create, update, and delete expense mutations. Also add `["reports"]` to the expense summary and account balance hooks where missing.

### 4. `src/hooks/useKhataTransfers.ts`
Add `["reports"]` invalidation to create and delete transfer mutations (they already invalidate `["dashboard"]`).

### 5. `src/hooks/useExpenseAccounts.ts`
Add `["dashboard"]`, `["reports"]`, and `["account_balances"]` invalidation to create, update, and delete expense account mutations -- since changing allocation percentages or accounts affects balances across the app.

### 6. `src/hooks/useRevenueSources.ts`
Add `["dashboard"]` and `["reports"]` invalidation to the create revenue source mutation.

## Technical Details

The full invalidation map after this fix:

| Mutation Hook | Query Keys Invalidated |
|---|---|
| Student Payment (create/update/delete) | `student_payments`, `students`, `revenues`, `allocations`, `account_balances`, `dashboard`, `reports`, `revenue_summary`, `expense_summary` |
| Revenue (create/update/delete) | `revenues`, `allocations`, `dashboard`, `reports` |
| Expense (create/update/delete) | `expenses`, `account_balances`, `dashboard`, `reports` |
| Khata Transfer (create/delete) | `khata_transfers`, `account_balances`, `dashboard`, `reports` |
| Expense Account (create/update/delete) | `expense_accounts`, `account_balances`, `dashboard`, `reports` |
| Revenue Source (create) | `revenue_sources`, `dashboard`, `reports` |

This is a lightweight fix -- no schema changes, no new components, just adding cache invalidation calls to existing mutation hooks.

