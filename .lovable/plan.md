

# Fix: Student Creation Foreign Key Error on batch_id

## Problem
When adding a student, the submission fails with: `insert or update on table "students" violates foreign key constraint "students_batch_id_fkey"`.

This happens because:
1. The `batch_id` field defaults to `"none"` (a string), and when submitting, the code converts it to `undefined` via: `batch_id: academic.batch_id !== "none" ? academic.batch_id : undefined`
2. However, `undefined` in a JavaScript spread (`{...student}`) still creates the key, and the Supabase client may interpret this incorrectly
3. Additionally, **localStorage drafts** can restore a stale `batch_id` from a previously deleted batch, causing the foreign key violation

## Fix

### 1. Sanitize `batch_id` before insert (both AddStudent.tsx and StudentWizardDialog.tsx)

Change the batch_id assignment from:
```typescript
batch_id: academic.batch_id !== "none" ? academic.batch_id : undefined
```
To explicitly set `null` instead of `undefined`, and also guard against empty strings:
```typescript
batch_id: (academic.batch_id && academic.batch_id !== "none") ? academic.batch_id : null
```

### 2. Sanitize in `useCreateStudent` hook (useStudents.ts)

Add a safeguard in the mutation function to strip invalid `batch_id` values before inserting:
```typescript
const sanitized = {
  ...student,
  batch_id: student.batch_id || null,  // convert undefined/"" to null
  user_id: user.id,
  company_id: activeCompanyId,
};
```

### 3. Guard localStorage draft restoration

In both `AddStudent.tsx` and `StudentWizardDialog.tsx`, when restoring the academic draft from localStorage, validate that the stored `batch_id` still exists or reset it to `"none"`.

## Files to modify
- `src/pages/AddStudent.tsx` -- sanitize batch_id on submit
- `src/components/dialogs/StudentWizardDialog.tsx` -- sanitize batch_id on submit  
- `src/hooks/useStudents.ts` -- add batch_id null guard in useCreateStudent

