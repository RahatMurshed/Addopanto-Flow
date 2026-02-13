

# Apply Same Force-Logout Fix to Reject Workflow

## Problem

The `handleRejectUser` function in the edge function currently just deletes the user from auth directly, without first attempting to sign them out or trigger any Realtime event. A rejected user who is still browsing the app (e.g., on the pending approval screen) will keep their session active until it naturally expires.

## Changes

### File 1: `supabase/functions/admin-users/index.ts` -- `handleRejectUser`

Apply the same 3-step deletion sequence used in `handleDeleteUser`:

1. Delete `user_roles` row (if any exists) to fire a Realtime event
2. Wait 500ms for propagation
3. Sign out all sessions server-side
4. Delete user from auth

Updated `handleRejectUser` (lines 227-254):

```typescript
const handleRejectUser = async (userId: string, reason?: string) => {
  // Update registration request status first
  const { error: updateError } = await adminClient
    .from("registration_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: reason || null,
    })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (updateError) {
    console.error("Error updating registration request:", updateError);
    return json(500, { error: "Failed to update registration request" });
  }

  // Step 1: Delete user_roles if any exist (triggers Realtime logout)
  const { error: roleDeleteError } = await adminClient
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  if (roleDeleteError) {
    console.warn("Failed to delete user_roles during reject (non-fatal):", roleDeleteError);
  }

  // Step 2: Delay to allow Realtime event propagation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 3: Sign out all sessions
  try {
    await adminClient.auth.admin.signOut(userId, "global");
  } catch (signOutErr) {
    console.warn("Failed to sign out rejected user (non-fatal):", signOutErr);
  }

  // Step 4: Delete user from auth.users
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("Error deleting rejected user:", deleteError);
    return json(500, { error: "Failed to delete user account" });
  }

  return json(200, { success: true });
};
```

### File 2: `src/contexts/AuthContext.tsx` -- Reduce polling interval

Change the fallback polling from 30 seconds to 5 seconds, and add a `user_roles` existence check for faster detection:

```typescript
const interval = setInterval(async () => {
  // Check 1: Does role still exist?
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleData) {
    console.log("User role not found, forcing logout");
    await supabase.auth.signOut();
    return;
  }

  // Check 2: Is auth session valid?
  const { error } = await supabase.auth.getUser();
  if (error) {
    console.log("Session validation failed, forcing logout:", error.message);
    await supabase.auth.signOut();
  }
}, 5000);
```

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/admin-users/index.ts` | Add force-logout steps to `handleRejectUser` |
| 2 | `src/contexts/AuthContext.tsx` | Reduce polling to 5s, add `user_roles` check |

