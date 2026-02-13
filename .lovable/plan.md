

# Enhance Student Revenue Management System

Most of the requested functionality already exists in the codebase. This plan focuses on the actual gaps between what's built and what's requested.

---

## What Already Exists (No Changes Needed)

- Admission Fee Card with total/paid/pending/progress bar
- Monthly Tuition Card with month grid (green/yellow/red color coding)
- Total Paid card
- Payment History table with date, amount, type, method, months, receipt
- Students list with summary cards (Total, Active, Pending Admission, Overdue Monthly)
- Students list table with Name, Student ID, Status, Admission badge, Monthly badge, Total Paid, Actions

---

## Changes Required

### 1. Enhanced Student Detail Page (`src/pages/StudentDetail.tsx`)

**A. Expand the Monthly Tuition Card** to show detailed paid/pending/overdue breakdowns below the month grid:

- **Paid months list**: Each paid month with payment date, amount, and receipt number (cross-reference `student_payments` by `months_covered`)
- **Summary line**: "X months paid (total amount)" in green
- **Overdue months list**: Each overdue month with the expected fee amount, highlighted in red
- **Pending months list**: Current/future unpaid months with expected amounts
- **Summary line**: "Y months pending/overdue (total amount)" in red/yellow

**B. Enhance the Total Paid card** to show a full revenue breakdown:

```
Admission Fee:    Total / Paid / Pending
Monthly Tuition:  Rate/mo | X months paid (amount) | Y months pending (amount)
---
TOTAL PAID:       combined amount
TOTAL PENDING:    combined amount
```

This replaces the current single-line "Total Revenue from Student" card.

**C. Add `monthlyPaidTotal` and `monthlyPendingTotal` to `StudentSummary`** in `useStudentPayments.ts` so the detail page can show monetary totals, not just month counts.

### 2. Enhanced Student Dialog with Initial Payment (`src/components/StudentDialog.tsx`)

Add an optional "Record Initial Payment" collapsible section at the bottom of the create form (hidden during edit):

**New fields (only shown when creating):**
- Collapsible toggle: "Record initial payment now"
- When expanded:
  - Payment Type: Admission / Monthly / Both (radio)
  - If Admission: Amount field (pre-filled with admission fee total, editable for partial)
  - If Monthly: Month selector (starting from billing_start_month) + auto-calculated amount
  - Payment Method dropdown
  - Receipt Number (optional)
- **Live Payment Summary box** at bottom showing:
  - Admission: total, initial payment, remaining
  - Monthly: rate, months selected, payment, remaining
  - Total Initial Payment amount
  - Total Pending after this payment

**Implementation:**
- `StudentDialog` currently calls `onSave(StudentInsert)` which returns a promise
- Change signature: `onSave` returns the created student (with `id`), then if initial payment fields are filled, automatically call `useCreateStudentPayment` within the dialog
- Requires passing `createPaymentMutation` as a prop or importing the hook directly

### 3. Students List - Add Total Pending Column (`src/pages/Students.tsx`)

Add a "Total Pending" column after "Total Paid" showing the combined admission + monthly pending amount in red/destructive color. This uses data already computed in `studentSummaries`.

Requires `monthlyPendingTotal` from the enhanced `StudentSummary`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useStudentPayments.ts` | Add `monthlyPaidTotal`, `monthlyPendingTotal` fields to `StudentSummary`. Compute monetary totals in `computeStudentSummary`. |
| `src/pages/StudentDetail.tsx` | Replace single-line total card with detailed breakdown card. Add paid/pending/overdue month lists below month grid in Monthly Tuition card. |
| `src/components/StudentDialog.tsx` | Add collapsible initial payment section for create mode. Add live payment summary. Import and use `useCreateStudentPayment` hook. |
| `src/pages/Students.tsx` | Add "Total Pending" column to table. |

---

## Technical Details

### A. `computeStudentSummary` Enhancements

Add to the `StudentSummary` interface:

```typescript
monthlyPaidTotal: number;      // sum of fees for all fully-paid months
monthlyPendingTotal: number;   // sum of fees for overdue + pending months
admissionPending: number;      // admissionTotal - admissionPaid (clamped to 0)
totalPending: number;          // admissionPending + monthlyPendingTotal
```

Computed using `getFeeForMonth()` which already exists and uses the fee history.

### B. StudentDialog Initial Payment Flow

1. User fills student info and fee amounts
2. Optionally expands "Record Initial Payment" (uses Radix `Collapsible`)
3. Selects payment type and enters details
4. Live summary box updates as values change (using `useMemo` / `watch`)
5. On submit:
   - First, call `onSave(studentData)` which creates the student and returns the `Student` object with `id`
   - Then, if initial payment is configured, call `createPaymentMutation.mutateAsync()` with the student ID
   - Show combined saving state ("Creating student..." then "Recording payment...")
6. Both operations must succeed before dialog closes; if payment fails, student is still created and user is notified

### C. Monthly Detail Breakdown

For each paid month, find the matching payment(s) from the `payments` array by checking if `months_covered` includes that month. Display:
- Month name (e.g., "Jan 2026")  
- Payment date  
- Amount (payment amount / number of months covered, for split display)  
- Receipt number if available  

This is purely frontend computation using data already fetched.

### D. Validation for Initial Payment

- Admission payment amount: must be > 0 and <= admission_fee_total
- Monthly payment: at least one month must be selected
- Monthly amount: auto-calculated but editable (for partial), must be > 0
- Payment method: required if any payment amount > 0

