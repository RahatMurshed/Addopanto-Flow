

# Fix Plan: Cipher Auto-Join, Invite Code Generation, and Login Flow

## Issues Found

1. **Cipher cannot join companies without verification** -- There is no "auto-join" mechanism for cipher users. They must enter a password or invite code like everyone else. The edge function needs a new action to let cipher users join any company directly as admin.

2. **Invite code not appearing after generation** -- When generating an invite code, the success handler invalidates the wrong cache key (`user-companies` instead of `company-secrets`), so the UI never refreshes to show the newly generated code.

3. **Google OAuth login bypasses registration status check** -- After Google sign-in, the app redirects to `/companies` without checking if the user's registration request is still pending. This means pending/rejected users authenticated via Google may see the company selection page instead of a proper status message.

---

## Planned Changes

### 1. Edge Function: Add `cipher-join` Action
**File:** `supabase/functions/company-join/index.ts`

Add a new action `cipher-join` that:
- Verifies the user has the `cipher` role
- Checks if they are already a member of the target company
- If not, auto-inserts a `company_memberships` record with role `admin` and all permissions enabled
- Sets the company as their active company
- Returns success immediately (no password, no invite code, no approval needed)

### 2. Frontend: Let Cipher Join Directly from Company List
**File:** `src/pages/JoinCompany.tsx`

- Detect if the current user is a cipher (via `useCompany().isCipher`)
- For cipher users, show a "Join as Admin" button on each company card instead of requiring a password
- Clicking it calls the new `cipher-join` edge function action
- On success, navigate to `/companies`

### 3. Fix Invite Code Cache Invalidation
**File:** `src/pages/CompanyMembers.tsx`

- In `generateInviteMutation.onSuccess`, change the invalidated query key from `["user-companies"]` to `["company-secrets", activeCompanyId]` so the invite code display refreshes immediately after generation

### 4. Fix Google OAuth Registration Status Check
**File:** `src/App.tsx` (CompanyGuard)

- In the `CompanyGuard` component (which runs after authentication), add a registration status check for users who have no company memberships and are not cipher
- If the user's `registration_requests` status is `pending`, redirect to a pending approval message instead of showing "No Companies"
- If the status is `rejected`, sign them out

Alternatively, this can be handled in `CompanySelection.tsx` by checking registration status when `companies.length === 0` and the user is not cipher.

---

## Technical Details

### Edge Function Change (cipher-join)
```text
New action block in company-join/index.ts:

if (action === "cipher-join") {
  - Verify isCipher, return 403 if not
  - Check existing membership, return 400 if already a member
  - Insert membership with role=admin, all permissions=true
  - Update user_profiles.active_company_id
  - Return success
}
```

### Cache Fix (one-line change)
```text
CompanyMembers.tsx line 170:
  Change: queryClient.invalidateQueries({ queryKey: ["user-companies"] })
  To:     queryClient.invalidateQueries({ queryKey: ["company-secrets", activeCompanyId] })
```

### JoinCompany.tsx UI Change
```text
- Import useCompany and get isCipher
- For cipher users: show a direct "Join" button per company
- On click: invoke company-join with action "cipher-join"
- On success: navigate to /companies
```

### Registration Status Guard
```text
CompanySelection.tsx:
- When companies.length === 0 and !isCipher:
  - Query registration_requests for the current user
  - If status is "pending", show a "Pending Approval" message
  - If status is "rejected", sign out
  - Otherwise show the normal "No Companies" UI with Join button
```

