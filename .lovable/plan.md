

# Fix Employee Performance Tab & Workflow Bugs

## Bugs Found

### Bug 1: Performance tab not synced with Attendance, Salary, and Leaves (CRITICAL)
The performance hook uses separate query keys (`employee-perf-attendance`, `employee-perf-salary`) from the other tabs (`employee-attendance`, `employee-salary`). When attendance is marked, salary is paid, or leaves are added/deleted, only the tab-specific queries are invalidated -- the performance queries are never refreshed. This makes the Performance tab show stale/wrong data until a full page reload.

### Bug 2: Dynamic Tailwind class `grid-cols-${tabCount}` broken
Line 301 uses a template literal for the grid columns class. Tailwind cannot detect dynamic class names at build time, so the grid layout for tabs may not render correctly.

### Bug 3: Leave delete has no confirmation dialog
The Leaves tab delete button immediately deletes without any confirmation, unlike the Salary tab which uses an AlertDialog.

## Fix Plan

### File: `src/hooks/useEmployees.ts`
Add performance query invalidation to all relevant mutation hooks:

- **`useMarkAttendance`** (line 340-342): Also invalidate `["employee-perf-attendance"]` for the employee
- **`useCreateSalaryPayment`** (line 287-290): Also invalidate `["employee-perf-salary"]` for the employee
- **`useDeleteSalaryPayment`** (line 302-304): Also invalidate `["employee-perf-salary"]` for the employee
- **`useCreateLeave`** (line 373-375): Also invalidate `["employee-perf-attendance"]` (leaves affect performance attendance data)
- **`useDeleteLeave`** (line 387-389): Also invalidate `["employee-perf-attendance"]`

### File: `src/pages/EmployeeDetail.tsx`

1. **Fix dynamic grid class** (line 301): Replace `grid-cols-${tabCount}` with a conditional expression using explicit Tailwind classes: `salaryVisible ? "grid-cols-5" : "grid-cols-4"`

2. **Add confirmation dialog for leave deletion** (lines 802-805): Wrap the delete button in an `AlertDialog` (same pattern as salary tab) to prevent accidental deletions

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useEmployees.ts` | Add performance query invalidation to 5 mutation hooks |
| `src/pages/EmployeeDetail.tsx` | Fix dynamic grid class; add leave delete confirmation dialog |

