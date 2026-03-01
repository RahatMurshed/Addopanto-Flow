

# Fix: Student Shows "Not Enrolled" Despite Active Enrollment

## Problem
Nusrat Jahan shows "Not Enrolled" in the UI, but the Enrollment History section correctly shows her enrolled in "English Evening" batch. This happens because:

1. **Data inconsistency**: The seed script inserted a `batch_enrollments` record but didn't update `students.batch_id`
2. **UI relies on `batch_id`**: The "Enrolled"/"Not Enrolled" badge in both the Students list and profile dialog checks `student.batch_id` directly, ignoring the `batch_enrollments` table

## Fix (2 parts)

### 1. Fix the data (SQL update)
Update Nusrat Jahan's `batch_id` to match her active enrollment:

```sql
UPDATE students 
SET batch_id = '67fbc8af-3097-4c75-9b20-4a2fa8066269' 
WHERE id = '8ee7096d-b189-4d44-833b-7426501bfe5b';
```

### 2. Make UI resilient (code changes)
The `batch_id` field on the `students` table is a legacy shorthand. The real source of truth is `batch_enrollments`. Update two files to check enrollments when `batch_id` is null:

**`StudentProfileDialog.tsx` (line 69-73)**: Instead of only checking `s.batch_id`, also accept an optional `isEnrolled` prop or check the batch name prop that's already passed in.

Since `batchName` is already a prop on this dialog, we can use it as a secondary signal:
- Show "Enrolled" if `s.batch_id` OR `batchName` is truthy

**`Students.tsx` (line 608-609)**: The Students list page already fetches `batch_enrollments` data. Use the enrollment map to determine enrollment status instead of relying solely on `student.batch_id`.

## Technical Details

### StudentProfileDialog.tsx
Change the enrollment badge logic from:
```tsx
{s.batch_id ? (...Enrolled...) : (...Not Enrolled...)}
```
to:
```tsx
{(s.batch_id || batchName) ? (...Enrolled...) : (...Not Enrolled...)}
```

### Students.tsx
The page already has an `enrollmentMap` (from `batch_enrollments` query). Update the badge condition to also check if the student has any active enrollment in the map, not just `batch_id`.

### Data fix
Run a single SQL UPDATE to sync the student's `batch_id` with their active enrollment.
