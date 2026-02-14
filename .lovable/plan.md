

# Per-Month Overdue Section for Batches

## Overview
Add a per-month overdue section to both the Batches list page and the Batch Detail page, replacing the "Completion" card on the detail page with a monthly overdue summary.

## Changes

### 1. Batch Detail Page (`src/pages/BatchDetail.tsx`)

**Replace the "Completion" card (lines 416-440) with a "Monthly Overdue" card:**
- Show the number of overdue students and total overdue amount for the selected month (reuses the existing `selectedMonth` state and `MonthYearPicker`)
- Add a second `MonthYearPicker` inside this card so it has its own independent month filter (separate from the "This Month" card)
- Display: overdue student count, total overdue amount, and a list of overdue student names for that specific month
- Color-coded with destructive/red theme to match existing overdue styling

**Computation updates in `batchStats`:**
- Add `selectedOverdueMonth` state for the new card's independent month picker
- Compute per-month overdue: iterate through all summaries, check if the selected month appears in `monthlyOverdueMonths` or `monthlyPartialMonths`, and sum up remaining amounts
- Return `perMonthOverdueCount`, `perMonthOverdueAmount`, and a list of overdue student details for that month

### 2. Batches List Page (`src/pages/Batches.tsx`)

**Add a "Per-Month Overdue" section below the summary cards:**
- Add a shared `MonthYearPicker` at the top (defaults to previous month) so admins can pick any month
- Show a compact table/list: Batch Name, Overdue Students, Overdue Amount for the selected month
- Only show batches that have overdue students for that month (hide zero-overdue batches)
- Include summary totals at the bottom (total overdue students across all batches, total overdue amount)

**Computation updates in `batchAnalytics`:**
- Add a `selectedOverdueMonth` state
- Extend the analytics map to include per-month overdue data: for each batch, compute how many students have overdue/partial payments for the selected month and the total remaining amount
- Add these fields to the existing map: `monthOverdueCount`, `monthOverdueAmount`

### 3. UI Layout

**Batch Detail -- new card replaces Completion:**
- Same card size as the existing "Completion" card in the 5-column grid
- Header: AlertTriangle icon + MonthYearPicker (small, inline)
- Body: overdue count (large number, red) + overdue amount
- If no overdue for that month: show "No overdue" message

**Batches List -- new section:**
- A Card below the 4 summary cards with header "Monthly Overdue" + MonthYearPicker
- Inside: a simple table with columns: Batch Name, Overdue Students, Overdue Amount
- Empty state if no batches have overdue for the selected month
- Batches in the table are clickable (navigate to batch detail)

## Technical Details

- No new files or dependencies needed
- Reuses existing `MonthYearPicker`, `computeStudentSummary`, severity styling patterns
- Both pages independently track their own selected overdue month via local state
- Per-month overdue calculation: for each student summary, check if the month is in `monthlyOverdueMonths` or `monthlyPartialMonths`, then compute `effectiveMonthlyFee - (monthlyPaymentsByMonth.get(month) || 0)` as the remaining amount
