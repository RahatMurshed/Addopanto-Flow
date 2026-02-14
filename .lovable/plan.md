

# Remaining Fixes for Multi-Company System Hardening

After a thorough audit, the system is in strong shape. Most critical security, data isolation, and permission enforcement items from previous batches are already implemented. Below are the remaining issues to fix.

---

## Fix 1: useCreateRevenue missing company_id filter on expense_accounts query

**File**: `src/hooks/useRevenues.ts` (line 55-58)

The `useCreateRevenue` mutation fetches expense accounts with `.eq("is_active", true)` but does NOT filter by `company_id`. This means allocations could potentially be created against expense accounts from other companies.

**Fix**: Add `.eq("company_id", activeCompanyId)` to the expense_accounts query inside `useCreateRevenue`.

---

## Fix 2: UserManagement console warning (Function components cannot be given refs)

**File**: `src/pages/UserManagement.tsx` (line 473)

The `AlertDialog` component is receiving a ref but is not wrapped in `forwardRef`. This is the source of the console error visible in logs.

**Fix**: The outer `AlertDialog` at line 473 is likely being passed a ref via the `open` prop pattern incorrectly. The fix is to ensure `AlertDialog` is not being used as a direct child where a ref is expected, or wrap the component properly.

---

## Fix 3: RegistrationRequests page still uses legacy RoleGuard

**File**: `src/pages/RegistrationRequests.tsx`

This page uses `RoleGuard` which depends on the global `useRole()` context. Since this is a platform-level page (Cipher-only for global registration approval), it should use `useRole().isCipher` or `useCompany().isCipher` for consistency, plus add an explicit `Navigate` redirect like `UserManagement.tsx` does.

**Fix**: Add explicit `isCipher` check with `Navigate` redirect at the top of the component, matching the pattern in `UserManagement.tsx`.

---

## Fix 4: CompanyMembers invite code query hits base `companies` table

**File**: `src/pages/CompanyMembers.tsx` (line 112-121)

The invite code query fetches from `companies` (base table) which has a SELECT policy allowing all authenticated users to read ALL columns (including `join_password`). While this specific query only selects `invite_code`, the base table policy is still overly permissive.

**Status**: The `companies_public` view was created but the base table SELECT policy was not tightened. This means any authenticated user can still query `companies` directly and read `join_password`.

**Fix**: Update the RLS policy on the `companies` base table to restrict SELECT access. Only cipher users and company admins should be able to SELECT from the base table. All other users should use `companies_public`.

**Database migration**:
```sql
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;

-- Restricted: only cipher or company admin/member can read base table
CREATE POLICY "Cipher and admins can view companies"
  ON companies FOR SELECT
  USING (
    is_cipher(auth.uid()) 
    OR is_company_admin(auth.uid(), id)
  );
```

---

## Fix 5: Viewer role "View Only" badge missing from UI

**Files**: `src/pages/Revenue.tsx`, `src/pages/Expenses.tsx`, `src/pages/Students.tsx`, `src/pages/Khatas.tsx`

The `isCompanyViewer` flag exists in CompanyContext but is never used in pages to show a "View Only" badge. While action buttons are already hidden via permission checks (`canAddRevenue`, `canEdit`, `canDelete`), there's no visual indicator that the user is in view-only mode.

**Fix**: Add a subtle "View Only" badge at the top of each page when `isCompanyViewer` is true.

---

## Summary

| Fix | Type | Priority | Files |
|-----|------|----------|-------|
| 1. Missing company_id in useCreateRevenue | Security bug | High | useRevenues.ts |
| 2. Console ref warning | Bug fix | Medium | UserManagement.tsx |
| 3. RegistrationRequests route guard | Access control | Medium | RegistrationRequests.tsx |
| 4. Base companies table SELECT policy | Security | High | Database migration |
| 5. View Only badge for viewers | UX | Low | Revenue/Expenses/Students/Khatas |

**Estimated scope**: 5 files modified, 1 database migration. No breaking changes.

