# Fix Navigation Flash for Moderators + Security Hardening

## Problem

When a moderator (especially DEO) refreshes the page, they see admin-level navigation items flash briefly before the correct restricted menu appears. This happens because `AppLayout` renders during the loading phase when role data hasn't resolved yet, defaulting all permission flags to `false` (which makes the user appear to be an admin).

## Root Cause

In `App.tsx`, `CompanyGuard` renders `<AppLayout><ContentLoader /></AppLayout>` while `isLoading` is true. Inside `AppLayout`, `useCompany()` returns default falsy values for `isModerator`, `isDataEntryModerator`, etc. The `buildNavItems()` function treats a non-moderator as admin, showing full navigation.

## Solution

### 1. Fix the Navigation Flash (AppLayout.tsx)

Add a loading guard at the top of `buildNavItems()` -- when `isLoading` is true, return an empty array (no nav items). The `ContentLoader` spinner is already showing, so an empty sidebar during loading is correct behavior.

```text
buildNavItems():
  if (isLoading) return []    <-- NEW: no nav items while loading
  if (isDataEntryModerator) ...
  else if (isTraditionalModerator) ...
  else ... (admin/cipher full nav)
```

This requires reading `isLoading` from `useCompany()` inside `AppLayout`. The existing destructuring already has access to this via `companyLoading` or we can add it.

### 2. Hide Sidebar Chrome During Loading

While role data loads, also hide the company switcher and bottom nav (profile/logout) to prevent any UI that implies admin access. Show a subtle skeleton or just the logo.

### 3. Security Audit Findings (Backend/RLS)

After thorough review of all RLS policies, database functions, and edge functions:

**Already Secure (no changes needed):**

- Students: RLS enforces company isolation + DEO `user_id` filter
- Student Payments: RLS blocks DEO completely, checks `company_can_*_payment`
- Revenues: RLS blocks DEO, checks `company_can_*_revenue`
- Expenses: RLS allows DEO only their own records (`user_id = auth.uid()`)
- Batches/Courses: RLS blocks DEO, checks `company_can_*_batch`
- Products/Product Sales: RLS blocks DEO, admin-only write
- Employees: RLS uses `company_can_manage_employees` / `company_can_view_employees`
- Company Memberships: Admin/Cipher only for write operations
- Audit Logs: Admin/Cipher only for SELECT
- Company Creation Requests: Cipher only for SELECT/UPDATE
- Company Join Requests: Admin/Cipher only for UPDATE
- Expense Accounts, Revenue Sources, Allocations, Transfers: All properly gated
- Edge functions (company-join, admin-users, reset-company-data, bulk-import-students): All validate auth + role server-side

**Minor RLS Gap -- student_siblings:**

- Missing UPDATE and DELETE policies. Currently users cannot update or delete sibling records at all (no policy = deny). This is safe but may be a functionality gap. No security risk.

**No new migration or RLS changes needed.** The backend is properly secured. The only real issue is the frontend flash.

### 4. Additional Frontend Hardening (recommended)

Add `isLoading` checks to pages that currently use `useEffect` redirects to avoid the same flash pattern:

- `AuditLog.tsx` (line 564-568): Show loader while `companyLoading` instead of rendering page then redirecting
- `SettingsPage.tsx` (line 65-69): Already handles this with `loading || roleLoading` check at line 185

## Files to Change


| File                                  | Change                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/components/layout/AppLayout.tsx` | Read `isLoading` from `useCompany()`, return empty nav array + hide sidebar chrome while loading |
| `src/pages/AuditLog.tsx`              | Return loader/null while `companyLoading` before the redirect `useEffect` fires                  |


## What Will NOT Change

- No RLS policies modified (already secure)
- No edge functions modified
- No database migrations
- No existing features broken
- No route structure changes

## Summary

This is primarily a **UI timing fix** -- the backend authorization is already comprehensive and properly enforced via RLS. The flash is cosmetic but concerning from a user trust perspective. The fix is minimal: suppress navigation rendering until role data is resolved.