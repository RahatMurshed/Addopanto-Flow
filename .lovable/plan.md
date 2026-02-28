

## Auto-set "Inquiry" status when student is removed from a batch

### Problem
When a student is removed from a batch, their status stays as-is (e.g., "active") even though they no longer have any active enrollment. The desired behavior is to automatically revert them to "inquiry" status -- but **only** if they have no other active enrollments in other batches/courses.

### Logic
- Student removed from Batch A, still enrolled in Batch B --> status stays unchanged
- Student removed from Batch A, no other active enrollments --> status changes to "inquiry"

### Implementation

#### 1. Update the `remove_student_from_batch` database function
Modify the existing RPC function to check for remaining active enrollments after deleting the current one. If none remain, set the student's status to `'inquiry'`.

**Changes to the function (new migration):**
- After deleting the enrollment and clearing `batch_id`, add a check:
  ```text
  -- Count remaining active enrollments for this student
  SELECT COUNT(*) INTO v_remaining
  FROM batch_enrollments
  WHERE student_id = p_student_id
    AND company_id = p_company_id
    AND status = 'active';

  -- If no active enrollments remain, set status to inquiry
  IF v_remaining = 0 THEN
    UPDATE students
    SET status = 'inquiry'
    WHERE id = p_student_id
      AND company_id = p_company_id;
  END IF;
  ```
- Include the status change in the audit log's `new_data` for traceability.

#### 2. Update the frontend toast message
In `BatchDetail.tsx`, update the success toast after removal to mention the status change when applicable. The RPC return type will be extended to include a `status_changed` boolean so the frontend knows whether the student was moved to inquiry.

### Files to change
- **New migration SQL**: Recreates `remove_student_from_batch` with the remaining-enrollment check
- **`src/pages/BatchDetail.tsx`**: Update toast to conditionally mention "Status set to Inquiry"

### Edge cases handled
- Student with multiple active enrollments: only the removed enrollment is affected, status unchanged
- Student with only one enrollment: status set to "inquiry" automatically
- Student already in "inquiry" status: no-op on the status update (harmless)
- Student in "inactive"/"graduated"/"dropout" status: will be overwritten to "inquiry" -- this is intentional since removal implies re-evaluation
