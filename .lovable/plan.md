

# Clean Up Unused Employee Attendance, Leaves, and Performance Code & Tables

## What's being removed

The attendance, leaves, and performance features were removed from the UI but their code hooks and database tables remain. None of these hooks are imported by any component -- they are dead code.

## Code Changes

### 1. Remove `src/hooks/useEmployeePerformance.ts` (entire file)
This file is never imported anywhere. Delete it completely.

### 2. Clean up `src/hooks/useEmployees.ts`
Remove the following dead code:
- `EmployeeAttendance` interface (lines 88-96)
- `EmployeeLeave` interface (lines 98-110)
- `useEmployeeAttendance` function (lines 362-380)
- `useMarkAttendance` function (lines 382-398)
- `useEmployeeLeaves` function (lines 400-413)
- `useCreateLeave` function (lines 415-431)
- `useDeleteLeave` function (lines 433-445)

Also remove the `endOfMonth` and `format as fnsFormat` imports if they become unused after this cleanup.

### 3. Update `supabase/functions/reset-company-data/index.ts`
Remove `"employee_attendance"` and `"employee_leaves"` from the tables list (lines 121-122), since these tables will be dropped.

## Database Migration

### 4. Drop unused tables
Run a migration to drop the two tables:

```sql
DROP TABLE IF EXISTS employee_attendance CASCADE;
DROP TABLE IF EXISTS employee_leaves CASCADE;
```

This removes:
- `employee_attendance` table (with its RLS policies and foreign keys)
- `employee_leaves` table (with its RLS policies and foreign keys)

The `types.ts` file will auto-regenerate after the migration.

## Summary of files affected
- **Delete:** `src/hooks/useEmployeePerformance.ts`
- **Edit:** `src/hooks/useEmployees.ts` -- remove ~90 lines of dead code
- **Edit:** `supabase/functions/reset-company-data/index.ts` -- remove 2 table references
- **Migration:** Drop `employee_attendance` and `employee_leaves` tables

