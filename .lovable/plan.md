

# Fix: Rejection Message Replaced by "Awaiting Approval"

## Root Cause

There is a race condition between two competing systems:

1. **PendingApproval page** detects rejection via Realtime/polling, shows the "Access Denied" rejection card, and schedules a logout after 3 seconds
2. **AuthContext polling** (every 5 seconds) also detects rejection and immediately calls `signOut({ scope: 'local' })`

When AuthContext wins the race (which it often does), the `signOut` clears the user session. This causes `useRegistrationStatus` to reset status back to `"loading"` (since `user` is now null). The PendingApproval page re-renders and, since status is no longer `"rejected"`, it falls through to the default "Awaiting Approval" view.

Additionally, `ProtectedRoute` only redirects `"pending"` status to `/pending` but does NOT redirect `"rejected"` status there -- so rejected users on protected routes never see the rejection screen.

## Fix Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/contexts/AuthContext.tsx` | Remove the `rejected` logout from polling -- let PendingApproval handle it |
| 2 | `src/App.tsx` | Redirect `"rejected"` status to `/pending` in ProtectedRoute |
| 3 | `src/pages/PendingApproval.tsx` | Make rejection state "sticky" so it survives the signOut clearing the user |

## Detailed Changes

### 1. AuthContext.tsx -- Stop competing with PendingApproval

Remove the rejected-status check from the 5-second polling interval. The PendingApproval page already handles rejection display and delayed logout. Having two systems fight over it causes the bug.

The polling should only handle:
- Pending users: skip role check (no change)
- Approved/legacy users: check role exists, validate session (no change)
- Rejected users: **do nothing** (let PendingApproval handle it)

### 2. App.tsx -- Redirect rejected users to /pending

In `ProtectedRoute`, add `status === "rejected"` alongside the existing `"pending"` check so rejected users are always sent to the PendingApproval page where they can see the rejection message.

```
if (status === "pending" || status === "rejected") {
  return <Navigate to="/pending" replace />;
}
```

### 3. PendingApproval.tsx -- Sticky rejection state

The problem: when `signOut` fires, `user` becomes null, `useRegistrationStatus` resets to `"loading"`, and the rejection screen disappears.

Fix: Store the rejection state in local component state. Once `status === "rejected"` is detected, latch it so subsequent status changes (from the signOut clearing the user) don't override it. The component will show the rejection screen until the auto-logout navigates to `/auth`.

```typescript
const [rejectedLocked, setRejectedLocked] = useState(false);
const [lockedReason, setLockedReason] = useState<string | null>(null);

useEffect(() => {
  if (status === "rejected" && !rejectedLocked) {
    setRejectedLocked(true);
    setLockedReason(rejectionReason);
  }
}, [status, rejectionReason, rejectedLocked]);
```

Then use `rejectedLocked` instead of `status === "rejected"` for rendering the rejection card and triggering the logout timer.

## Expected Behavior After Fix

**Rejection flow:**
1. Admin clicks Reject
2. Realtime fires, `useRegistrationStatus` detects `"rejected"` instantly
3. PendingApproval latches the rejection state and shows the "Access Denied" card with the reason
4. After 3 seconds, PendingApproval calls `signOut({ scope: 'local' })` and navigates to `/auth`
5. AuthContext polling does NOT interfere -- it skips rejected users entirely
6. User sees the full rejection message for the entire 3 seconds before being redirected

**Approval flow:** No change -- works as before via Realtime.

