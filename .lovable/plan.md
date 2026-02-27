

# Fix: Batch Removal Should Update Enrollment History, Not Delete Student

## Two Issues

### Issue 1: No enrollment sync when batch changes
When a student's batch is changed or removed (via StudentWizardDialog edit, StudentDialog edit, or BatchDropZone), the `batch_enrollments` table is never updated. The old enrollment stays "active" and no new enrollment is created for the new batch.

### Issue 2: BatchDetail "Delete Student" permanently deletes the student
The BatchDetail page's delete button calls `deleteStudentMutation` which permanently removes the student from the database. Instead, it should only remove the student from the batch (set `batch_id = null`) and mark the enrollment as "dropped". The student should remain in the Students list.

---

## Solution

### 1. Create shared utility: `src/utils/enrollmentSync.ts`

A reusable function to handle all batch change scenarios:

```text
syncBatchEnrollment(studentId, oldBatchId, newBatchId, companyId, userId)
```

- If `oldBatchId` exists and differs from `newBatchId`: UPDATE existing `batch_enrollments` record to `status = 'dropped'`
- If `newBatchId` exists and differs from `oldBatchId`: INSERT new `batch_enrollments` record with `status = 'active'`
- If `newBatchId` is null (removed from batch): just mark old enrollment as `'dropped'`
- If both are the same: no-op

### 2. Update `StudentWizardDialog.tsx` (edit mode)

After `onSave(insertData)` succeeds in edit mode, call `syncBatchEnrollment` comparing `editStudent.batch_id` with the new `insertData.batch_id`.

### 3. Update `StudentDialog.tsx` (edit mode)

After `onSave()` succeeds, call `syncBatchEnrollment` comparing original `student.batch_id` with new `selectedBatchId`.

### 4. Update `BatchDropZone.tsx`

After `updateStudent.mutateAsync`, call `syncBatchEnrollment` to mark old enrollment as dropped and create new one.

### 5. Update `BatchAssignDialog.tsx`

Already inserts new enrollment but doesn't mark old one as dropped. Add the drop step when `fromBatchId` exists.

### 6. Change BatchDetail "Delete" to "Remove from Batch"

Replace the destructive delete action in `BatchDetail.tsx`:
- Change button label/icon from "Delete Student" to "Remove from Batch"
- Change the confirmation dialog text accordingly
- Replace `deleteStudentMutation.mutateAsync(id)` with:
  - `updateStudentMutation.mutateAsync({ id, batch_id: null })`
  - Call `syncBatchEnrollment(id, batchId, null, ...)` to mark enrollment as dropped
  - Create a `student_batch_history` record for the removal
- Student stays in the Students page; only the batch association is removed

## Files Changed

- **New**: `src/utils/enrollmentSync.ts`
- **Modified**: `src/components/dialogs/StudentWizardDialog.tsx` -- sync on edit
- **Modified**: `src/components/dialogs/StudentDialog.tsx` -- sync on edit  
- **Modified**: `src/components/shared/BatchDropZone.tsx` -- sync on drag-drop
- **Modified**: `src/components/dialogs/BatchAssignDialog.tsx` -- mark old enrollment dropped
- **Modified**: `src/pages/BatchDetail.tsx` -- change delete to "Remove from Batch"

