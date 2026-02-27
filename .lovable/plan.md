

# Fix: Allow Students to Be Enrolled in Multiple Batches Simultaneously

## Problem

When you enroll a student in a new batch, the system **replaces** their current batch instead of **adding** the new one. This happens because:

1. The `students` table has a single `batch_id` field -- it can only hold one batch at a time
2. Every enrollment action overwrites this field with the new batch ID
3. The `syncBatchEnrollment` utility then marks the old batch enrollment as "dropped"

So the system treats every enrollment as a **transfer**, not an addition.

## Solution

The `batch_enrollments` table already supports multiple active enrollments per student. The fix is to stop overwriting `student.batch_id` when enrolling from the **Batch Enroll Dialog** (the "Enroll Student" button on the batch detail page). Instead, only create a new `batch_enrollments` record without touching `student.batch_id`.

The `student.batch_id` field will continue to represent the student's **primary/latest** batch (used for display on the Students list page), but additional enrollments won't disturb it.

### Key distinction

- **Batch Enroll Dialog** (enrolling a student into an additional batch from the batch page): Should **add** an enrollment without removing the existing one
- **Batch Assignment / Drag-and-Drop** (reassigning a student's primary batch from the Students page): Should continue to **transfer** as it does today, since the intent is to change the student's main batch

## Changes

### 1. `src/components/dialogs/BatchEnrollDialog.tsx`

Update the `handleEnroll` function:

- **Remove** the call to `updateStudentMutation.mutateAsync({ id: student.id, batch_id: batchId })` -- this is what overwrites the student's batch
- **Keep** the `batch_enrollments` insert (this is the correct multi-enrollment record)
- **Only update** `student.batch_id` if the student currently has **no batch** (`batch_id` is null) -- in that case, set it as their primary batch
- Check for existing active enrollment in the same batch before inserting a duplicate

### 2. `src/components/dialogs/BatchEnrollDialog.tsx` (UI update)

- Change the "already enrolled" check from `student.batch_id === batchId` to checking `batch_enrollments` for an existing active record for this student + batch combination
- Query active enrollments for each search result to show accurate enrollment status

### 3. No changes needed to

- `syncBatchEnrollment` -- still correct for batch transfers/reassignments
- `BatchDropZone` / `BatchAssignDialog` -- these are meant for reassignment, not additional enrollment

## Technical Details

### Updated handleEnroll logic

```typescript
const handleEnroll = useCallback(async (student: Student) => {
  setEnrollingId(student.id);
  try {
    // Check for existing active enrollment in this batch
    const { data: existing } = await supabase
      .from("batch_enrollments")
      .select("id")
      .eq("student_id", student.id)
      .eq("batch_id", batchId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      toast({ title: "Already enrolled", description: "..." });
      return;
    }

    // Create enrollment record WITHOUT overwriting student.batch_id
    await supabase.from("batch_enrollments").insert({
      student_id: student.id,
      batch_id: batchId,
      company_id: activeCompanyId,
      created_by: user.id,
      status: "active",
      total_fee: 0,
    });

    // Only set batch_id if student has none (first enrollment)
    if (!student.batch_id) {
      await updateStudentMutation.mutateAsync({ id: student.id, batch_id: batchId });
    }

    toast({ title: "Student enrolled", description: "..." });
  } catch (err) { ... }
}, [...]);
```

### Updated "already enrolled" detection

Instead of checking `student.batch_id === batchId` (which only works for the primary batch), fetch batch enrollments for search results and check enrollment status properly.

## Files Changed

1. **`src/components/dialogs/BatchEnrollDialog.tsx`** -- Stop overwriting `student.batch_id` on enroll; check `batch_enrollments` for duplicate detection; only set `batch_id` if student has no primary batch

## Edge Cases

- Student with no batch: Sets batch_id AND creates enrollment (becomes primary batch)
- Student already in another batch: Only creates enrollment record, keeps existing batch_id
- Student already enrolled in this batch: Shows "already enrolled" toast, no changes
- Batch at capacity: Still blocked as before

