
## Fix: Course Update Failing with "Cannot coerce" Error

### Root Cause
The `courses` table is **missing an UPDATE RLS policy**. When you try to edit a course (e.g. changing status to inactive), the database silently blocks the update. The query returns 0 rows, and the `.single()` call in the code fails because it expects exactly 1 result.

From the database schema:
> Currently users **can't** UPDATE records from the table (courses)
> Currently users **can't** DELETE records from the table (courses)

### Fix

**Database Migration**: Add UPDATE and DELETE RLS policies for the `courses` table, matching the pattern used for batches (admin/cipher users can edit/delete):

```sql
CREATE POLICY "Authorized users can update courses"
  ON public.courses FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
  );

CREATE POLICY "Authorized users can delete courses"
  ON public.courses FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
  );
```

**Code Change** (`src/hooks/useCourses.ts`): Change `.single()` to `.maybeSingle()` in the `useUpdateCourse` hook (line 127) as a defensive measure, so even if the policy blocks the update, it returns a clear error instead of crashing.

### Impact
- Course editing (status changes, name changes, etc.) will work for admins and cipher users
- Course deletion will also be unblocked (same missing policy)
- No changes to the UI needed -- the existing CourseDialog and Courses page will work as-is once the policies are in place
