

# Fix: Rejection Messages, Instant Approval Redirect, and Speed

## Root Cause Analysis

There are three interconnected bugs:

### Bug 1: AuthContext polling logs out pending users
The 5-second polling in `AuthContext.tsx` checks if the user has a `user_roles` entry. **Pending users never have a role**, so the polling immediately forces them out every 5 seconds. This causes constant logout loops for users on the Pending Approval screen and prevents them from ever seeing a rejection or approval message.

### Bug 2: No Realtime on registration_requests
The Pending Approval page uses a 10-second HTTP poll to check status. There is no Realtime subscription on the `registration_requests` table, so approval and rejection are detected slowly (up to 10 seconds late).

### Bug 3: Rejection message timing conflict
Even if the rejection status is detected, the AuthContext polling (Bug 1) logs the user out before the PendingApproval page can show the rejection message.

## Fix Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/contexts/AuthContext.tsx` | Smart polling: skip role check for pending users, detect rejection |
| 2 | `src/hooks/useRegistrationStatus.ts` | Add Realtime subscription for instant status changes |
| 3 | `src/pages/PendingApproval.tsx` | Reduce backup polling from 10s to 3s |

## Detailed Changes

### File 1: `src/contexts/AuthContext.tsx` -- Fix polling logic

The 5-second polling interval (lines 65-91) currently does:
1. Check `user_roles` -- if missing, force logout
2. Check `getUser()` -- if error, force logout

**Problem**: Pending users have no role, so step 1 always triggers logout.

**Fix**: Before checking roles, check the user's `registration_requests` status:
- If **"pending"**: do nothing (expected -- no role yet)
- If **"rejected"**: force local logout immediately
- If **"approved"** or has a role: use the existing role-check logic (force logout if role disappears)
- If no registration request exists (legacy user): use existing logic

```typescript
const interval = setInterval(async () => {
  // Check registration request status first
  const { data: regData } = await supabase
    .from("registration_requests")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  // If rejected, force logout immediately
  if (regData?.status === "rejected") {
    console.log("User rejected, forcing logout");
    await supabase.auth.signOut({ scope: "local" });
    return;
  }

  // If pending, skip role check (no role expected yet)
  if (regData?.status === "pending") {
    return;
  }

  // For approved/legacy users: check role still exists
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleData) {
    console.log("User role not found, forcing logout");
    await supabase.auth.signOut({ scope: "local" });
    return;
  }

  // Validate auth session
  const { error } = await supabase.auth.getUser();
  if (error) {
    console.log("Session invalid, forcing logout:", error.message);
    await supabase.auth.signOut({ scope: "local" });
  }
}, 5000);
```

### File 2: `src/hooks/useRegistrationStatus.ts` -- Add Realtime

Add a Realtime subscription on `registration_requests` filtered to the current user. When an `UPDATE` event is received (admin approves or rejects), immediately re-run `checkStatus()`. This gives near-instant detection instead of waiting for the next poll.

```typescript
// Inside the hook, add a new useEffect:
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel("reg-status-" + user.id)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "registration_requests",
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        checkStatus();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, checkStatus]);
```

Also add a Realtime listener for `INSERT` on `user_roles` (for when an admin approves and creates the role):

```typescript
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel("role-insert-" + user.id)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_roles",
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        checkStatus();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, checkStatus]);
```

**Note**: The `registration_requests` table needs to be added to the Realtime publication. A migration will be required:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_requests;
```

### File 3: `src/pages/PendingApproval.tsx` -- Faster backup polling

Reduce the backup polling interval from 10 seconds to 3 seconds (line 20). With Realtime in place, this is just a safety net.

```typescript
const interval = setInterval(() => {
  refetch();
}, 3000);
```

## How Each Scenario Works After the Fix

**Rejection**:
1. Admin clicks Reject
2. Edge fn: sets status="rejected", signOut(global)
3. Realtime fires UPDATE on registration_requests
4. `useRegistrationStatus` instantly detects "rejected"
5. PendingApproval shows rejection message with reason
6. After 3 seconds, auto-logout via `signOut({ scope: 'local' })`
7. User sees Auth page, cannot login (session revoked) or signup (1-day ban)

**Approval**:
1. Admin clicks Approve
2. Edge fn: sets status="approved", creates user_role + permissions
3. Realtime fires INSERT on user_roles AND UPDATE on registration_requests
4. `useRegistrationStatus` instantly detects "has_role"
5. PendingApproval redirects to Dashboard immediately

**Permanent Delete**:
1. Admin clicks Permanently Delete (from rejected tab)
2. Edge fn: sets 7-day ban, deletes auth user
3. User is already logged out (was rejected first)
4. If they try to sign up within 7 days, the trigger blocks them

