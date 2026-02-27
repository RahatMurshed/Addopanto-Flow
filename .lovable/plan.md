

# Fix: Payment Due Dates and Schedule Generation

## Problem

1. **All payments show today's date as due_date**: The `due_date` column on `student_payments` defaults to `CURRENT_DATE` in the database. Neither `StudentPaymentInsert` nor the payment dialog ever sets `due_date`, so every payment gets today's date.

2. **No payment schedule is generated on enrollment**: When a student is enrolled in a batch, no "unpaid" payment rows are created. The system only creates rows when payments are manually recorded.

## Root Cause

- `useCreateStudentPayment` (line 71-73 in `useStudentPayments.ts`) inserts payment data without a `due_date` field, so the DB default `CURRENT_DATE` is used.
- `syncBatchEnrollment` (in `enrollmentSync.ts`) only creates a `batch_enrollments` row -- it does not generate any payment schedule rows.
- `StudentPaymentInsert` interface does not include `due_date`.

## Fix -- Two Parts

### Part 1: Auto-generate payment schedule on enrollment

Update `syncBatchEnrollment` in `src/utils/enrollmentSync.ts` so that when a new enrollment is created (`newId` is set), the function:

1. Fetches the batch details (start_date, course_duration_months, default_admission_fee, default_monthly_fee)
2. If `course_duration_months` exists, generates one "unpaid" `student_payments` row per month with:
   - `payment_type = "monthly"`
   - `amount = default_monthly_fee`
   - `status = "unpaid"`
   - `due_date = start_date + N months` (1st of each month)
   - `months_covered = [that month string]`
   - `batch_enrollment_id = the new enrollment id`
3. Optionally generates one "unpaid" admission fee row with `due_date = start_date`

This gives students a proper payment schedule with correct due dates from day one.

### Part 2: Fix payment recording to update existing rows

Update `StudentPaymentDialog` and `useCreateStudentPayment` to:

1. Add `due_date` to `StudentPaymentInsert` interface
2. When recording a monthly payment against selected months:
   - Check if unpaid schedule rows already exist for those months
   - If yes, UPDATE those rows (set `status = "paid"`, `amount`, `payment_date`, `payment_method`, etc.) instead of inserting new rows
   - If no matching unpaid row exists, INSERT with `due_date` set to the 1st of the first covered month
3. When recording admission payments, set `due_date` to the enrollment date or batch start date

### Part 3: Handle existing data gracefully

- For students already enrolled (no schedule rows), the payment dialog continues to work as before -- it inserts new rows but now sets `due_date` correctly from `months_covered`
- The `computeStudentSummary` logic remains unchanged (it uses `months_covered`, not schedule rows)

## Files Changed

1. **`src/utils/enrollmentSync.ts`** -- Add schedule generation logic when creating new enrollment
2. **`src/hooks/useStudentPayments.ts`** -- Add `due_date` to `StudentPaymentInsert`; add `useUpsertSchedulePayment` hook that checks for existing unpaid rows before inserting
3. **`src/components/dialogs/StudentPaymentDialog.tsx`** -- Calculate and pass `due_date` on save; use upsert logic for months with existing schedule rows
4. **`src/components/finance/InitialPaymentSection.tsx`** -- Pass `due_date` when creating initial payments

## Edge Cases

- Batches without `course_duration_months` set: Skip schedule generation (no way to know how many months)
- Student transferred between batches: Old batch schedule rows remain as-is (historical); new batch generates new schedule
- Editing existing payments: Continue to work as before since the update mutation already exists

