

# Fix: Force Instant Logout for Deleted Users

## Root Cause

All `signOut()` calls in the AuthContext use the default scope, which calls the server to revoke the session before clearing local state. After the admin deletes the user from auth, the server call fails because the user no longer exists. This can prevent the local session from being cleared, leaving the deleted user still logged in.

## Solution

Use `{ scope: 'local' }` on all force-logout `signOut()` calls. This skips the server roundtrip and immediately clears local storage and triggers `onAuthStateChange`, guaranteeing the user is logged out regardless of server state.

## File Change: `src/contexts/AuthContext.tsx`

Three `signOut()` calls need `{ scope: 'local' }`:

1. **Realtime listener** (line 54): When a `user_roles` DELETE event is received
2. **Polling - role check** (line 78): When `user_roles` query returns null
3. **Polling - session check** (line 86): When `getUser()` fails

Change each from:
```typescript
await supabase.auth.signOut();
```
To:
```typescript
await supabase.auth.signOut({ scope: 'local' });
```

The voluntary `signOut` function (line 108) should keep the default scope since the user still exists when they log out themselves.

## No Edge Function Changes

The edge function already follows the correct sequence and does not need modifications.

## Summary

| What | Before | After |
|------|--------|-------|
| Force-logout signOut scope | Default (server + local) | Local only |
| Behavior when user deleted | Server call fails, local state may persist | Local state always cleared instantly |
| Files changed | 1 (`AuthContext.tsx`) | Same |

