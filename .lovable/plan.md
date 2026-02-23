
# Fix: Redirect Deleted Users to Login Page (Not Join Company)

## Problem
When a Cipher deletes a user, the intended redirect to the login page (`/auth`) is being intercepted by React's routing logic. Here's what happens:

1. The `user_roles` row is deleted, triggering the realtime listener
2. `signOut({ scope: 'local' })` clears the session
3. React's `onAuthStateChange` fires SIGNED_OUT, setting `user` to `null`
4. Before the `window.location.href = '/auth'` hard redirect completes, React re-renders and `CompanyGuard` sees no companies, redirecting to `/companies`, which then auto-redirects to `/companies/join`

## Solution
Prevent React from re-rendering after the forced sign-out by immediately replacing the location and short-circuiting any further component updates.

### File: `src/contexts/AuthContext.tsx`

**Change the realtime listener callback to:**
- Set a flag that prevents `onAuthStateChange` from updating state after forced logout
- Use `window.location.replace('/auth')` for an immediate, non-recoverable redirect

**Change the `onAuthStateChange` handler to:**
- Skip state updates if forced logout is in progress (prevents React from re-rendering and triggering intermediate redirects)

### Technical Detail

```
Realtime DELETE on user_roles
  --> Set forcedLogout flag = true
  --> signOut local
  --> window.location.replace('/auth')  (hard redirect, no history entry)

onAuthStateChange (SIGNED_OUT)
  --> Check forcedLogout flag
  --> If true: skip setState (prevents CompanyGuard redirect race)
```

### Files Modified
- `src/contexts/AuthContext.tsx` -- add forced-logout flag to prevent race condition with React routing
