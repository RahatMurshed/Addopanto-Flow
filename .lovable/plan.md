
# Force Logout and Full Cleanup on User Deletion

## Problem
When a Cipher deletes a user from the platform:
1. Company memberships are **not** removed -- the deleted user's records linger in all businesses
2. The realtime listener signs out locally but does **not** redirect to the login page
3. `user_profiles` and `company_join_requests` are not cleaned up

## Changes

### 1. Edge Function Cleanup (`supabase/functions/admin-users/index.ts`)

In the `handleDeleteUser` function, add cleanup steps **before** deleting the auth user:

- Delete all `company_memberships` for the target user (removes them from every business)
- Delete all `company_join_requests` for the target user (cleans up pending/rejected requests)
- Delete `user_profiles` for the target user (removes profile data)

Order of deletions:
```
1. user_roles          (already exists -- triggers realtime logout)
2. moderator_permissions (already exists)
3. registration_requests (already exists)
4. company_memberships   (NEW)
5. company_join_requests (NEW)
6. user_profiles         (NEW)
7. signOut global        (already exists)
8. deleteUser from auth  (already exists)
```

### 2. Redirect to Login on Forced Logout (`src/contexts/AuthContext.tsx`)

Update the realtime listener callback to redirect to `/auth` after signing out:

```typescript
async () => {
  await supabase.auth.signOut({ scope: 'local' });
  window.location.href = '/auth';  // Hard redirect ensures full state reset
}
```

Using `window.location.href` instead of React Router's `navigate()` ensures all in-memory state, query caches, and contexts are fully cleared -- important for a security-critical forced logout.

### Files Modified
- `supabase/functions/admin-users/index.ts` -- add company_memberships, company_join_requests, and user_profiles deletion
- `src/contexts/AuthContext.tsx` -- add redirect to `/auth` after forced signOut
