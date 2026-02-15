

## Fix: Pass Batch Default Fees to Payment Dialog from Batch Detail Page

### Problem

When opening the "Record Payment" dialog from the Batch Detail page's enrolled student list, the dialog does not show monthly fee amounts under each month or auto-fill the payment amount. This is because two critical props are missing from the `StudentPaymentDialog` component call in `BatchDetail.tsx`.

### Root Cause

In `src/pages/BatchDetail.tsx` (lines 738-744), the `StudentPaymentDialog` is rendered without:
- `batchDefaultAdmissionFee` -- needed so the dialog knows the admission fee when the student's own fee is 0
- `batchDefaultMonthlyFee` -- needed so the dialog can display "remaining" amounts under each month and auto-calculate payment totals

Additionally, the summary lookup uses `studentSummaries` (which only covers filtered/paginated students) instead of `allSummaries` (which covers all batch students). If a student gets filtered out, their summary would be missing.

### Fix

One change in one file:

**`src/pages/BatchDetail.tsx`** -- Update the `StudentPaymentDialog` render (around line 738) to pass the two missing props and use `allSummaries` for a more reliable lookup:

```tsx
<StudentPaymentDialog
  open={paymentDialogOpen}
  onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) setSelectedStudent(null); }}
  student={selectedStudent}
  summary={allSummaries.get(selectedStudent.id) || { /* fallback */ }}
  onSave={handlePayment}
  batchDefaultAdmissionFee={Number(batch?.default_admission_fee) || 0}
  batchDefaultMonthlyFee={Number(batch?.default_monthly_fee) || 0}
/>
```

### What This Fixes

- Monthly fee amounts (e.g., "1,250 remaining") will now display under each month checkbox in the batch payment dialog
- The amount field will auto-fill when selecting months (using batch default monthly fee as fallback)
- Admission fee will auto-fill when admission type is selected (using batch default admission fee as fallback)
- Both access points (student detail and batch detail) will behave identically

### Files to Modify

- `src/pages/BatchDetail.tsx` -- add two props and switch summary source (3-line change)
