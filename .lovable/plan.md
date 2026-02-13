
# Redesign: Rejection and Permanent Delete Workflows

## Overview

Currently, rejecting a user deletes them from auth immediately, allowing them to sign up again right away. The new design keeps rejected users in the system with time-based bans, adds a "permanent delete" option, and allows re-accepting rejected users.

## New Behavior Summary

| Action | User Experience | Ban Duration |
|--------|----------------|--------------|
| **Reject** | Instant logout + rejection message. Can't login/signup. | 1 day |
| **Permanent Delete** (from rejected tab) | Auth account deleted. Can't signup. | 7 days |
| **Accept** (from rejected tab) | Instant access as Moderator | None |

## Database Changes

### Migration: Add `banned_until` column to `registration_requests`

```sql
ALTER TABLE registration_requests 
  ADD COLUMN banned_until timestamptz DEFAULT NULL;
```

### Migration: Update `handle_new_user()` trigger

The trigger must check if the email is banned before creating a new registration request. If banned, it should raise an exception to block signup.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if email is banned
  IF EXISTS (
    SELECT 1 FROM registration_requests 
    WHERE email = NEW.email 
      AND banned_until > now()
  ) THEN
    RAISE EXCEPTION 'This email has been temporarily blocked. Please try again later.';
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (user_id, email) 
  VALUES (NEW.id, NEW.email);
  
  -- Clean up old rejected/deleted requests for this email
  DELETE FROM public.registration_requests WHERE email = NEW.email;
  
  -- Create new pending request
  INSERT INTO public.registration_requests (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'pending');
  
  RETURN NEW;
END;
$$;
```

## Edge Function Changes (`supabase/functions/admin-users/index.ts`)

### 1. Rewrite `handleRejectUser`

**Stop deleting the user from auth.** Instead:
1. Update `registration_requests` to status=rejected, set `banned_until = now + 1 day`
2. Sign out all sessions (force logout)
3. Keep the auth user alive (so the ban can be checked on next login attempt)

```typescript
const handleRejectUser = async (userId: string, reason?: string) => {
  const { error: updateError } = await adminClient
    .from("registration_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: reason || null,
      banned_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
    })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (updateError) return json(500, { error: "Failed to update request" });

  // Force logout
  try {
    await adminClient.auth.admin.signOut(userId, "global");
  } catch (e) { /* non-fatal */ }

  return json(200, { success: true });
};
```

### 2. Add `handlePermanentDelete`

New action for permanently deleting a rejected user:
1. Update `banned_until = now + 7 days` on the registration request
2. Delete user roles (if any)
3. Sign out all sessions
4. Delete user from auth (but the `registration_requests` row with `banned_until` stays)

### 3. Add `handleAcceptFromRejected`

New action for accepting a previously rejected user:
1. Update `registration_requests` to status=approved, clear `banned_until`
2. Create `user_roles` entry (moderator)
3. Create `moderator_permissions` entry with configurable permissions

### 4. Add new POST action routes

```typescript
if (body.action === "permanent-delete") {
  return await handlePermanentDelete(body.userId);
}
if (body.action === "accept-rejected") {
  return await handleAcceptFromRejected(body.userId, body.permissions);
}
```

## Frontend Changes

### 1. Auth page (`src/pages/Auth.tsx`)

After a failed login, check if the error indicates a banned user. Also, modify signup to catch the trigger exception and show a user-friendly "temporarily blocked" message.

### 2. Pending Approval page (`src/pages/PendingApproval.tsx`)

When status is "rejected": show the rejection message and auto-logout. The `signOut` call uses `{ scope: 'local' }` for instant local cleanup.

### 3. Registration Requests page (`src/pages/RegistrationRequests.tsx`)

Update the **Rejected tab** to show two new action buttons per row:
- **Accept** -- opens an approve dialog with permission toggles (reuses existing pattern)
- **Permanently Delete** -- confirmation dialog, warns about 7-day ban

Add new mutations for `permanent-delete` and `accept-rejected` actions.

### 4. `useRegistrationStatus.ts`

No changes needed -- it already handles the "rejected" status correctly and the `ProtectedRoute` in `App.tsx` handles redirection.

### 5. `AuthContext.tsx`

The existing 5-second polling + Realtime listener will detect the forced logout (signOut clears the session server-side, and the polling catches it). No changes needed.

## Technical Details

### File Change Summary

| File | Change |
|------|--------|
| **Migration SQL** | Add `banned_until` column; update `handle_new_user()` trigger to block banned emails |
| `supabase/functions/admin-users/index.ts` | Rewrite `handleRejectUser` (no auth delete); add `handlePermanentDelete` and `handleAcceptFromRejected` |
| `src/pages/RegistrationRequests.tsx` | Add Accept/Delete buttons to rejected tab; add new mutations and dialogs |
| `src/pages/Auth.tsx` | Show "temporarily blocked" error on signup if email is banned |
| `src/pages/PendingApproval.tsx` | Use `{ scope: 'local' }` for signOut on rejection |

### Flow Diagrams

**Reject flow:**
```text
Admin clicks Reject
  -> Edge fn: status=rejected, banned_until=+1day, signOut(global)
  -> Client (within 5s): polling detects no role -> signOut({ scope: 'local' })
  -> User sees Auth page
  -> If user tries login: rejected status detected -> shown rejection message
  -> If user tries signup: trigger blocks it for 1 day
```

**Permanent Delete flow:**
```text
Admin clicks Permanent Delete (from rejected tab)
  -> Edge fn: banned_until=+7days, delete roles, signOut, delete auth user
  -> registration_requests row stays with banned_until
  -> If user tries signup within 7 days: trigger raises exception
  -> After 7 days: signup succeeds, old request cleaned up
```

**Accept from Rejected flow:**
```text
Admin clicks Accept (from rejected tab)
  -> Edge fn: status=approved, banned_until=null, create role + permissions
  -> User can login immediately and access the app
```
