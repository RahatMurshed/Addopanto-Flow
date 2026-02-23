

# Fix: Prevent Bounce-Back to Join Page After Approval

## Problem
When a user's join request is accepted, the polling in the Join page navigates them to `/companies`. However, on the Company Selection page, an auto-redirect rule sends users back to `/companies/join` if they have 0 companies and 0 pending requests. Because the company list query hasn't refreshed yet at that moment, the user gets bounced back to the join page.

## Solution

### File: `src/pages/CompanySelection.tsx`

Update the auto-redirect condition (line 158) to also check `newlyJoinedIds`. If there are newly joined companies (detected by polling), skip the redirect -- the query cache is still refreshing and will populate the company list momentarily.

**Current:**
```
if (companies.length === 0 && !isCipher && pendingJoinRequests.length === 0 && rejectedJoinRequests.length === 0)
```

**Updated:**
```
if (companies.length === 0 && !isCipher && pendingJoinRequests.length === 0 && rejectedJoinRequests.length === 0 && newlyJoinedIds.length === 0)
```

This single condition change prevents the race between query invalidation and the redirect logic.

### Files Modified
- `src/pages/CompanySelection.tsx` -- add `newlyJoinedIds.length === 0` guard to auto-redirect condition
