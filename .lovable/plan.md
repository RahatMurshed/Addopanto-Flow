

## Payment Overpayment Prevention

### What will change

Add comprehensive validation to prevent overpayments at three levels: the "Add Payment" button, the payment form (real-time), and the server (database trigger).

### Changes

**1. Block "Add Payment" button when nothing is owed**

In both `StudentDetail.tsx` and `BatchDetail.tsx`, disable the "Add Payment" button when `summary.totalPending <= 0` and show a tooltip/message: "All fees collected - No pending payments".

- `StudentDetail.tsx` (line ~252): Wrap the Add Payment button with a condition checking `summary.totalPending > 0`; if zero, show a disabled button with the message.
- `BatchDetail.tsx` (line ~696): Same logic using `allSummaries.get(s.id)?.totalPending`.

**2. Real-time validation in `StudentPaymentDialog.tsx`**

Add a computed `maxAllowed` value that updates as the user changes payment type, selected months, or edits:

- For **admission**: `maxAllowed = effectiveAdmissionTotal - alreadyPaidAdmission` (adjusting for edit amounts)
- For **monthly with months selected**: sum of `(fee - alreadyPaid)` per selected month (adjusting for edit)
- For **monthly with no months**: no cap (advance payment)

Display a real-time error below the amount field: "Amount exceeds pending: Maximum allowed is [currency amount]" when the entered amount exceeds `maxAllowed`.

Disable the "Record Payment" / "Save Changes" button when:
- Amount exceeds `maxAllowed`
- Amount is zero or negative
- Saving is in progress

This replaces the current submit-time-only validation with live feedback.

**3. Show "All fees collected" message in the dialog**

When the dialog opens and `summary.totalPending <= 0` (and not editing), show an alert banner: "All fees collected - No pending payments" and disable form submission. This is a safety net in case the button-level block is bypassed.

**4. Server-side validation (database trigger)**

Create a database trigger `validate_student_payment_amount` on the `student_payments` table that:
- On INSERT or UPDATE, looks up the student's fees and existing payments
- For admission payments: checks `new amount + other admission payments <= admission_fee_total`
- For monthly payments: checks per-month totals don't exceed monthly fee
- Raises an exception with a clear 400-level message if violated

### Files to modify

| File | Change |
|---|---|
| `src/components/StudentPaymentDialog.tsx` | Add real-time `maxAllowed` calculation, live error message, disable save button, "all collected" banner |
| `src/pages/StudentDetail.tsx` | Disable "Add Payment" button when `totalPending <= 0`, show tooltip |
| `src/pages/BatchDetail.tsx` | Disable payment icon button when student's `totalPending <= 0`, show tooltip |
| New migration | `validate_student_payment_amount` trigger function |

### Technical Details

**Real-time max calculation (dialog):**
```typescript
const maxAllowed = useMemo(() => {
  if (paymentType === "admission") {
    const total = Number(student.admission_fee_total) || batchDefaultAdmissionFee || 0;
    const paid = isEditing ? summary.admissionPaid - Number(editingPayment?.amount || 0) : summary.admissionPaid;
    return Math.max(0, total - paid);
  }
  if (paymentType === "monthly" && selectedMonths.length > 0) {
    let max = 0;
    for (const m of selectedMonths) {
      const fee = Number(student.monthly_fee_amount) || batchDefaultMonthlyFee || 0;
      let paid = summary.monthlyPaymentsByMonth?.get(m) || 0;
      if (isEditing && editingPayment?.months_covered?.includes(m)) {
        paid -= Number(editingPayment.amount) / (editingPayment.months_covered?.length || 1);
      }
      max += Math.max(0, fee - Math.max(0, paid));
    }
    return max;
  }
  return null; // no cap for advance/unselected monthly
}, [paymentType, selectedMonths, ...deps]);
```

**Button disable logic:**
```typescript
const amountValue = form.watch("amount");
const isOverpaying = maxAllowed !== null && amountValue > maxAllowed;
const isFullyPaid = summary.totalPending <= 0 && !isEditing;

// Save button
<Button disabled={saving || isOverpaying || isFullyPaid}>...</Button>
```

**Database trigger (simplified):**
```sql
CREATE OR REPLACE FUNCTION validate_student_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_total_admission NUMERIC;
  v_max_admission NUMERIC;
BEGIN
  SELECT admission_fee_total, monthly_fee_amount
    INTO v_student FROM students WHERE id = NEW.student_id;

  IF NEW.payment_type = 'admission' THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_admission
      FROM student_payments
      WHERE student_id = NEW.student_id
        AND payment_type = 'admission'
        AND id IS DISTINCT FROM NEW.id;

    v_max_admission := COALESCE(v_student.admission_fee_total, 0);
    IF v_total_admission + NEW.amount > v_max_admission AND v_max_admission > 0 THEN
      RAISE EXCEPTION 'Overpayment: amount exceeds pending admission fee. Maximum allowed: %',
        (v_max_admission - v_total_admission);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
