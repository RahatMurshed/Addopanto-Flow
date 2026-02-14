

## Auto-fill Payment Amount

### Current State
- Monthly payments already auto-calculate when months are selected (lines 113-123), using `student.monthly_fee_amount` minus already paid per month.
- Admission payments do NOT auto-fill -- the amount starts at 0 and the admin must type it manually.

### Changes (single file: `src/components/StudentPaymentDialog.tsx`)

1. **Auto-fill admission amount on type selection or dialog open**
   - When payment type is "admission" (either on open or when switched), auto-fill the amount field with the remaining admission balance: `admissionTotal - admissionPaid` (clamped to 0 minimum).
   - Use the effective admission fee: `student.admission_fee_total || batchDefaultAdmissionFee || 0`.

2. **Use effective monthly fee for auto-calculation**
   - The existing monthly auto-calc on line 117 uses `student.monthly_fee_amount` but should fall back to `batchDefaultMonthlyFee` when the student value is 0 (matching the pattern used in the month list on line 241).

3. **Admin can still edit the amount**
   - The amount field remains editable -- the auto-fill just sets a starting value that the admin can override for partial payments.

### Technical Details

- Add a `useEffect` that watches `paymentType`: when it becomes `"admission"` and not editing, set amount to `Math.max(0, effectiveAdmissionTotal - summary.admissionPaid)`.
- Update the existing monthly `useEffect` to use `const fee = Number(student.monthly_fee_amount) || batchDefaultMonthlyFee || 0` instead of just `student.monthly_fee_amount`.
- On dialog open (existing reset logic around line 96), if default type is admission, set the initial amount to the remaining admission balance instead of 0.

