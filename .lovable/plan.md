

# Remove `on_hold` Enrollment Status

## Overview
Remove `on_hold` from the batch enrollment status options, keeping only `active`, `completed`, and `dropped`. Update the database constraint, fix existing data, and update all UI references.

## Changes

### 1. Database Migration
A new migration that:
- Drops the existing CHECK constraint on `batch_enrollments.status`
- Adds a new CHECK constraint allowing only `('active', 'completed', 'dropped')`
- Updates existing rows: set `status = 'active'` where the linked batch's `end_date` is NULL or in the future; set `status = 'completed'` where `end_date` is in the past
- Ensures the default remains `'active'`

```sql
-- Fix existing on_hold rows based on batch end_date
UPDATE public.batch_enrollments be
SET status = CASE
  WHEN b.end_date IS NULL OR b.end_date >= CURRENT_DATE THEN 'active'
  ELSE 'completed'
END
FROM public.batches b
WHERE be.batch_id = b.id
AND be.status = 'on_hold';

-- Drop old constraint, add new one
ALTER TABLE public.batch_enrollments
  DROP CONSTRAINT batch_enrollments_status_check;

ALTER TABLE public.batch_enrollments
  ADD CONSTRAINT batch_enrollments_status_check
  CHECK (status IN ('active', 'completed', 'dropped'));
```

### 2. `src/components/students/profile/EnrollmentTimeline.tsx`
- Remove `on_hold` from `EnrollmentStatus` type: `"active" | "completed" | "dropped"`
- Remove `on_hold` entries from `STATUS_DOT`, `STATUS_BADGE`, and `STATUS_LABEL` maps

### 3. `src/components/students/profile/ProfileHeader.tsx` (line 39)
- Remove the `on_hold` entry from the student status style map (this maps student-level statuses, not enrollment statuses, but the user wants it cleaned up)

### 4. `src/components/students/profile/ProfileStickyBar.tsx` (line 25)
- Remove the `on_hold` entry from the sticky bar status style map

## Files Changed
- New database migration (1 file)
- `EnrollmentTimeline.tsx` -- remove on_hold from 4 places
- `ProfileHeader.tsx` -- remove on_hold line
- `ProfileStickyBar.tsx` -- remove on_hold line
