

# Fix: Rejected Company Creation Requests Not Visible to Users

## Problem

When a cipher user rejects a company creation request, the requesting user never sees the rejection. This happens because:

1. **Missing query**: `CompanySelection.tsx` only fetches creation requests with `status = 'pending'` (line 64). Rejected creation requests are never fetched.
2. **Auto-redirect bug**: The redirect logic (line 160) doesn't account for rejected creation requests, so a user with only rejected requests and no companies gets bounced to `/companies/join` immediately -- they never even see the rejection.
3. **No polling for status changes**: Unlike join requests which poll every 7 seconds for approval, creation requests have no polling. A user waiting on a pending creation request gets no live update when it's approved or rejected.

## Solution

### 1. Add Rejected Creation Requests Query (`CompanySelection.tsx`)

Add a new `useQuery` to fetch rejected creation requests:

```
status = 'rejected'
order by reviewed_at desc
```

This mirrors the existing `rejectedJoinRequests` pattern.

### 2. Render Rejected Creation Requests Section

Display rejected creation requests in a styled card section (similar to rejected join requests), showing:
- Company name that was requested
- Rejection date
- Rejection reason (if provided by cipher)
- A dismiss button (same pattern as join rejections)
- A "Submit New Request" button linking to `/companies/create`

### 3. Fix Auto-Redirect Logic

Update the redirect condition (line 160) to also check for rejected creation requests, so users aren't bounced away before seeing their rejection message:

```
companies.length === 0 && !isCipher
  && pendingJoinRequests.length === 0
  && rejectedJoinRequests.length === 0
  && rejectedCreationRequests.length === 0  // NEW
  && pendingCreationRequests.length === 0   // already there implicitly
  && newlyJoinedIds.length === 0
```

### 4. Add Polling for Creation Request Status Changes

Add polling logic (similar to join request polling) that checks if a pending creation request has been approved or rejected. When a change is detected:
- If **approved**: show a success toast and refresh company list (the user should now see the new company in "My Businesses")
- If **rejected**: invalidate queries so the rejection card appears immediately

### 5. Better UX Improvements

- Add a dismissable state for rejected creation requests (same `dismissedRejections` pattern, extended to creation requests)
- Show the pending creation request card with a subtle pulsing dot animation to indicate "waiting for review"
- When no companies exist and only rejected requests are present, show an encouraging message with a clear call-to-action

## Files Modified

| File | Change |
|---|---|
| `src/pages/CompanySelection.tsx` | Add rejected creation requests query, render rejection cards, fix auto-redirect, add polling for creation request status changes |

## No Database Changes Required

RLS policies already allow users to read their own creation requests (`auth.uid() = user_id`). The `rejection_reason` column already exists on the table.

