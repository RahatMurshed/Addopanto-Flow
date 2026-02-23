

# Role-Based Salary Visibility with Admin Toggle

## Overview
Salary data will be hidden by default for Admins with an eye toggle to reveal it on demand. Cipher users always see salary data without needing a toggle. Moderators never see salary data.

## Changes

### 1. Employees List Page (`src/pages/Employees.tsx`)
- Add a `showSalary` state, defaulting to `true` for Cipher and `false` for Admin
- Add an eye icon toggle button (EyeOff/Eye from lucide) next to the header or filters area, visible only to Admin users
- Conditionally show the "Salary" column and "Monthly Payroll" stats card based on `isCipher || showSalary`
- CSV export will include salary column only when salary is currently visible

### 2. Employee Detail Page (`src/pages/EmployeeDetail.tsx`)
- Add the same `showSalary` toggle state (default: `true` for Cipher, `false` for Admin)
- Show/hide the "Salary" tab, "Financial Information" card, and salary-related content based on `isCipher || showSalary`
- The toggle button appears in the header area, visible only to Admin users

### Technical Details

**State logic:**
```
const [showSalary, setShowSalary] = useState(isCipher);
const salaryVisible = isCipher || showSalary;
```

**Toggle UI (Admin only):**
A small button with Eye/EyeOff icon and tooltip "Show/Hide Salary" placed near the page header, rendered only when `canManage && !isCipher` (i.e., Admin only).

**Affected visibility areas:**
- Employees list: Salary table column, Monthly Payroll stat card, salary in CSV export
- Employee detail: Financial Information card, Salary tab, salary slip downloads

### Files Modified
- `src/pages/Employees.tsx` -- add toggle state and conditional rendering
- `src/pages/EmployeeDetail.tsx` -- add toggle state and conditional rendering

No database or backend changes needed -- this is purely a UI-level visibility control. The underlying RLS policies already restrict salary data access at the database level.

