

# Fix Three Batch Enrollment Bugs

## Bug 1: Wrong student count on Batches and Courses pages

**Root Cause:** Three files still use the old `s.batch_id === b.id` filtering instead of `batch_enrollments`:
- `src/pages/Batches.tsx` line 65: `allStudents.filter((s: any) => s.batch_id === b.id)`
- `src/pages/CourseDetail.tsx` line 66: `allStudents.filter((s: any) => s.batch_id === b.id)`
- `src/pages/Courses.tsx` line 72: `allStudents.filter((s: any) => s.batch_id === b.id)`

**Fix:** Each of these pages needs to fetch `batch_enrollments` (active status) and use enrollment records to determine which students belong to each batch. The approach:

1. **`src/pages/Batches.tsx`**: Add a query to fetch all active `batch_enrollments` for the company. Build a `Map<batchId, Set<studentId>>` from enrollment records. Replace `allStudents.filter(s => s.batch_id === b.id)` with filtering by enrollment set.

2. **`src/pages/CourseDetail.tsx`**: Same approach -- fetch active `batch_enrollments`, build enrollment map, replace the student filter.

3. **`src/pages/Courses.tsx`**: Same approach.

---

## Bug 2: Capacity limit not enforced during enrollment

**Root Cause:** The `BatchEnrollDialog.tsx` `handleEnroll` function (line 118-159) creates enrollment records without checking batch capacity at all. The `BatchAssignDialog` and `BatchDropZone` show capacity warnings but don't block enrollment either (line 200 in BatchAssignDialog explicitly says "Students exceeding capacity will still be assigned").

**Fix:** Add capacity validation before creating enrollment in these three places:

1. **`src/components/dialogs/BatchEnrollDialog.tsx`**: Before inserting into `batch_enrollments`, query the batch's `max_capacity` and current active enrollment count. If at capacity, show a destructive toast: "This batch is full. Maximum capacity of X students reached." and return early. Treat `null` capacity as unlimited.

2. **`src/components/dialogs/BatchAssignDialog.tsx`**: In `handleAssign`, before processing, check if adding `studentIds.length` students would exceed capacity. If so, block and show error toast. Remove the "will still be assigned" warning text.

3. **`src/components/shared/BatchDropZone.tsx`**: The `handleDrop` function already checks `atCapacity` but only for current count. Update to also check if adding the number of students being dropped would exceed capacity.

---

## Bug 3: Wrong page opens when clicking student in batch

**Root Cause:** In `BatchDetail.tsx` line 785, clicking a student row navigates to `/students/${s.id}`. The `StudentDetail.tsx` page then resolves the batch context using `student.batch_id` (line 55), which may point to a different batch than the one being viewed.

**Fix:** Pass the current batch ID as a query parameter when navigating from BatchDetail:
- Change navigation to: `navigate(\`/students/${s.id}?from_batch=${id}\`)`
- In `StudentDetail.tsx`, read the `from_batch` query param and use it to resolve the batch context instead of `student.batch_id` when present.
- Also update the "View" button (line 855) with the same query parameter.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Batches.tsx` | Fetch batch_enrollments, replace student count logic |
| `src/pages/CourseDetail.tsx` | Fetch batch_enrollments, replace student count logic |
| `src/pages/Courses.tsx` | Fetch batch_enrollments, replace student count logic |
| `src/components/dialogs/BatchEnrollDialog.tsx` | Add capacity check before enrollment |
| `src/components/dialogs/BatchAssignDialog.tsx` | Add capacity check, block over-capacity assignment |
| `src/components/shared/BatchDropZone.tsx` | Add multi-student capacity check |
| `src/pages/BatchDetail.tsx` | Pass `from_batch` query param on student click |
| `src/pages/StudentDetail.tsx` | Read `from_batch` query param for batch context |

