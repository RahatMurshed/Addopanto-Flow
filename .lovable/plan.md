
# Fix: Enrollment Flows Not Creating `batch_enrollments` Records

## Problem

When a student is enrolled in a batch (via the Student Wizard, Batch Enroll Dialog, or Batch Assign Dialog), the code only updates the `students.batch_id` column. It never inserts a row into the `batch_enrollments` table.

The Enrollment Timeline and Financial Breakdown cards both query `batch_enrollments` to display data, so they show "No enrollments yet" even for enrolled students.

## Root Cause

Three enrollment code paths all have the same gap:

1. **StudentWizardDialog** (new student creation) -- sets `batch_id` on the student record, no enrollment row created
2. **BatchEnrollDialog** (enroll existing student from batch page) -- calls `updateStudent({ batch_id })`, no enrollment row
3. **BatchAssignDialog** (assign student to batch) -- calls `updateStudent({ batch_id })`, no enrollment row

## Solution

Add a `batch_enrollments` insert after every `students.batch_id` update in all three flows. No database migration needed -- the table and schema already exist.

### 1. `src/components/dialogs/BatchEnrollDialog.tsx`

After the `updateStudentMutation.mutateAsync` call on line 82, insert a `batch_enrollments` record:

```typescript
await supabase.from("batch_enrollments").insert({
  student_id: student.id,
  batch_id: batchId,
  company_id: activeCompanyId,
  created_by: user.id,
  status: "active",
  total_fee: 0,
});
```

This requires importing `supabase`, `useAuth`, and `useCompany` into the component.

### 2. `src/components/dialogs/BatchAssignDialog.tsx`

Inside the `Promise.all` loop (around line 96), after updating the student's `batch_id`, also insert a `batch_enrollments` record for each student being assigned. The component already has access to `useAuth` context indirectly -- will need to add `supabase` import and user/company context.

### 3. `src/components/dialogs/StudentWizardDialog.tsx`

After the student is saved (around line 310-320 in `handleSubmit`), if `academic.batch_id` is not `"none"`, insert a `batch_enrollments` record for the newly created student.

### 4. Fix Existing Data

For the student already enrolled (`d6a2d736-cfd1-46a4-919a-35ee60d81dcf`), we need to backfill the missing `batch_enrollments` record. A small migration will handle all students that have a `batch_id` set but no corresponding enrollment record:

```sql
INSERT INTO public.batch_enrollments (student_id, batch_id, company_id, created_by, status, total_fee)
SELECT s.id, s.batch_id, s.company_id, s.user_id, 'active', 0
FROM public.students s
WHERE s.batch_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.batch_enrollments be
    WHERE be.student_id = s.id AND be.batch_id = s.batch_id
  );
```

## Files Changed

- **Database migration** (1 new file) -- backfill missing enrollment records
- `src/components/dialogs/BatchEnrollDialog.tsx` -- add enrollment insert after batch assignment
- `src/components/dialogs/BatchAssignDialog.tsx` -- add enrollment insert after batch assignment
- `src/components/dialogs/StudentWizardDialog.tsx` -- add enrollment insert when creating student with a batch

## Technical Notes

- The `batch_enrollments` table has sensible defaults (`enrollment_date = CURRENT_DATE`, `status = 'active'`, `total_fee = 0`), so minimal fields need to be provided
- The `total_fee` can be set to 0 initially; it represents the fee agreement for that specific enrollment
- No RLS changes needed -- existing policies on `batch_enrollments` already allow company members to insert
