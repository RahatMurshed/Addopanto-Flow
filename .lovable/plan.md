

# Make enrollment_date and billing_start_month Optional for CSV Import

## Problem
Currently, `enrollment_date` and `billing_start_month` are marked as required both in the database (NOT NULL) and in the CSV import validation. This forces users to provide these values even for students who aren't enrolled in any course.

## Solution

### 1. Database Migration
Make `enrollment_date` and `billing_start_month` nullable in the `students` table:
```sql
ALTER TABLE students ALTER COLUMN enrollment_date DROP NOT NULL;
ALTER TABLE students ALTER COLUMN billing_start_month DROP NOT NULL;
```

### 2. Update Edge Function Validation (`supabase/functions/bulk-import-students/index.ts`)
Remove the required checks for `enrollment_date` and `billing_start_month` in `validateRow()`. Keep format validation only when a value IS provided.

### 3. Update CSV Import Utilities (`src/utils/csvImportUtils.ts`)
Remove `required: true` from `enrollment_date` and `billing_start_month` in the `STUDENT_FIELDS` array, so only `name` remains required.

### 4. Update Frontend Validation
In `BulkImportDialog.tsx`, update the required-fields check to only require `name`.

### 5. Update Student Creation Forms
Review `AddStudent.tsx`, `StudentDialog.tsx`, and `StudentWizardDialog.tsx` to ensure they handle null `enrollment_date` and `billing_start_month` gracefully (these forms can still require them for their own flow since they handle enrollment, but shouldn't crash on null values from the database).

### 6. Update Student Hooks and Display
Ensure `useStudents.ts` and components like `StudentDetail.tsx`, `StudentMonthGrid.tsx`, and `FinancialBreakdown.tsx` handle null enrollment/billing values without crashing (null-safe checks).

## Technical Details
- The `students` table columns `enrollment_date` (date) and `billing_start_month` (text) will become nullable
- Monthly fee calculations and overdue tracking already check for active enrollment status, so null billing months won't generate false overdue entries
- Existing data is unaffected since all current rows already have values

