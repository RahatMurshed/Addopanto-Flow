
# Support Partial Monthly Payments and Improve List Display

## Problem

Currently, monthly fees are binary -- a month is either fully paid or not paid. The user wants monthly fees to support partial payments (like admission fees), and wants the students list to show total pending months and total pending amount (admission + monthly combined).

---

## Changes Required

### 1. Computation Logic (`src/hooks/useStudentPayments.ts`)

**Add partial monthly payment tracking:**

- Add a new `monthlyPartialMonths` array to `StudentSummary` for months that have some payment but not the full fee
- Add a `monthlyPaymentsByMonth` map to track actual paid amount per month (already partially exists as `monthPaymentTotals`)
- Change the paid/pending classification: a month is "paid" only when paid >= fee, "partial" when 0 < paid < fee, "overdue"/"pending" when paid === 0
- Adjust `monthlyPaidTotal` to reflect actual amounts paid (not expected fees), and `monthlyPendingTotal` to reflect remaining amounts owed

**Updated StudentSummary interface additions:**
```typescript
monthlyPartialMonths: string[];          // months with 0 < paid < fee
monthlyPaymentsByMonth: Map<string, number>; // actual paid amount per month
```

**Updated classification logic:**
```
For each billing month:
  fee = getFeeForMonth(month)
  paid = sum of payments covering that month
  if paid >= fee -> monthlyPaidMonths
  else if paid > 0 -> monthlyPartialMonths  (NEW)
  else if month < currentMonth -> monthlyOverdueMonths
  else -> monthlyPendingMonths
```

**Updated monetary totals:**
- `monthlyPaidTotal` = sum of actual payments for all monthly-type payments (real money received)
- `monthlyPendingTotal` = sum of (fee - paid) for all partial, overdue, and pending months (real money still owed)

### 2. Student Month Grid (`src/components/StudentMonthGrid.tsx`)

- Add a fourth state for partial months: amber/orange background with a "partial" indicator icon
- Show partial months distinctly from fully paid (green) and unpaid (red/yellow)
- Optionally show paid/total amount in the grid cell for partial months

### 3. Monthly Breakdown List (`src/components/MonthlyBreakdownList.tsx`)

- Add a "Partially Paid" section between "Overdue" and "Paid" sections
- For partial months, show: month name, amount paid, amount remaining, payment date
- Update summary line to include partial count

### 4. Student Detail Dashboard (`src/pages/StudentDetail.tsx`)

- Monthly Tuition card: include partial months in the breakdown display (e.g., "3 paid, 2 partial, 2 pending")
- The progress bar and percentages will automatically update since they use `monthlyPaidTotal` / total

### 5. Payment Dialog (`src/components/StudentPaymentDialog.tsx`)

- When recording monthly payments, allow the amount field to be freely editable (already is) so partial amounts work
- Show the fee amount and already-paid amount for selected months so the admin knows what's remaining
- For months that are partially paid, show them in the "unpaid months" list with a "partial" indicator and remaining amount

### 6. Students List (`src/pages/Students.tsx`)

**Monthly column changes:**
- Currently shows "X overdue" or "Current"
- Change to show total pending months count (overdue + partial + pending combined), e.g., "7 months pending" or "4 months pending"
- If all months are fully paid, show "Current" badge

**Total Pending column:**
- Already shows `sum.totalPending` which is `admissionPending + monthlyPendingTotal`
- Will automatically reflect correct values once computation logic is updated to include partial amounts in pending

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useStudentPayments.ts` | Add `monthlyPartialMonths`, `monthlyPaymentsByMonth` to `StudentSummary`. Update classification to support partial. Recalculate monetary totals based on actual payments vs. expected fees. |
| `src/components/StudentMonthGrid.tsx` | Add amber/orange styling for partial months with distinct icon. |
| `src/components/MonthlyBreakdownList.tsx` | Add "Partially Paid" section showing paid/remaining for each partial month. |
| `src/pages/StudentDetail.tsx` | Update Monthly Tuition card text to mention partial months. |
| `src/components/StudentPaymentDialog.tsx` | Show remaining amount for partially-paid months in the month selector. |
| `src/pages/Students.tsx` | Change Monthly column to show total pending month count. Ensure Total Pending shows full course pending. |

---

## Technical Details

### A. Updated `computeStudentSummary` Logic

```typescript
// Per-month classification
const monthlyPartialMonths: string[] = [];
const monthPaymentsByMonth = new Map<string, number>();

for (const m of allMonths) {
  const fee = getFeeForMonth(m);
  const paid = monthPaymentTotals.get(m) || 0;
  monthPaymentsByMonth.set(m, paid);
  
  if (paid >= fee) {
    monthlyPaidMonths.push(m);
  } else if (paid > 0) {
    monthlyPartialMonths.push(m);  // NEW
  } else if (m < currentMonth) {
    monthlyOverdueMonths.push(m);
  } else {
    monthlyPendingMonths.push(m);
  }
}

// Monetary totals based on actual money
monthlyPaidTotal = sum of all monthly payment amounts (actual money received)
monthlyPendingTotal = sum of (fee - paid) for partial + overdue + pending months
```

### B. Students List Monthly Column

```
// Instead of just showing overdue count:
const totalPendingMonths = sum.monthlyOverdueMonths.length 
  + sum.monthlyPartialMonths.length 
  + sum.monthlyPendingMonths.length;

// Display:
if (totalPendingMonths > 0) -> Badge: "X months pending"  
else -> Badge: "Current"
```

### C. Month Grid Partial State

Partial months get a distinct amber style:
- Border: `border-amber-500/30`
- Background: `bg-amber-500/10`
- Text: `text-amber-700 dark:text-amber-400`
- Icon: A circle-half or similar indicator

### D. Payment Dialog Enhancement

For partially paid months in the month selector:
- Show them with remaining amount, e.g., "Jan 2026 (BDT 400 remaining)"
- Pre-calculate the amount when selecting partial months as the sum of remaining fees
- The admin can still freely edit the amount field for any custom partial payment

### E. Edge Cases

- A single payment covering multiple months: the payment amount is split evenly across covered months (existing behavior)
- Multiple payments for the same month: amounts accumulate (existing behavior)
- Partial payment on a month that later gets a second payment completing it: moves from partial to paid automatically on next data refresh
