

# Simplify Employee Detail Page and Sync Salary with Expense System

## Overview
Remove the Attendance, Performance, and Leaves tabs from the Employee Detail page. Keep only Profile and Salary. When recording a salary payment, automatically create an expense record in the selected expense source account so the payment flows through the entire financial system (Dashboard, Revenue, Expenses, Reports, Expense Source balances).

## Changes

### 1. Simplify EmployeeDetail.tsx - Remove unused tabs and features
- Remove the Attendance, Performance, and Leaves tab content and all related state/hooks
- Remove the performance score KPI widget from the header
- Remove imports for `useEmployeePerformance`, attendance/leave hooks, chart components
- Keep only **Profile** and **Salary** tabs (2-column tab layout)
- Remove the salary visibility toggle -- salary tab is always visible for users who can manage employees

### 2. Add expense source selector to salary payment dialog
- Fetch expense accounts using `useExpenseAccounts()` hook
- Add a **Select** dropdown in the salary recording dialog labeled "Expense Source" (required field)
- This lets users choose which expense account (khata) the salary should be deducted from

### 3. Auto-create expense record when salary is recorded
- In `handlePaySalary`, after inserting the salary payment, also call `useCreateExpense` to insert an expense record with:
  - `expense_account_id`: the selected expense source
  - `amount`: the net salary amount
  - `date`: the payment date
  - `description`: auto-generated like "Salary - [Employee Name] - [Month]"
- This ensures the salary payment:
  - Appears in the Expenses page
  - Deducts from the selected expense account balance
  - Reflects in Dashboard totals (revenue vs expenses)
  - Shows in Reports page charts and summaries

### 4. Handle salary deletion (reverse the expense)
- When deleting a salary payment, also delete the corresponding expense record
- To link them, store the salary payment ID in the expense description or add a reference
- Approach: use a convention in the description field (e.g., `[SALARY:payment_id]`) to find and delete the linked expense when a salary record is deleted

### 5. Invalidate financial queries on salary operations
- After creating/deleting salary+expense, invalidate:
  - `expenses`, `account_balances`, `dashboard`, `reports`, `expense_summary_rpc`
  - This ensures all pages stay in sync

## Technical Details

**Files modified:**
- `src/pages/EmployeeDetail.tsx` -- Major simplification (remove ~400 lines of attendance/performance/leaves UI), add expense source selector to salary dialog, integrate expense creation
- `src/hooks/useEmployees.ts` -- Update `useCreateSalaryPayment` and `useDeleteSalaryPayment` to also create/delete linked expense records and invalidate financial queries

**No database migrations needed** -- we use the existing `expenses` table with existing columns.

