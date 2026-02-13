

# Fix: Deleted Users Still Have Access

## Root Cause

The current deletion flow in the `admin-users` Edge Function is:
1. `signOut(userId, "global")` -- invalidates the target user's session tokens
2. `deleteUser(userId)` -- cascades to delete `user_roles`

The problem: Step 1 breaks the target user's Realtime WebSocket connection. So when Step 2 cascades and deletes the `user_roles` row, the Realtime DELETE event never reaches the client. The deleted user's cached JWT remains valid (up to 1 hour) and they keep seeing data.

## Fix

Reorder the deletion flow to:
1. **Delete `user_roles` explicitly first** -- triggers Realtime DELETE event while the user's connection is still alive, causing the client-side listener to call `signOut()`
2. **Sign out all sessions** -- server-side backup to invalidate refresh tokens
3. **Delete user from auth** -- final cleanup

## File Changes

### File 1: `supabase/functions/admin-users/index.ts`

In `handleDeleteUser`, change the order:

```text
Current flow:
  signOut(userId) --> deleteUser(userId) [cascade deletes user_roles]

New flow:
  DELETE from user_roles WHERE user_id = userId  --> small delay --> signOut(userId) --> deleteUser(userId)
```

The explicit `user_roles` DELETE fires the Realtime event while the user's WebSocket is still connected, triggering immediate client-side logout.

### File 2: `src/contexts/AuthContext.tsx`

Add a fallback periodic session validation. If Realtime somehow misses the event, periodically check if the session is still valid by calling `getUser()`. If the user no longer exists, force logout. This runs every 30 seconds as a safety net.

## Technical Details

### Edge Function Change (handleDeleteUser)

```typescript
// Step 1: Delete user_roles first to trigger Realtime event
await adminClient
  .from("user_roles")
  .delete()
  .eq("user_id", userId);

// Small delay to allow Realtime event to propagate
await new Promise(resolve => setTimeout(resolve, 500));

// Step 2: Sign out all sessions (backup)
try {
  await adminClient.auth.admin.signOut(userId, "global");
} catch (e) {
  // non-fatal
}

// Step 3: Delete user from auth
await adminClient.auth.admin.deleteUser(userId);
```

### AuthContext Fallback

Add an interval-based session check that runs every 30 seconds when the user is logged in. It calls `supabase.auth.getUser()` and if the response indicates the user no longer exists, it forces a local sign-out. This acts as a safety net in case Realtime misses the event.

