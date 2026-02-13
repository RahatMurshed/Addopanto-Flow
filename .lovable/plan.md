

# Fix: Complete Rejection & Ban Enforcement on Auth Page

## Problem Analysis

After reviewing all the current code, here are the remaining issues:

1. **Rejected users briefly see PendingApproval page**: When an active user gets rejected, the `user_roles` DELETE Realtime listener in `AuthContext` forces a local signOut. The user lands on `/auth` via `ProtectedRoute`, but **no rejection message is displayed** because there's no mechanism to pass rejection info through the signOut redirect.

2. **PendingApproval still handles rejection**: Lines 29-33 of `PendingApproval.tsx` sign out and navigate to `/auth` when status is `"rejected"`, causing a brief flash of the pending page before redirect.

3. **AuthContext polling skips rejected users instead of logging them out**: Lines 77-79 in `AuthContext.tsx` return early for rejected status, leaving the user logged in on the `/pending` page until PendingApproval's own redirect kicks in (creating the 1-second flash).

4. **ProtectedRoute doesn't handle rejected status**: It only redirects `"pending"` to `/pending`. A rejected user with an active session passes through to protected routes momentarily.

## Solution

All rejection/ban messages display exclusively on the Auth page. No separate rejection page exists. Three enforcement layers:

```text
Layer 1 (Pre-login):  check-ban edge function blocks banned/rejected emails
Layer 2 (Post-login): Auth.tsx checks registration_requests, signs out + shows message
Layer 3 (Active session): AuthContext forces immediate logout for rejected users
                          ProtectedRoute catches any remaining rejected sessions
```

## File Changes

### 1. `src/contexts/AuthContext.tsx` -- Force logout for rejected users

**Current**: Polling (line 77) skips rejected/pending users entirely.
**Change**: Keep skipping `pending` users (they belong on `/pending` page). For `rejected` users, force an immediate `signOut({ scope: 'local' })` so they are kicked to `/auth` instantly.

```typescript
// Line 77 change:
if (regData?.status === "pending") {
  return; // Pending users stay on /pending page
}

if (regData?.status === "rejected") {
  console.log('User rejected, forcing logout');
  await supabase.auth.signOut({ scope: 'local' });
  return;
}
```

### 2. `src/App.tsx` -- ProtectedRoute handles rejected status

**Current**: Only redirects `"pending"` to `/pending`.
**Change**: Add `"rejected"` check that signs out and redirects to `/auth`. This is a safety net -- by the time ProtectedRoute runs, AuthContext polling should have already logged out rejected users.

```typescript
if (status === "rejected") {
  return <Navigate to="/auth" replace />;
}
```

### 3. `src/pages/PendingApproval.tsx` -- Remove rejection handling entirely

**Current**: Lines 29-33 detect `"rejected"` status, sign out, and navigate to `/auth`.
**Change**: Remove the rejected status check. This page only handles `"pending"` users. AuthContext and ProtectedRoute handle rejected users.

Remove:
```typescript
if (status === "rejected") {
  supabase.auth.signOut({ scope: "local" }).then(() => {
    navigate("/auth", { replace: true });
  });
}
```

### 4. `src/pages/Auth.tsx` -- No changes needed

The current Auth.tsx already has all the correct enforcement:
- Pre-login `checkBan()` blocks banned emails (line 140-151)
- Post-login status check catches rejected users, signs out, shows inline rejection message (line 160-178)
- `BanMessage` and `RejectionMessage` components display on the auth page (line 288-289)
- Signup immediately signs out and shows success card (line 222-227)

### 5. `supabase/functions/check-ban/index.ts` -- No changes needed

Already returns both `banned` (active ban) and `rejected` (ban expired but still rejected) flags correctly.

## Summary Table

| # | File | Change |
|---|------|--------|
| 1 | `src/contexts/AuthContext.tsx` | Force logout for rejected users in polling (not skip) |
| 2 | `src/App.tsx` | Add rejected status redirect to /auth in ProtectedRoute |
| 3 | `src/pages/PendingApproval.tsx` | Remove rejection handling (lines 29-33) |
| 4 | `src/pages/Auth.tsx` | No changes |
| 5 | `check-ban` edge function | No changes |

## Expected Behavior After Fix

**User gets rejected while logged in:**
1. Admin clicks Reject -> `handleRejectUser` deletes `user_roles` and calls `signOut(userId, "global")`
2. Realtime `user_roles` DELETE listener in AuthContext fires -> instant local signOut
3. User becomes null -> ProtectedRoute redirects to `/auth`
4. Next login attempt -> `checkBan` catches the 1-day ban -> shows "Account Banned" on auth page

**Rejected user tries to log in (during ban):**
1. User enters credentials -> `checkBan` returns `banned: true` -> "Account Banned for X hours" shown on auth page
2. Login is never attempted

**Rejected user tries to log in (after ban expires):**
1. `checkBan` returns `rejected: true` -> "Access Denied" shown on auth page
2. Login is never attempted

**Admin re-approves rejected user:**
1. If user is not logged in: next login attempt succeeds normally (no ban, no rejection flag since status changed to "approved")
2. Ban is cleared, role is created, user can access dashboard

