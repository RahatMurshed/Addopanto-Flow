
# Fix: Deleted Users Getting Stuck on /companies/join

## Root Cause

The existing realtime-based fix (listening for `user_roles` DELETE) is unreliable. Here's what actually happens:

1. Edge function deletes `user_roles` (should trigger realtime listener)
2. Edge function then deletes `company_memberships`, `user_profiles`, etc.
3. **Before** the realtime DELETE event reaches the client, React Query may refetch `company_memberships` (due to stale time, window focus, or other invalidation) and get back empty results
4. `CompanyGuard` sees `hasCompanies = false` and redirects to `/companies`
5. `CompanySelection` sees 0 companies, 0 pending requests and redirects to `/companies/join`
6. The user is now stuck with a stale JWT that hasn't expired yet -- they appear "logged in" but all queries return empty

The realtime approach is a race condition by design: the client must receive and process the `user_roles` DELETE event **before** any other query refetch detects the missing data. This is not guaranteed.

## Solution: Add a Fallback Detection Layer

Add a `user_roles` existence check in `CompanyContext`. If a logged-in user has **no role** in `user_roles` (query returns null) and loading is complete, force sign out and redirect to `/auth`. This catches the deletion regardless of whether realtime fires.

### Why this is safe
- Every user gets a `user_roles` entry on signup (via database trigger)
- The only way a user has no `user_roles` entry is if they were deleted from the platform
- New users always have a role entry before they reach CompanyProvider

## Technical Changes

### File: `src/contexts/CompanyContext.tsx`

1. **Add a `user_roles` existence query** -- query for any role for the current user (not just cipher). If the result is null and the query has finished loading, the user was deleted.

2. **Add a `useEffect`** that watches for the "no role found" state. When detected:
   - Call `supabase.auth.signOut({ scope: 'local' })`
   - Call `window.location.replace('/auth')`
   - This serves as the reliable fallback when realtime fails

### File: `src/contexts/AuthContext.tsx`

3. **Export `forcedLogoutInProgress`** as a readable flag so CompanyContext can set it before signing out, preventing any intermediate re-renders.

### Flow After Fix

```text
User Deleted (edge function)
  |
  +--> Realtime fires DELETE on user_roles
  |      --> AuthContext: forcedLogout flag + signOut + replace('/auth')  [FAST PATH]
  |
  +--> CompanyContext query refetches user_roles
         --> Returns null (no role found)
         --> useEffect detects deletion
         --> forcedLogout flag + signOut + replace('/auth')              [FALLBACK PATH]
```

Both paths lead to the same outcome. The fallback catches cases where realtime is slow or doesn't fire.

### Files Modified
- `src/contexts/AuthContext.tsx` -- export `forcedLogoutInProgress` setter
- `src/contexts/CompanyContext.tsx` -- add user_roles existence check + forced logout fallback
