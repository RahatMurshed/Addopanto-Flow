
## Fix Issues Found During DEO End-to-End Testing

Testing revealed two issues that need to be fixed:

### Issue 1: Audit Log page crashes with "Select.Item must have a value prop that is not an empty string"

The `TABLE_OPTIONS` and `ACTION_OPTIONS` arrays use `value: ""` for the "All" options, but Radix UI's Select component does not allow empty string values.

**Fix in `src/pages/AuditLog.tsx`:**
- Change `{ value: "", label: "All Tables" }` to `{ value: "all", label: "All Tables" }`
- Change `{ value: "", label: "All Actions" }` to `{ value: "all", label: "All Actions" }`
- Update the state initializers from `""` to `"all"`
- Update the filter logic to treat `"all"` as no filter (pass empty string to the hook)

### Issue 2: Settings page missing DEO redirect

The Settings page (`src/pages/SettingsPage.tsx`) does not redirect Data Entry Operators to the dashboard. DEOs should not access settings.

**Fix in `src/pages/SettingsPage.tsx`:**
- Import `useCompany` and `useEffect`/`useNavigate`
- Add a redirect guard: if `isDataEntryOperator` and not admin/cipher, redirect to `/dashboard`

### What Worked (confirmed during testing)

1. Admin can open Members page and see all 3 members
2. Role dropdown shows all 4 roles: Admin, Moderator, Viewer, Data Entry Operator
3. Selecting "Data Entry Operator" immediately saves and shows the granular permission matrix
4. Permission matrix has 6 grouped sections (Student, Payment, Batch, Revenue, Expense, Other) with individual toggle switches
5. Toggling permissions (Add Student, Add Payment, Add Batch) saves correctly with "Member updated" toast
6. Database confirmed: `can_add_student=true, can_add_payment=true, can_add_batch=true, can_add_revenue=true` for the DEO user
7. Sidebar navigation correctly shows all items for admin users

### Technical Details

**Files to modify:**
- `src/pages/AuditLog.tsx` -- Fix empty string Select values (lines 19, 30, 157-158, and filter pass-through on lines 204, 214)
- `src/pages/SettingsPage.tsx` -- Add DEO redirect guard
