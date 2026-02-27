

# Open Full Wizard Dialog for Editing Students on Profile Page

## Problem
The current "Edit" button opens a simple `StudentDialog` with limited fields. The user wants the full multi-step wizard (`StudentWizardDialog`) to open instead, pre-filled with the student's existing data, so all fields are editable.

## Changes

### 1. Update `StudentWizardDialog.tsx` to support edit mode
- Add optional `student?: Student` prop to the `Props` interface
- When `student` is provided, pre-fill all step states (personal, contact, family, academic) from the student's data instead of defaults
- Skip loading localStorage drafts when in edit mode
- Change dialog title from "Add New Student" to "Edit Student" when editing
- Change submit button label from "Add Student" to "Update Student"
- In `handleSubmit`, if editing, call `onSave` with the student data (the parent handles whether it's create or update)
- Skip the initial payment section in the Review step when editing (payments are managed separately)

### 2. Update `StudentProfilePage.tsx`
- Replace `StudentDialog` import with `StudentWizardDialog`
- Update `handleUpdateStudent` to accept `StudentInsert` (matching the wizard's `onSave` signature) and call `updateStudent.mutateAsync({ id: student.id, ...data })`
- Render `StudentWizardDialog` instead of `StudentDialog`, passing the current `student` object

### 3. Update `ReviewStep.tsx` (minor)
- Accept an optional `hidePayment?: boolean` prop to hide the initial payment section when in edit mode

## Technical Details

**Pre-filling student data into wizard steps:**

```text
PersonalData <- student.name, date_of_birth, gender, blood_group, religion_category, nationality, aadhar_id_number
ContactData  <- student.phone, whatsapp_number, alt_contact_number, email, address_*, perm_address_*, permanent_address_same
FamilyData   <- student.father_*, mother_*, guardian_*  (siblings fetched separately or left empty)
AcademicData <- student.student_id_number, previous_school, class_grade, enrollment_date, billing_start_month, fees, batch_id, status, notes, etc.
```

**Key behavior differences in edit mode:**
- No localStorage draft loading/saving (edit uses live DB data)
- No initial payment recording on submit
- Dialog title and button text reflect "Edit" instead of "Add"

