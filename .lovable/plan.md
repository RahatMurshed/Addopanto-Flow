

# Fix: Enrollment Modal vs Student List Inconsistency

## Root Cause

Two queries use **different logic** to determine batch membership:

| Query | Location | Logic | Result for Taosif |
|---|---|---|---|
| Enrollment modal check | `BatchEnrollDialog.tsx` line 66-71 | `batch_enrollments WHERE batch_id = X AND status = 'active'` | Found -- shows "Already in this batch" |
| Enrolled students list | `BatchDetail.tsx` line 142 | `allStudents.filter(s => s.batch_id === id)` | Not found -- Taosif's `batch_id` points to his first batch |

Taosif has two active enrollments (two different batches). His `students.batch_id` field only points to one batch, so he appears in one batch's list but not the other, even though he has valid `batch_enrollments` records for both.

This was identified in the earlier enrollment fix plan but the student list query in `BatchDetail.tsx` was never updated.

## Fix

### 1. `src/pages/BatchDetail.tsx` -- Use enrollment records for batch membership (the main fix)

Change `allBatchStudents` (lines 140-143) from filtering by `s.batch_id === id` to filtering by the already-fetched `batchEnrollments` data:

```typescript
// Build a Set of student IDs from active batch_enrollments
const enrolledStudentIdSet = useMemo(() => {
  return new Set(batchEnrollments.map((e: any) => e.student_id));
}, [batchEnrollments]);

// Filter students using enrollment records, not student.batch_id
const allBatchStudents = useMemo(() => {
  if (!id) return [];
  return allStudents.filter((s: any) => enrolledStudentIdSet.has(s.id));
}, [allStudents, id, enrolledStudentIdSet]);
```

The `batchEnrollments` query already exists at lines 61-74 and correctly filters by `status = 'active'`. This makes both queries consistent.

### 2. `src/hooks/useBatches.ts` -- Update `useBatchStudentCount`

The student count hook also uses `students.batch_id` filtering. Update it to count from `batch_enrollments` where `status = 'active'` instead, so batch cards and headers show correct counts.

### 3. No duplicate cleanup needed

Database query confirmed zero duplicate active enrollments for any student-batch pair. The partial unique index (`batch_enrollments_active_unique`) is working correctly.

## Files Modified

1. **`src/pages/BatchDetail.tsx`** -- Change `allBatchStudents` filter logic (2 lines)
2. **`src/hooks/useBatches.ts`** -- Update `useBatchStudentCount` to query `batch_enrollments`

