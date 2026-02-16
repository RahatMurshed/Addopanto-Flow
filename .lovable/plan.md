

## Restrict Student PII Access to Admin and Cipher Only

### The Problem

The `students` table has 60+ columns including highly sensitive PII:
- National ID (`aadhar_id_number`)
- Contact info (`email`, `phone`, `whatsapp_number`, `alt_contact_number`)
- Full address (house, street, area, city, state, PIN)
- Family details (`father_contact`, `mother_contact`, `guardian_contact`, `father_annual_income`)
- Medical info (`special_needs_medical`, `blood_group`)
- Emergency contacts

Currently, **all company members** (including DEOs and Viewers) can query every column via the SELECT policy. Only Admins and Ciphers should see the sensitive fields.

### Solution: Database View + Conditional Frontend Fetching

**Approach:** Create a `students_safe` view that exposes only non-sensitive columns. Non-admin roles query this view; Admins/Ciphers continue querying the full table.

---

### Step 1: Create `students_safe` View

A new database view that excludes sensitive columns:

**Included (safe) columns:**
`id`, `name`, `student_id_number`, `enrollment_date`, `billing_start_month`, `admission_fee_total`, `monthly_fee_amount`, `status`, `notes`, `user_id`, `created_at`, `updated_at`, `course_start_month`, `course_end_month`, `company_id`, `batch_id`, `class_grade`, `roll_number`, `academic_year`, `section_division`, `gender`

**Excluded (sensitive) columns:**
`email`, `phone`, `whatsapp_number`, `alt_contact_number`, `date_of_birth`, `blood_group`, `religion_category`, `nationality`, `aadhar_id_number`, all address fields (12 columns), all family fields (8 columns), `special_needs_medical`, `emergency_contact_name`, `emergency_contact_number`, `previous_school`, `previous_qualification`, `previous_percentage`, `board_university`, `transportation_mode`, `distance_from_institution`, `extracurricular_interests`, `language_proficiency`

The view uses `security_invoker=on` so it inherits the caller's RLS context.

### Step 2: Modify RLS on `students` Table

- **Keep** the existing SELECT policy for company members (needed for the view to work)
- **Add** a new restrictive SELECT policy that limits full-table access to Admin/Cipher only
- **Replace** the current broad SELECT policy so non-admin direct table queries return no rows
- The safe view continues to work because it only exposes non-sensitive columns

Alternatively (simpler, less disruptive):
- Leave the base table RLS unchanged
- Only change the **frontend code** to route non-admin users to the `students_safe` view
- This is a defense-in-depth approach: even if a non-admin somehow queries the base table, RLS still requires company membership, but they won't get PII through the app

### Step 3: Update Frontend Data Fetching

Modify `useStudents.ts` to check the user's role:
- If the user is **Admin** or **Cipher**: query `students` table (full access)
- Otherwise: query `students_safe` view (no PII columns)

This requires passing the company role into the hook or reading it from context.

### Step 4: Conditionally Hide PII in UI

Update these components to hide sensitive fields for non-admin users:
- `StudentProfileDialog` -- hide contact/family/address tabs
- `StudentDetail` page -- hide PII sections
- `StudentExportDialog` -- exclude PII columns from exports for non-admins
- `ReviewStep` in the wizard -- no changes needed (only admins can add students with full data)

---

### Risk Assessment

| Area | Risk | Mitigation |
|---|---|---|
| View creation | None -- additive change | View is read-only, base table unaffected |
| Frontend routing | Low -- conditional query target | Fallback to safe view if role unknown |
| Student creation/editing | None -- only admins can do full edits | DEOs already restricted by existing permissions |
| Exports/backups | Low -- must filter columns | Check role before including PII in exports |
| Existing features | None -- admin/cipher experience unchanged | They continue seeing everything |

### Technical Details

**Migration SQL:**
```sql
CREATE VIEW public.students_safe
WITH (security_invoker=on) AS
  SELECT id, name, student_id_number, enrollment_date, billing_start_month,
         admission_fee_total, monthly_fee_amount, status, notes, user_id,
         created_at, updated_at, course_start_month, course_end_month,
         company_id, batch_id, class_grade, roll_number, academic_year,
         section_division, gender
  FROM public.students;
```

**Frontend changes:**
- `src/hooks/useStudents.ts` -- add role-based table selection
- `src/components/dialogs/StudentProfileDialog.tsx` -- conditionally render PII sections
- `src/components/dialogs/StudentExportDialog.tsx` -- filter export columns by role
- `src/pages/StudentDetail.tsx` -- hide sensitive sections for non-admin roles

**No changes to:**
- Student creation/editing flows (already permission-gated)
- Payment flows (no PII involved)
- Batch/course management
- Any existing RLS policies

