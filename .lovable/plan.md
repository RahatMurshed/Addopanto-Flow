

# Duplicate Student Detection System

## Overview
A conservative duplicate detection system that flags student entries only with definitive proof of duplication, prioritizing zero false positives. Access restricted to Admin and Cipher roles only.

## Matching Criteria (Strict)
Only these combinations trigger a duplicate flag:
1. **Phone + Name** -- exact phone AND exact name match (both required, after normalization)
2. **Email** -- exact email match (strong unique identifier)
3. **Aadhar/National ID** -- exact aadhar_id_number match (definitive identifier)

Deliberately excluded: name alone, phone alone, address, father name, fuzzy/partial matches.

## Normalization Rules
- **Phone**: strip spaces, dashes, parentheses, dots; remove leading country codes (+91, 0091, etc.); compare digits only
- **Name**: lowercase, trim whitespace, collapse multiple spaces -- no fuzzy logic
- **Email**: lowercase, trim whitespace
- **Aadhar**: strip spaces and dashes, compare digits only

---

## Technical Plan

### 1. Database: Server-Side Detection Function

Create a migration with:

**A. Performance indexes** on students table:
```sql
CREATE INDEX IF NOT EXISTS idx_students_phone_company
  ON students (company_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_email_company
  ON students (company_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_aadhar_company
  ON students (company_id, aadhar_id_number) WHERE aadhar_id_number IS NOT NULL;
```

**B. Security definer function** `find_duplicate_students(_company_id uuid)` that:
- Normalizes phone/name/email/aadhar in SQL using `regexp_replace`, `lower`, `trim`
- Returns groups of matching student IDs with the match criteria label
- Marks the oldest enrolled student (by `enrollment_date`) as the "primary" suggestion
- Returns: `student_id uuid, group_id int, match_criteria text, is_primary bool`

**C. Security definer function** `check_student_duplicates_single(...)` for real-time creation checks:
- Accepts normalized phone, name, email, aadhar, company_id
- Returns matching student IDs and criteria if any exist
- Used during student creation to show warnings

### 2. New Hook: `useDuplicateDetection`

**File**: `src/hooks/useDuplicateDetection.ts`

- `useFindDuplicates()` -- calls `find_duplicate_students` RPC, returns grouped results with student details (name, phone, email, enrollment_date, batch, payment count)
- `useCheckSingleDuplicate(phone, name, email, aadhar)` -- debounced check during student creation, calls `check_student_duplicates_single` RPC
- Normalization utility functions (shared between frontend warning and the DB function for consistency)

### 3. New Page: Duplicate Review (`/students/duplicates`)

**File**: `src/pages/StudentDuplicates.tsx`

- Access: Admin and Cipher only (via AccessGuard rule)
- Shows duplicate groups in expandable cards
- Each group displays:
  - Match criteria badge (Phone+Name / Email / Aadhar)
  - Side-by-side student comparison: name, phone, email, aadhar, enrollment date, batch, status, payment count
  - Primary student suggestion (oldest enrollment) highlighted
- Actions per group:
  - **View Profile** -- opens student detail
  - **Merge** -- transfers payments/batch history to primary, soft-deletes duplicate, logs to audit
  - **Delete** -- hard delete with confirmation warning about data loss
  - **Mark Not Duplicate** -- stores dismissal so pair is excluded from future scans
- Empty state when no duplicates found

### 4. Dismissal Table

New table `duplicate_dismissals`:
```
id uuid PK
company_id uuid NOT NULL
student_id_a uuid NOT NULL
student_id_b uuid NOT NULL
dismissed_by uuid NOT NULL
created_at timestamptz DEFAULT now()
```
With RLS: Admin/Cipher insert and select only. The detection function excludes dismissed pairs.

### 5. Merge Logic (Edge Function)

**File**: `supabase/functions/merge-students/index.ts`

- Accepts: `primary_student_id`, `duplicate_student_id`, `company_id`
- Validates caller is Admin/Cipher via membership check
- Transfers: student_payments, student_batch_history, monthly_fee_history, student_siblings from duplicate to primary
- Fills empty fields on primary from duplicate (e.g., if primary has no email but duplicate does)
- Soft-deletes duplicate by setting status to `'inactive'` with notes "Merged into [primary name]"
- Logs merge action to audit_logs with old_data/new_data
- Returns success/failure

### 6. Real-Time Warning During Student Creation

**Modified files**:
- `src/pages/AddStudent.tsx` -- after PersonalStep and ContactStep, check for duplicates
- `src/components/StudentWizardSteps/PersonalStep.tsx` -- show warning banner if aadhar matches
- `src/components/dialogs/StudentWizardDialog.tsx` -- integrate duplicate check

Warning UI: amber banner below the form showing "A student with this [phone+name / email / Aadhar] already exists" with link to view the existing student. Non-blocking (user can still proceed).

### 7. Post-Import Detection

**Modified file**: `src/components/dialogs/BulkImportDialog.tsx`
- After successful CSV import, automatically trigger `find_duplicate_students` and show result count
- "Review Duplicates" button navigates to `/students/duplicates`

### 8. Routing and Navigation

- Add route `/students/duplicates` in `App.tsx` with AccessGuard blocking moderators
- Add "Find Duplicates" button on Students page (visible to Admin/Cipher only)
- Add nav entry or keep it as a button-only access point from Students page

### 9. Access Control

- New AccessGuard rule: `moderatorDuplicates` blocking all moderators
- DB functions use `SECURITY DEFINER` so RLS doesn't interfere with cross-student comparison
- Edge function validates caller role server-side

### 10. Audit Trail

All actions logged to existing `audit_logs` table:
- Detection runs: not logged (read-only operation)
- Merge actions: logged with table_name='students', action='UPDATE', old_data/new_data showing merge details
- Deletions: logged via existing delete triggers
- Dismissals: logged via existing audit trigger pattern

---

## File Summary

| Action | File |
|--------|------|
| Create | `supabase/migrations/[timestamp]_duplicate_detection.sql` (indexes, functions, dismissals table) |
| Create | `supabase/functions/merge-students/index.ts` |
| Create | `src/hooks/useDuplicateDetection.ts` |
| Create | `src/pages/StudentDuplicates.tsx` |
| Modify | `src/App.tsx` (add route) |
| Modify | `src/components/auth/AccessGuard.tsx` (add rule) |
| Modify | `src/pages/Students.tsx` (add "Find Duplicates" button) |
| Modify | `src/pages/AddStudent.tsx` (real-time duplicate warning) |
| Modify | `src/components/dialogs/StudentWizardDialog.tsx` (real-time warning) |
| Modify | `src/components/dialogs/BulkImportDialog.tsx` (post-import check) |

