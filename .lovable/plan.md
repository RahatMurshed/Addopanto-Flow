
# Complete Registration Workflow Overhaul

## Overview

This plan addresses all 4 requirements with a secure frontend + backend implementation.

## Current Problems

1. Rejection screen auto-redirects to "Awaiting Approval" after 3 seconds due to signOut clearing user state
2. Users get a full authenticated session immediately on signup (before approval)
3. No ban enforcement on login -- only on signup via the database trigger
4. Permanently deleted users see generic "Invalid credentials" instead of a ban message

## Architecture

```text
SIGNUP FLOW:
  User signs up
    -> Supabase creates auth user + trigger creates pending request
    -> Frontend immediately signs out
    -> Shows "Registration submitted" message on Auth page
    -> User stays on Auth page (NOT redirected to /pending)

LOGIN FLOW:
  User enters credentials
    -> Call check-ban edge function with email FIRST
    -> If banned: show ban message with remaining time, block login
    -> If not banned: proceed with Supabase signIn
    -> After signIn: ProtectedRoute checks status
      -> pending -> /pending page
      -> rejected (no active ban) -> /pending shows rejection card
      -> approved/has_role -> Dashboard

REJECTION PAGE:
  Shows rejection card permanently (no auto-logout)
  "Go to Auth Page" button (manual navigation + signOut)
  If admin re-approves while user is on this page -> auto-redirect to Dashboard
```

## Changes

### 1. New Edge Function: `check-ban`

A lightweight public-facing edge function that checks if an email has an active ban.

- Input: `{ email: string }`
- Uses service role to query `registration_requests` by email
- Returns: `{ banned: boolean, banned_until: string | null, ban_type: "rejected" | "deleted" | null }`
- Does NOT reveal other user data -- only ban status
- Called before login and signup attempts

```typescript
// supabase/functions/check-ban/index.ts
// Takes email, checks registration_requests for active banned_until
// Returns ban status without exposing sensitive data
```

### 2. Auth.tsx -- Signup & Login Changes

**Signup:**
- After successful `signUp()`, immediately call `signOut()` 
- Show a success card: "Registration submitted! Please wait for admin approval. You can try logging in once approved."
- Do NOT navigate to `/` or `/pending`

**Login:**
- Before calling `signIn()`, call the `check-ban` edge function with the email
- If banned: show ban message with remaining time (e.g., "You are banned for 23 hours" or "You are banned for 6 days"), do not attempt login
- If not banned: proceed with normal `signIn()` flow
- After successful login, navigate to `/` (ProtectedRoute handles routing)

### 3. PendingApproval.tsx -- Permanent Rejection Screen

Remove the auto-logout behavior entirely:
- Remove the `setTimeout` that calls `signOut` after 3 seconds
- Remove the "You will be logged out automatically..." text
- Add a "Go to Auth Page" button that calls `signOut()` then navigates to `/auth`
- Keep the Realtime listener: if admin approves while on this page, auto-redirect to Dashboard
- Keep the sticky rejection state (`rejectedLocked`) so it survives state changes

### 4. AuthContext.tsx -- Remove user_roles DELETE listener interference

The Realtime listener on `user_roles` DELETE events (line 38-62) forces logout when a role is deleted. For rejected users (who never had a role), this is fine. But we need to ensure the rejection handler in edge function (which deletes roles) doesn't conflict.

Current polling logic (already fixed) correctly skips pending/rejected users -- no changes needed here.

### 5. Edge Function `admin-users` -- Minor adjustment for accept-rejected

When accepting a rejected user (`accept-rejected` action), the edge function already:
- Updates status to "approved"
- Clears `banned_until`
- Creates user_role + moderator_permissions

This triggers Realtime events that the rejected user's PendingApproval page picks up, auto-redirecting them. No changes needed here.

## Technical Details

### check-ban Edge Function

```typescript
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  const { email } = await req.json();
  if (!email) return json(400, { error: "Missing email" });
  
  // Use service role to check registration_requests
  const { data } = await adminClient
    .from("registration_requests")
    .select("banned_until, status")
    .eq("email", email)
    .gt("banned_until", new Date().toISOString())
    .maybeSingle();
  
  if (data) {
    return json(200, {
      banned: true,
      banned_until: data.banned_until,
      ban_type: data.status === "rejected" ? "rejected" : "deleted"
    });
  }
  
  return json(200, { banned: false });
});
```

### Auth.tsx Signup Handler Changes

```typescript
const handleSignup = async (e) => {
  // Check ban first
  const banCheck = await supabase.functions.invoke("check-ban", {
    body: { email: signupEmail }
  });
  if (banCheck.data?.banned) {
    // Show ban message with remaining time
    return;
  }
  
  const { error } = await signUp(signupEmail, signupPassword);
  if (!error) {
    await signOut(); // Immediately sign out
    setShowRegistrationSuccess(true); // Show success message
    // Do NOT navigate
  }
};
```

### Auth.tsx Login Handler Changes

```typescript
const handleLogin = async (e) => {
  // Check ban first
  const banCheck = await supabase.functions.invoke("check-ban", {
    body: { email: loginEmail }
  });
  if (banCheck.data?.banned) {
    // Show ban message
    return;
  }
  
  const { error } = await signIn(loginEmail, loginPassword);
  if (!error) {
    navigate("/"); // ProtectedRoute handles pending/rejected routing
  }
};
```

### PendingApproval.tsx Rejection Card

```typescript
if (rejectedLocked) {
  return (
    <Card>
      <XCircle icon />
      <h3>Access Denied</h3>
      <p>{lockedReason || "Your request has been rejected."}</p>
      <p className="text-xs">If an administrator re-approves your account, 
         you will be automatically redirected.</p>
      <Button onClick={handleSignOut}>
        <LogOut /> Go to Auth Page
      </Button>
    </Card>
  );
}
```

## File Changes Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `supabase/functions/check-ban/index.ts` | Create | New edge function to check email ban status |
| 2 | `src/pages/Auth.tsx` | Modify | Add ban check before login/signup, sign out after signup, show success/ban messages |
| 3 | `src/pages/PendingApproval.tsx` | Modify | Remove auto-logout, add "Go to Auth Page" button, keep Realtime for auto-approval redirect |
| 4 | `src/contexts/AuthContext.tsx` | No change | Already correctly handles pending/rejected users |

## Security Considerations

- The `check-ban` edge function only returns ban status (boolean + timestamp), not user data
- Ban enforcement happens server-side via the `handle_new_user` trigger (for signups) and the edge function (for logins)
- The frontend ban check is a UX convenience; the real enforcement is backend-side (rejected users have no role, so RLS blocks all data access)
- Rate limiting on the `check-ban` function could be added later if abuse is detected
