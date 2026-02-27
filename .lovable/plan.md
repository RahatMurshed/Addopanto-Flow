# Fix: Auto-Select Batch in Payment Recording Form

## Problem

When the payment dialog opens for a student with multiple enrollments, the batch dropdown shows "Select batch..." instead of auto-selecting the student's current batch. The auto-select logic only handles two cases: (1) a `batchEnrollmentId` prop passed by the caller, or (2) exactly one enrollment. It ignores the student's current `batch_id` which is already available on the student object.

## Solution

One small change in `src/components/dialogs/StudentPaymentDialog.tsx`, lines 109-122.

Add a new condition in the auto-select `useEffect`: when the student has multiple enrollments and no explicit `batchEnrollmentId` prop is passed, find the enrollment whose `batch_id` matches `student.batch_id` and auto-select it.also disable i so that it can't be changed

### Updated auto-select logic

**Before:**

```
1. Editing existing payment -> use its batch_enrollment_id
2. batchEnrollmentId prop passed -> use it
3. Exactly 1 enrollment -> auto-select it
4. 0 enrollments -> null
```

**After:**

```
1. Editing existing payment -> use its batch_enrollment_id
2. batchEnrollmentId prop passed -> use it  
3. Exactly 1 enrollment -> auto-select it
4. Student has a batch_id matching one of the enrollments -> auto-select that one
5. 0 enrollments -> null
```

### Code change

In `src/components/dialogs/StudentPaymentDialog.tsx`, update the `useEffect` at line 110:

```typescript
useEffect(() => {
  if (!open) return;
  if (isEditing && editingPayment?.batch_enrollment_id) {
    setSelectedEnrollmentId(editingPayment.batch_enrollment_id);
  } else if (batchEnrollmentId) {
    setSelectedEnrollmentId(batchEnrollmentId);
  } else if (enrollments.length === 1) {
    setSelectedEnrollmentId(enrollments[0].id);
  } else if (student.batch_id && enrollments.length > 1) {
    // Auto-select enrollment matching student's current batch
    const match = enrollments.find(e => e.batch_id === student.batch_id);
    if (match) setSelectedEnrollmentId(match.id);
  } else if (enrollments.length === 0) {
    setSelectedEnrollmentId(null);
  }
}, [open, enrollments, batchEnrollmentId, isEditing, editingPayment, student.batch_id]);
```

This uses the student's current `batch_id` (which represents the batch they are currently assigned to) to find and pre-select the matching enrollment. The admin can still change it via the dropdown if needed.

## Files Changed

1. `**src/components/dialogs/StudentPaymentDialog.tsx**` -- Add `student.batch_id` matching in the auto-select useEffect

No other files or database changes needed.