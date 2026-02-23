

# Revised Duplicate Detection Strategy + Delete Feature

## The Problem with Current Criteria

The current system flags duplicates using three separate criteria:
- Phone + Name
- Email alone
- Aadhar alone

In your data, **11 out of 15 students share the same phone number** (parent's number), so Phone + Name generates many false positives (e.g., siblings). Email alone also produces false positives since parents reuse their email for multiple children. Aadhar is rarely filled in (0 out of 15 students have it).

## New Matching Strategy: Minimal but Safe

Replace all three criteria with a **single, high-confidence rule**:

**Exact Name + Exact Phone + Exact Email (all three must match)**

Why this is safe:
- Two different children of the same parent will have different names, so they won't match
- Two students with the same common name but different parents will have different phone/email
- Only truly duplicated entries (same person entered twice) will match all three fields
- Students missing any of these three fields are automatically excluded (no false positives from empty data)

This eliminates Aadhar and single-field matching entirely, reducing false positives to near zero while still catching real duplicates.

## Delete Duplicate Feature

The current UI already has a Delete button per student within duplicate groups, but it only appears for 2-student groups on non-primary students. The plan will:
- Make the Delete button available on all duplicate students (not just non-primary ones in pairs)
- Add a "Delete All Duplicates" bulk action button per group that keeps the primary and deletes the rest
- Use the existing `useDeleteStudent` hook (hard delete)

## Technical Changes

### 1. Database Migration: Replace `find_duplicate_students` function

Rewrite the function to use a single CTE matching on normalized name + phone + email (all three required):

```sql
CREATE OR REPLACE FUNCTION find_duplicate_students(_company_id uuid)
RETURNS TABLE(student_id uuid, group_id int, match_criteria text, is_primary boolean)
AS $$
  WITH matches AS (
    SELECT s.id AS sid,
      dense_rank() OVER (ORDER BY norm_name, norm_phone, norm_email) AS gid,
      s.enrollment_date
    FROM (
      SELECT id, enrollment_date,
        regexp_replace(lower(trim(name)), '\s+', ' ', 'g') AS norm_name,
        regexp_replace(regexp_replace(phone, '[\s\-\(\)\.]','','g'), '^(\+91|0091|91|0)','') AS norm_phone,
        lower(trim(email)) AS norm_email
      FROM students
      WHERE company_id = _company_id AND status != 'inactive'
        AND phone IS NOT NULL AND trim(phone) != ''
        AND email IS NOT NULL AND trim(email) != ''
    ) s
    WHERE (norm_name, norm_phone, norm_email) IN (
      SELECT ... GROUP BY ... HAVING count(*) > 1
    )
  )
  -- Filter dismissed pairs, return results
$$
```

### 2. Database Migration: Replace `check_student_duplicates_single` function

Update the real-time duplicate check (used when adding a student) to only warn when all three fields (name + phone + email) match an existing student. Remove the standalone email and aadhar checks.

### 3. Update `src/hooks/useDuplicateDetection.ts`

- Update `useCheckSingleDuplicate` to only trigger when all three fields (name, phone, email) have values
- Remove `normalizeAadhar` export (no longer used)
- Update `DuplicateStudent` interface (remove `aadhar_id_number` from fetch if desired, though keeping it for display is fine)

### 4. Update `src/pages/StudentDuplicates.tsx`

- Change `CRITERIA_LABELS` to reflect new single criterion: `{ name_phone_email: "Name + Phone + Email" }`
- Update the scan description text
- Make the Delete button visible for any student in a group (not just non-primary in pairs)
- Add a "Delete All Duplicates" button per group that deletes all non-primary students in one action
- Add a `useBulkDeleteStudents` call for the bulk action

### 5. Update `src/pages/AddStudent.tsx`

- Adjust the duplicate warning to only trigger when name, phone, AND email are all provided
- Update warning message text to reflect the new matching rule

### Files Modified
- New database migration (SQL function replacements)
- `src/hooks/useDuplicateDetection.ts`
- `src/pages/StudentDuplicates.tsx`
- `src/pages/AddStudent.tsx`

