

# Global Data Synchronization Fix

## Problem
When you edit a student's admission fee, monthly fee, or delete a student on the Student Detail page, the Dashboard, Revenue, Reports, and Student List pages don't update. The `useUpdateStudent` and `useDeleteStudent` hooks only invalidate `["students"]` but miss all financial query keys that depend on student data.

## What Changes

### 1. Fix `useUpdateStudent` in `src/hooks/useStudents.ts`
When a student's admission fee or monthly fee changes, it affects payment summaries, revenue calculations, and dashboard metrics. Add full financial cache invalidation:
- `student_payments`, `revenues`, `allocations`, `account_balances`
- `dashboard`, `reports`, `revenue_summary`, `expense_summary`
- `monthly_fee_history`

### 2. Fix `useDeleteStudent` in `src/hooks/useStudents.ts`
Deleting a student cascades to delete their payments and linked revenues. Add invalidation for:
- `revenues`, `allocations`, `account_balances`
- `dashboard`, `reports`, `revenue_summary`, `expense_summary`

### 3. Fix `useCreateStudent` in `src/hooks/useStudents.ts`
Creating a student with a monthly fee inserts into `monthly_fee_history`. Add invalidation for:
- `monthly_fee_history`, `dashboard`, `reports`

### 4. Enable `refetchOnWindowFocus` for multi-user sync
The global QueryClient in `src/App.tsx` already has `staleTime: 30_000`. Ensure `refetchOnWindowFocus: true` (it's the default, but we'll make it explicit) so when Admin B switches back to the tab, stale data automatically refreshes.

## Technical Details

All changes are in two files:
- `src/hooks/useStudents.ts` -- add missing invalidation calls to all 3 mutation `onSuccess` callbacks
- `src/App.tsx` -- explicitly set `refetchOnWindowFocus: true` in QueryClient defaults

No new files, no schema changes, no new dependencies.

