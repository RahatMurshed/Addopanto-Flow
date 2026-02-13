
# Fix: Rejection & Ban Enforcement on Auth Page

## Problem Summary

Two issues remain:
1. Rejected users see a rejection message on `/pending` page, then get redirected back to "Awaiting Approval" or auth page -- confusing UX
2. Rejected/banned users can still successfully log in and access the app for a few seconds before being auto-logged out

## Root Cause

- The `check-ban` edge function only catches users with an **active ban** (`banned_until > now()`). A rejected user whose 1-day ban has expired can still `signInWithPassword` successfully since their auth account still exists.
- After login, `ProtectedRoute` detects `status === "rejected"` and sends them to `/pending`, but `AuthContext` polling and state clearing causes race conditions.
- There is no post-login server-side check that blocks the session for rejected users.

## Solution

All rejection/ban feedback will happen on the **Auth page itself**. Rejected users will never reach `/pending`. The flow becomes:

```text
Login attempt:
  1. check-ban (pre-login) -> if active ban -> show ban message, block login
  2. signIn() -> if credentials wrong -> show error
  3. Post-login status check -> query registration_requests
     -> if "rejected" (no active ban) -> signOut + show "rejected" message on auth page
     -> if "pending" -> signOut + show "pending" message on auth page  
     -> if approved/has_role -> navigate to dashboard
```

## Changes

### 1. `check-ban` Edge Function -- Also return rejected status without active ban

Currently the query filters by `gt("banned_until", now())` so it misses rejected users whose ban expired. Add a second query: if no active ban found, also check for `status = "rejected"` to return a `rejected` (non-banned) flag.

New response shape adds a `rejected` field:
- Active ban: `{ banned: true, banned_until: "...", ban_type: "rejected"|"deleted", rejected: false }`
- Rejected but ban expired: `{ banned: false, banned_until: null, ban_type: null, rejected: true, rejection_reason: "..." }`
- Clean: `{ banned: false, rejected: false }`

### 2. `Auth.tsx` -- Post-login status check + inline rejection display

**handleLogin changes:**
- After successful `signIn()`, immediately query `registration_requests` for the logged-in user
- If status is `"rejected"`: call `signOut()`, set a new `rejectionInfo` state, display rejection message inline on auth page
- If status is `"pending"`: call `signOut()`, set `showRegistrationSuccess(true)` to show the "Awaiting Approval" card
- If no blocking status (approved or has role): navigate to `/`

**New UI state:**
- Add `rejectionInfo` state with reason text
- When set, display a rejection alert card (similar to `BanMessage`) on the auth page showing "Your account has been rejected" with the reason
- This replaces the `/pending` rejection screen entirely

### 3. `App.tsx` -- Remove rejected redirect to /pending

Change `ProtectedRoute` to only redirect `"pending"` status to `/pending`. Remove `"rejected"` from the condition -- rejected users will never get past `handleLogin` in Auth.tsx (they are signed out before navigation).

```typescript
if (status === "pending") {
  return <Navigate to="/pending" replace />;
}
```

### 4. `PendingApproval.tsx` -- Remove rejection handling

Remove all rejection-related code:
- Remove `rejectedLocked` / `lockedReason` state
- Remove the rejection card UI
- Keep only the "Awaiting Approval" pending card
- Keep Realtime listeners for auto-redirect on approval

### 5. `AuthContext.tsx` -- No changes needed

The polling already skips `pending` and `rejected` users. The `user_roles` DELETE listener handles permanent deletions. No modifications required.

## File Changes Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `supabase/functions/check-ban/index.ts` | Modify | Also check for rejected status when no active ban found |
| 2 | `src/pages/Auth.tsx` | Modify | Add post-login status check, inline rejection/pending display, sign out rejected users immediately |
| 3 | `src/App.tsx` | Modify | Remove `"rejected"` from ProtectedRoute redirect |
| 4 | `src/pages/PendingApproval.tsx` | Modify | Remove all rejection UI, keep only pending approval card |

## Security Notes

- Rejected users are signed out immediately after login -- they never access any protected route
- The `check-ban` edge function catches active bans before login is even attempted
- Post-login check catches rejected users whose ban has expired
- RLS policies still block data access for users without roles as a final safety net
