

## Fix Data Entry Operator (DEO) Role Issues — ✅ COMPLETED

### Summary
Fixed several DEO permission enforcement issues across Dashboard, Revenue, Expenses, and Khatas pages.

### Changes Made

#### 1. Dashboard Quick Action Cards — ✅ Fixed
- Added `onClick` handlers to all quick action cards
- "Add Student" opens StudentDialog, "Create Batch" opens BatchDialog
- "Add Revenue" opens RevenueDialog, "Add Expense" opens ExpenseDialog
- "Record Payment" navigates to /students (requires student context)
- Added dialog components and mutation hooks

#### 2. Route Protection for Revenue, Expenses, Khatas — ✅ Fixed
- Added `useEffect` redirect guards that send DEOs without permissions back to `/dashboard`
- Revenue: redirects if DEO without `canAddRevenue`
- Expenses: redirects if DEO without `canAddExpense`
- Khatas: redirects if DEO without `canAddExpenseSource`

#### 3. Financial Data Hidden from DEOs — ✅ Fixed (was already done)
- Summary cards, period overview, charts wrapped in `{!isDataEntryOperator && (...)}`
- Export buttons hidden for DEOs on Revenue and Expenses pages
- Deficit warnings, account balances, transfer history hidden for DEOs

#### 4. Batches/Students Detail Navigation — Already handled
- Eye button hidden for DEOs on Students page
- BatchDetail redirects DEOs without `canEditBatch`

### Files Modified
- `src/pages/Dashboard.tsx` — quick action onClick + dialogs
- `src/pages/Revenue.tsx` — DEO redirect guard + hide export buttons
- `src/pages/Expenses.tsx` — DEO redirect guard + hide export buttons
- `src/pages/Khatas.tsx` — DEO redirect guard
