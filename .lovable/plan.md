

# Implement Remaining Fund Tracking Integration

## What's Already Done
- Database migration (columns on investments, loans, expenses + trigger)
- `SourceOfFundsStep` and `LoanDisbursementStep` components
- `FundUsageTab` component
- `useFundTracking.ts` hooks
- `ExpenseDialog` with funding source UI
- `AddStakeholder` with Step 4 flow
- Type definitions updated

## What's Missing

### 1. Fund Usage Tab Not Rendered in Stakeholder Detail
`FundUsageTab` is imported in `StakeholderDetail.tsx` but never used. Both `InvestorDetails` and `LenderDetails` need Tabs wrapping their content with an "Overview" tab (existing cards) and a "Fund Usage" tab rendering `FundUsageTab`.

**File:** `src/pages/StakeholderDetail.tsx`
- Wrap `InvestorDetails` content in a `Tabs` component with "Overview" and "Fund Usage" tabs
- Wrap `LenderDetails` content in a `Tabs` component with "Overview", "Repayments" (existing history), and "Fund Usage" tabs
- Pass investment/loan IDs and stakeholder type to `FundUsageTab`

### 2. Expense Funding Fields Not Passed to Backend
The `handleCreate` and `handleUpdate` functions in `Expenses.tsx` only destructure 4 fields (amount, date, expense_account_id, description), discarding the funding fields from `ExpenseFormResult`.

**File:** `src/pages/Expenses.tsx`
- Update `handleCreate` to accept and pass all `ExpenseFormResult` fields (funded_by_type, funded_by_id, funded_by_reference, matches_loan_purpose, purpose_notes, invoice_number, vendor_name)
- Update `handleUpdate` similarly

### 3. Dashboard Expense Dialog Not Passing Funding Fields
Same issue in Dashboard -- the expense dialog's `onSave` callback only passes 4 basic fields.

**File:** `src/pages/Dashboard.tsx`
- Update the `ExpenseDialog` onSave handler to pass all funding fields through to `createExpense.mutateAsync`

### 4. Query Invalidation for Fund Tracking
When expenses with funding sources are created/updated/deleted, fund-related queries need to be invalidated so balances refresh.

**File:** `src/hooks/useExpenses.ts`
- Add invalidation for `fundable-investments`, `fundable-loans`, `fund-utilization-summary`, and `funded-expenses` query keys in `useCreateExpense`, `useUpdateExpense`, and `useDeleteExpense`

### 5. Dashboard Fund Utilization Overview
The Financial Obligations section needs a fund utilization summary showing total received, allocated, and unallocated amounts.

**File:** `src/pages/Dashboard.tsx`
- Import `useFundUtilizationSummary` from `useFundTracking`
- Add a utilization overview section below the existing Financial Obligations card showing:
  - Summary cards: Total Received, Total Allocated, Unallocated
  - Breakdown by source type (Investment vs Loan funds)
  - Individual fund status with progress bars

## Files to Modify
| File | Change |
|---|---|
| `src/pages/StakeholderDetail.tsx` | Add Fund Usage tab to investor and lender views |
| `src/pages/Expenses.tsx` | Pass funding fields in handleCreate/handleUpdate |
| `src/pages/Dashboard.tsx` | Pass funding fields in expense dialog + add utilization overview |
| `src/hooks/useExpenses.ts` | Add fund query invalidation |

