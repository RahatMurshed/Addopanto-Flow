
# Fix: Batch Detail Page Not Showing Multi-Enrolled Students

## Problem

The Batch Detail page filters students using `students.batch_id === batchId` (line 139 of `BatchDetail.tsx`). After the recent fix to support multi-batch enrollment (where `student.batch_id` is no longer overwritten), students enrolled in additional batches don't appear on the batch page because their `batch_id` still points to their primary batch.

Database confirms: Rahat Murshed and Technoboa ARE actively enrolled in Batch-3 via `batch_enrollments`, but their `student.batch_id` points to a different batch (`e5271b03...`).

## Solution

Fetch active `batch_enrollments` for the current batch and use those student IDs to filter `allStudents`, instead of relying on `students.batch_id`.

## Changes

### `src/pages/BatchDetail.tsx`

1. **Add a query to fetch enrolled student IDs** for this batch from `batch_enrollments`:
   - Query `batch_enrollments` where `batch_id = id` and `status = 'active'`
   - Extract the set of `student_id` values

2. **Update `allBatchStudents` filter** (line 137-140):
   - Change from: `allStudents.filter(s => s.batch_id === id)`
   - Change to: `allStudents.filter(s => enrolledStudentIds.has(s.id))`
   - This correctly includes all students with an active enrollment in this batch, regardless of their primary `batch_id`

3. **Update `useBatchStudentCount` dependency** -- the batch student count hook in the header also uses `students.batch_id`. We'll update it to use the enrollment-based count instead.

### `src/hooks/useBatches.ts` -- `useBatchStudentCount`

Update the `useBatchStudentCount` hook (line 145-158) to count from `batch_enrollments` table instead of `students.batch_id`:
- Change from: `supabase.from("students").select("id", { count: "exact", head: true }).eq("batch_id", batchId)`
- Change to: `supabase.from("batch_enrollments").select("id", { count: "exact", head: true }).eq("batch_id", batchId).eq("status", "active")`

## Technical Details

- This aligns the batch detail page with the multi-enrollment model
- Students with `batch_id` pointing to another batch will now correctly appear in all batches they're enrolled in
- The `batch_enrollments` table is the source of truth for batch membership
- No database changes needed -- only frontend query logic

## Testing Checklist

| # | Test | Expected Result |
|---|------|----------------|
| 1 | Open Batch-3 detail page | Rahat Murshed and Technoboa appear in enrolled students list |
| 2 | Student count shows correctly | Shows 2 students, not 0 |
| 3 | Students still appear in their primary batch page | No regression on primary batch view |
| 4 | Payment and stats calculations work | Collected/Pending/Overdue stats reflect enrolled students |

## Files Modified

- `src/pages/BatchDetail.tsx` -- Use `batch_enrollments` to determine batch membership
- `src/hooks/useBatches.ts` -- Update `useBatchStudentCount` to query `batch_enrollments`
