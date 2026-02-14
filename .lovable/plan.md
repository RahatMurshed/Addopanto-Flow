
# Multi-Company System: End-to-End Quality & Security Hardening Plan

This plan addresses the most impactful improvements across your multi-company system, organized by priority. Given the scope, this is broken into actionable batches.

---

## Batch 1: Critical Bug Fixes & Security Gaps

### 1.1 Fix Dashboard query missing company_id filtering
The Dashboard query (`src/pages/Dashboard.tsx` line 80) uses `queryKey: ["dashboard", user?.id]` but should include `activeCompanyId` to ensure data isolation when switching companies. All financial queries on the Dashboard need `company_id` filtering in both the query key and the SQL filter.

### 1.2 Fix SettingsPage using legacy RoleContext instead of CompanyContext
`src/pages/SettingsPage.tsx` imports from `useRole()` (global platform roles) instead of `useCompany()` (company-scoped roles). This means company admins may be incorrectly blocked from settings. Update to use `useCompany()` for `isCompanyAdmin` checks.

### 1.3 Fix RoleGuard and PermissionGuard using legacy RoleContext
`src/components/RoleGuard.tsx` and `PermissionGuard` use the global `useRole()` context. Pages using `PermissionGuard` (like Dashboard quick actions) may not respect company-level permissions correctly. Either update these guards to use `CompanyContext` or ensure both contexts stay in sync.

### 1.4 Add loading skeleton to CompanyMembers page
When `membersLoading` is true, the members table currently renders empty. Add `SkeletonTable` loader matching the existing pattern used in `CompanyJoinRequests.tsx`.

### 1.5 Add `can_add_expense_source` permission column to members table
The members table shows Revenue, Expense, Transfer, Reports, Students columns but is missing the "Expense Sources" permission toggle. Add it to match the full permission set in `company_memberships`.

---

## Batch 2: Access Control & Route Protection

### 2.1 Platform Users page (Cipher-only) route guard
`UserManagement.tsx` currently checks `isCipher` from `useRole()`. Add an explicit early `Navigate` redirect (like CompanyMembers does) for non-Cipher users attempting direct URL access to `/users`.

### 2.2 Ensure moderators see Members page as read-only
Currently `canViewMembers` allows moderators onto the Members page, but action buttons (role change, remove, permission toggles) should be hidden for moderators. The code already does this via `canModifyMember` logic -- verify the `Requests` and `Invite` tabs are also hidden for moderators (they should only see the Members list tab).

### 2.3 Settings page access for company admins
Update `SettingsPage` to allow company admins access (currently it redirects moderators but may also block company admins who lack platform-level roles).

---

## Batch 3: UI/UX Improvements

### 3.1 Company Selection page enhancements
- Company cards already show logos, member counts, and role badges (verified in code)
- Add skeleton loading state during company fetch (currently just shows spinner)

### 3.2 Join Company page improvements
- Add password visibility toggle on the password input
- Add "Already requested" state more prominently (currently subtle yellow text)
- Disable form inputs and cancel button during submission (currently only button is disabled)

### 3.3 Members page improvements
- Add member count in header
- Add join date column to the members table
- Show "No permission to manage" message for moderators viewing the Requests/Invite tabs
- Add loading states on individual permission toggle switches during mutation

### 3.4 CompanyJoinRequests: show full_name alongside email
Update `requestProfiles` query to also fetch `full_name` and display it in the requests table.

---

## Batch 4: Data Isolation & Query Hardening

### 4.1 Add activeCompanyId to all financial query keys
Audit all hooks (`useRevenues`, `useExpenses`, `useStudents`, `useKhataTransfers`, `useExpenseAccounts`, `useRevenueSources`, `useStudentPayments`) to ensure they include `activeCompanyId` in their React Query keys and filter by `company_id` in their SQL queries.

### 4.2 CompanyJoinRequests: restrict Requests/Invite tabs to admins
Moderators with `canViewMembers` can see the Members tab, but the Requests and Invite tabs should only be visible to `canManageMembers` users (admins).

### 4.3 Validate company_id on mutations
Ensure all insert/update mutations include the active `company_id` and that RLS policies enforce it.

---

## Batch 5: Performance & Caching

### 5.1 Add database indexes (migration)
```sql
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_company 
  ON company_memberships(user_id, company_id, status);
CREATE INDEX IF NOT EXISTS idx_students_company_status 
  ON students(company_id, status);
CREATE INDEX IF NOT EXISTS idx_revenues_company_date 
  ON revenues(company_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date 
  ON expenses(company_id, date);
CREATE INDEX IF NOT EXISTS idx_student_payments_company_student 
  ON student_payments(company_id, student_id, payment_date);
```

### 5.2 Stale time optimization
- Company list: increase stale time to 5 minutes (already done)
- Member permissions: keep at 30 seconds for responsiveness (already done)
- Financial data: 30 seconds (already configured)

---

## Technical Details

### Files to modify:
1. `src/pages/Dashboard.tsx` -- Add `activeCompanyId` to query key
2. `src/pages/SettingsPage.tsx` -- Switch from `useRole()` to `useCompany()`
3. `src/pages/CompanyMembers.tsx` -- Add skeleton loading, join date column, hide Requests/Invite tabs for moderators
4. `src/pages/UserManagement.tsx` -- Add explicit `Navigate` guard for non-Cipher
5. `src/components/RoleGuard.tsx` -- Consider deprecation notice or dual-context support
6. `src/components/CompanyJoinRequests.tsx` -- Fetch and display `full_name`
7. `src/pages/JoinCompany.tsx` -- Password toggle, disable inputs during loading
8. `src/components/AppLayout.tsx` -- Minor nav adjustments
9. Database migration for performance indexes

### Files that are already correct:
- `supabase/functions/company-join/index.ts` -- All actions properly check `isCipher || isCompanyAdmin`
- `src/contexts/CompanyContext.tsx` -- Permission logic is correct
- RLS policies -- Now properly using `SECURITY DEFINER` functions (recursion fixed)

### Estimated scope:
- ~10 files modified
- 1 database migration (indexes only)
- No new edge functions needed
- No breaking changes
