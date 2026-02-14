
# End-to-End Multi-Company System Audit Results & Remaining Fixes

## Audit Summary

After reviewing the full codebase, database schema, RLS policies, and live data, the system is largely well-implemented. Below are the specific issues found and fixes needed.

---

## Issues Found & Fixes Required

### 1. Data Isolation Gap: RLS filters data by company, but queries don't explicitly filter

**Problem**: The Supabase RLS policies on `revenues`, `expenses`, `students`, etc. check `company_id = get_active_company_id(auth.uid())`, which correctly filters at the database level. However, the frontend queries in `useRevenues`, `useExpenses`, `useAccountBalances`, and `useRevenueSources` do NOT include `.eq("company_id", activeCompanyId)` in their queries. This means:
- RLS handles isolation correctly at the DB level (safe)
- But if RLS were ever misconfigured or bypassed, there would be no application-level filtering
- More importantly, if a user switches companies quickly, stale cached data from the old company could briefly appear before new queries complete

**Fix**: Add explicit `.eq("company_id", activeCompanyId)` filter to all financial queries as defense-in-depth. This is a best practice even though RLS handles it.

**Files**: `src/hooks/useRevenues.ts`, `src/hooks/useExpenses.ts`, `src/hooks/useRevenueSources.ts`, `src/hooks/useExpenseAccounts.ts`, `src/hooks/useKhataTransfers.ts`, `src/hooks/useStudentPayments.ts`

### 2. Dashboard queries missing company_id filter in SQL

**Problem**: `src/pages/Dashboard.tsx` (lines 88-96) fetches revenues, expenses, allocations, accounts, and sources without any `.eq("company_id", ...)` filter. While the query key includes `activeCompanyId` (which was recently fixed), the actual Supabase queries rely entirely on RLS. Adding explicit filtering would improve performance by reducing data transfer when switching companies.

**Fix**: Add `.eq("company_id", activeCompanyId)` to each query inside the Dashboard's `queryFn`, and add an `enabled: !!activeCompanyId` guard.

**File**: `src/pages/Dashboard.tsx`

### 3. Companies table exposes `join_password` in plaintext via SELECT

**Problem**: The `companies` table has an RLS policy allowing all authenticated users to SELECT all columns (`USING (true)`). This means the `join_password` column is readable by every logged-in user, defeating its purpose. Users could simply query the companies table to read passwords.

**Fix**: Create a database view (`companies_public`) that excludes `join_password` and `invite_code`, and update the frontend to query the view instead. Alternatively, restrict the base table SELECT policy to exclude those columns (views are the standard approach).

**Database change**: Create view + update RLS on base table
**Files**: `src/pages/JoinCompany.tsx` (change `from("companies")` to `from("companies_public")`), `src/contexts/CompanyContext.tsx`

### 4. Registration Requests page uses legacy global role system

**Problem**: `src/pages/RegistrationRequests.tsx` likely uses the global `useRole()` context for access control. This should also be available to company admins (for platform-level registration requests managed by Cipher only). Need to verify this page is Cipher-only as intended.

**File**: `src/pages/RegistrationRequests.tsx` -- verify and align with company context

### 5. Viewer role has no UI restrictions

**Problem**: The viewer user (`hi@hi.com`, role: viewer in Default Company) has `can_add_revenue: true`, `can_add_expense: false`, etc. in the `company_memberships` table, but the code doesn't enforce viewer-specific UI restrictions like disabled forms or "View Only" badges. The `isCompanyViewer` flag exists in `CompanyContext` but is never used in any page component.

**Fix**: Add conditional UI checks on pages like Revenue, Expenses, Students to disable add/edit/delete buttons when the user is a viewer or lacks specific permissions. Use `PermissionGuard` more broadly.

**Files**: `src/pages/Revenue.tsx`, `src/pages/Expenses.tsx`, `src/pages/Students.tsx`, `src/pages/Khatas.tsx`

### 6. Company password stored in plaintext

**Problem**: The `companies.join_password` column stores the password as plaintext. The `company-join` edge function compares passwords directly. This is a security risk.

**Fix**: Hash passwords using bcrypt in the edge function when creating/updating companies, and compare using bcrypt verify during join. This requires updating the `company-join` edge function and the company creation flow.

**Files**: `supabase/functions/company-join/index.ts`, `src/pages/CreateCompany.tsx`

---

## What's Working Correctly

- **Role hierarchy**: Cipher > Admin > Moderator > Viewer is properly enforced
- **Navigation**: Platform Users link only shows for Cipher; Members link shows for admins/moderators
- **Route guards**: UserManagement redirects non-Cipher; CompanyMembers redirects non-viewers
- **Company switching**: Works with proper cache invalidation
- **Permission toggles**: Members page correctly shows/hides toggles based on role
- **Join request flow**: Approve/reject with permission assignment works
- **Skeleton loaders**: Present on Dashboard, Members, and Join Requests pages
- **Query keys**: Most financial hooks include `activeCompanyId` in query keys
- **RLS policies**: Properly use `SECURITY DEFINER` functions to avoid recursion
- **Moderator read-only**: Members page hides Requests/Invite tabs for moderators
- **Database indexes**: Performance indexes are in place

---

## Implementation Plan

### Batch A: Security Fixes (Critical)

1. **Create `companies_public` view** excluding `join_password` and `invite_code`
2. **Update base table SELECT policy** to deny direct access (or be more restrictive)
3. **Update frontend queries** to use the view
4. **Hash company passwords** in the edge function

### Batch B: Defense-in-Depth Query Hardening

1. Add `.eq("company_id", activeCompanyId)` to all financial query hooks
2. Add the same filter to Dashboard queries
3. Add `enabled: !!activeCompanyId` guards where missing

### Batch C: Permission Enforcement in UI

1. Use `PermissionGuard` on Revenue, Expenses, Students, Khatas pages to hide add/edit/delete buttons
2. Add "View Only" indicator for viewers
3. Verify RegistrationRequests page access control

### Technical Details

- **Estimated files to modify**: 10-12
- **Database migrations**: 1 (create view, update policy)
- **Edge function updates**: 1 (password hashing)
- **No breaking changes**: All changes are additive or tightening
