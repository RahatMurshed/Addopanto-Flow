

# Fix: "View Payments" Button in Enrollment Timeline

## Problem
The "View Payments" button in the Enrollment History card navigates to `/students/undefined/profile` because:
1. The `student_id` field is not included in the Supabase select query for enrollments
2. Even if it were, it would just reload the same profile page -- not useful

## Solution
Two small changes in `src/components/students/profile/EnrollmentTimeline.tsx`:

### 1. Add `student_id` to the select query (line 52)
Add `student_id` to the fields selected from `batch_enrollments` so it's available in the enrollment data.

### 2. Fix the navigation target (line 351)
Change the navigate call from:
```
/students/${enrollment.student_id}/profile
```
to:
```
/students/${studentId}
```
This uses the `studentId` prop (already available from the component props) and navigates to the Student Detail page (`/students/:id`) which contains the full payment history table. No need to reference `enrollment.student_id` at all since `studentId` is already passed as a prop.

## Files Changed
- `src/components/students/profile/EnrollmentTimeline.tsx` -- 2 line changes
