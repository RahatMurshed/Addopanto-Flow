

# Fix: Payments Linked to Wrong Batch in Financial Overview

## Problem

All payment records have `batch_enrollment_id = null` because `StudentPaymentDialog` never passes this field when saving. The `FinancialBreakdown` component then falls back to the **first** enrollment found in the enrollment map, causing all payments to display under the wrong batch (e.g., "English Mastery Batch-1" instead of "Practice Club Batch-1").

## Root Cause (Two Issues)

1. **`StudentPaymentDialog` does not accept or pass `batch_enrollment_id`**: The dialog has no way to know which enrollment a payment belongs to, so it never includes it in the save payload.

2. **`FinancialBreakdown` fallback is too naive**: When `batch_enrollment_id` is null, it uses `enrollmentMap.values().next().value` -- the first enrollment in the map -- which is arbitrary and often wrong for multi-enrollment students.

## Fix Plan

### 1. Pass `batch_enrollment_id` through the payment recording flow

**`StudentPaymentDialog.tsx`** -- Add a new optional prop `batchEnrollmentId?: string` and include it in the `onSave` payload:
- Add `batchEnrollmentId` to `StudentPaymentDialogProps`
- Pass it as `batch_enrollment_id` in the save call

**`BatchDetail.tsx`** -- Look up the enrollment ID for the selected student in this batch and pass it to `StudentPaymentDialog`:
- Query `batch_enrollments` to find the active enrollment for `selectedStudent.id` + current `batch.id`
- Pass it as `batchEnrollmentId` prop

**`StudentDetail.tsx`** -- Look up the enrollment ID for the student's current batch and pass it:
- Use the already-fetched batch data to find the active enrollment
- Pass it as `batchEnrollmentId` prop

**`Students.tsx`** -- Same pattern: resolve enrollment from `selectedStudent.batch_id` if available.

### 2. Fix the upsert logic in `useStudentPayments.ts`

Currently when upserting an existing unpaid schedule row (lines 86-110), the mutation does not preserve or set `batch_enrollment_id`. Update the upsert path to also check `batch_enrollment_id` when matching unpaid rows, so payments are linked to the correct batch's schedule.

### 3. Improve `FinancialBreakdown` fallback for historical data

Replace the naive "first enrollment" fallback with a smarter approach:
- When `batch_enrollment_id` is null, try to match the payment to an enrollment based on the student's `batch_id` on the `students` table (the current or most recent batch)
- If multiple enrollments exist, show as "Uncategorized" rather than incorrectly assigning to the wrong batch

### 4. Backfill existing payment records

For existing payments with `batch_enrollment_id = null`, attempt to link them to the correct enrollment:
- For students with exactly one enrollment, set `batch_enrollment_id` to that enrollment's ID
- For students with multiple enrollments, leave as null (the improved fallback in step 3 handles display)

## Files Changed

1. **`src/components/dialogs/StudentPaymentDialog.tsx`** -- Add `batchEnrollmentId` prop, pass in save payload
2. **`src/pages/BatchDetail.tsx`** -- Resolve enrollment ID for selected student, pass to dialog
3. **`src/pages/StudentDetail.tsx`** -- Resolve enrollment ID for student's batch, pass to dialog
4. **`src/pages/Students.tsx`** -- Resolve enrollment ID when batch context is available, pass to dialog
5. **`src/hooks/useStudentPayments.ts`** -- Include `batch_enrollment_id` in upsert matching logic
6. **`src/components/students/profile/FinancialBreakdown.tsx`** -- Replace naive fallback with "Uncategorized" for multi-enrollment students
7. **Database** -- Run a one-time backfill UPDATE for single-enrollment students

## Technical Details

### StudentPaymentDialog change
```typescript
// New prop
batchEnrollmentId?: string;

// In handleSubmit, add to onSave call:
batch_enrollment_id: batchEnrollmentId || null,
```

### BatchDetail enrollment resolution
```typescript
// BatchDetail already knows batch.id — look up enrollment
const activeEnrollment = useMemo(() => {
  if (!selectedStudent || !enrollments) return undefined;
  return enrollments.find(e => 
    e.student_id === selectedStudent.id && 
    e.batch_id === id && 
    e.status === "active"
  );
}, [selectedStudent, enrollments, id]);
```

### FinancialBreakdown improved fallback
```typescript
// Only use fallback for single-enrollment students
const fallbackEnrollment = data.enrollmentMap.size === 1
  ? data.enrollmentMap.values().next().value
  : null;  // Multi-enrollment: show "Uncategorized" rather than wrong batch
```

### Backfill SQL
```sql
UPDATE student_payments sp
SET batch_enrollment_id = (
  SELECT be.id FROM batch_enrollments be
  WHERE be.student_id = sp.student_id AND be.company_id = sp.company_id
  LIMIT 1
)
WHERE sp.batch_enrollment_id IS NULL
AND (SELECT count(*) FROM batch_enrollments be 
     WHERE be.student_id = sp.student_id AND be.company_id = sp.company_id) = 1;
```

