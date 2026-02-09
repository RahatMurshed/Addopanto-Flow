
# Fix Role-Based Access Control & Data Synchronization Issues

This plan addresses all the reported bugs in the RBAC system and data management.

---

## Issues Identified

### Issue 1: Reports Page Data Not Changing
**Problem**: The Reports page queries data filtered by `user_id` instead of showing global shared data.
**Location**: `src/pages/Reports.tsx` lines 57-63

```typescript
// Current (WRONG) - filtering by user_id
supabase.from("revenues").select("*").eq("user_id", user.id),
supabase.from("expenses").select("*").eq("user_id", user.id),
supabase.from("allocations").select("*").eq("user_id", user.id),
supabase.from("expense_accounts").select("*").eq("user_id", user.id),
supabase.from("revenue_sources").select("*").eq("user_id", user.id),
```

**Fix**: Remove all `.eq("user_id", user.id)` filters to show global data.

---

### Issue 2: Moderator Permission Changes Not Reflected
**Problem**: When admin/cipher updates moderator permissions, the changes don't immediately reflect in the UI because:
1. The `staleTime` is set to 5 minutes in `useModeratorPermissions.ts`
2. No cache invalidation is triggered across all related queries

**Location**: `src/hooks/useModeratorPermissions.ts` line 44

**Fix**: 
- Reduce `staleTime` to 30 seconds
- Add cache invalidation for role context when permissions change
- Invalidate the moderator's permission cache when admin updates it

---

### Issue 3: User Page Loading Slowly
**Problem**: The edge function `admin-users` fetches ALL users from `auth.admin.listUsers()` without pagination.
**Location**: `supabase/functions/admin-users/index.ts` lines 257-260

**Fix**: Add pagination support to the edge function and frontend.

---

### Issue 4: Deleted Users Still Have Access
**Problem**: When a user is deleted, they are not forcibly logged out. The deletion only removes from database but the user's active session remains valid.
**Location**: `supabase/functions/admin-users/index.ts` line 125

**Fix**: 
1. Before deleting, sign out the user's sessions using Supabase admin API
2. Set up realtime listener to detect when user is deleted and force logout

---

## Implementation Plan

### Step 1: Fix Reports Page - Remove User ID Filters
**File**: `src/pages/Reports.tsx`

Remove `.eq("user_id", user.id)` from all 5 queries in the `reportData` useQuery to show global shared data.

---

### Step 2: Fix Moderator Permission Sync Issues
**Files to modify**:
- `src/hooks/useModeratorPermissions.ts` - Reduce staleTime, improve cache invalidation
- `src/pages/ModeratorControl.tsx` - Invalidate target moderator's cache after update

**Changes**:
1. Reduce `staleTime` from 5 minutes to 30 seconds
2. After updating permissions, invalidate all related caches
3. Add `refetchOnWindowFocus: true` to ensure fresh data

---

### Step 3: Force Logout Deleted Users
**Files to modify**:
- `supabase/functions/admin-users/index.ts` - Sign out user sessions before deletion
- `src/contexts/AuthContext.tsx` - Add realtime listener for user deletion

**Edge Function Changes**:
```typescript
// Before deleting, sign out all user sessions
await adminClient.auth.admin.signOut(userId, 'global');

// Then delete the user
await adminClient.auth.admin.deleteUser(userId);
```

**AuthContext Changes**:
Add a realtime subscription to `user_roles` table to detect when current user's role is deleted, then force logout.

---

### Step 4: Improve User Page Performance
**Files to modify**:
- `supabase/functions/admin-users/index.ts` - Add pagination
- `src/pages/UserManagement.tsx` - Implement pagination UI

**Edge Function Changes**:
Add `page` and `perPage` query parameters to limit results.

---

## Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `src/pages/Reports.tsx` | Remove `.eq("user_id", user.id)` from all 5 data queries |
| 2 | `src/hooks/useModeratorPermissions.ts` | Reduce staleTime, add refetchOnWindowFocus |
| 3 | `src/pages/ModeratorControl.tsx` | Invalidate target moderator's permission cache after update |
| 4 | `supabase/functions/admin-users/index.ts` | Add session signout before user deletion, add pagination |
| 5 | `src/contexts/AuthContext.tsx` | Add realtime listener to detect user deletion and force logout |
| 6 | `src/pages/UserManagement.tsx` | Improve loading states and add pagination |

---

## Technical Details

### Force Logout Implementation

The edge function will sign out all user sessions before deletion:

```typescript
// In admin-users/index.ts handleDeleteUser
// Sign out all sessions for the user being deleted
const { error: signOutError } = await adminClient.auth.admin.signOut(
  userId, 
  'global'  // This signs out all sessions
);

// Then proceed with deletion
const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
```

### Realtime User Deletion Detection

Add to AuthContext:

```typescript
// Subscribe to user_roles changes for current user
const channel = supabase
  .channel('user-role-changes')
  .on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'user_roles',
      filter: `user_id=eq.${user.id}`,
    },
    async () => {
      // User was deleted, force logout
      await supabase.auth.signOut();
    }
  )
  .subscribe();
```

### Cache Invalidation Flow

When admin updates moderator permissions:
1. Invalidate `["moderator-permissions", targetUserId]`
2. The moderator's RoleContext will refetch on next render or window focus

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Reports data not changing | User ID filter on queries | Remove filters |
| Permission changes not reflected | Long staleTime + no cross-user cache invalidation | Reduce staleTime, improve invalidation |
| User page slow | No pagination on user list | Add pagination |
| Deleted users still have access | Sessions not invalidated | Sign out sessions before deletion + realtime listener |
