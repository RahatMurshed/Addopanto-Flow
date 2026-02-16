
# Allow Cipher to Delete Another Cipher (with Double Protection)

## Current Behavior
- The delete button is **disabled** for Cipher users in the table (line 253: `canModify` excludes ciphers)
- The email-confirmation dialog for cipher targets already exists in the UI but is unreachable
- The backend edge function already allows Cipher-on-Cipher deletion (no explicit block)

## Changes

### 1. Frontend: Enable delete button for Cipher targets (`UserManagement.tsx`)

Update the `canModify` logic so the **delete** action is allowed for Cipher targets, while keeping **role change** disabled (a Cipher shouldn't demote another Cipher via dropdown).

- Split `canModify` into two flags:
  - `canChangeRole`: `!isCurrentUser && displayRole !== "cipher"` (unchanged behavior)
  - `canDelete`: `!isCurrentUser` (allows deleting other Ciphers)
- Use `canChangeRole` for the role dropdown
- Use `canDelete` for the delete button

### 2. Frontend: Add password re-authentication step for Cipher deletion (`UserManagement.tsx`)

When deleting a Cipher user, add a **two-step confirmation**:
1. **Step 1** (existing): Type the target's email to confirm
2. **Step 2** (new): Enter your own password to re-authenticate

The delete button only enables when **both** conditions are met. On submit, call `supabase.auth.signInWithPassword` with the current user's email and entered password to verify identity before proceeding with the deletion.

### 3. Backend: Add explicit Cipher-deletion audit log (`admin-users/index.ts`)

Inside `handleDeleteUser`, when the target is a Cipher:
- Log the action with caller ID, target ID, and timestamp to console for traceability
- Optionally insert a record into an `audit_logs` table if one exists

## Technical Details

### `UserManagement.tsx` changes

```text
Line 253: Split canModify into canChangeRole + canDelete
Line 270-283: Use canChangeRole for role Select
Line 299-306: Use canDelete for delete button
Lines 352-384: Enhance delete dialog with password input for cipher targets
```

### `admin-users/index.ts` changes

```text
Lines 82-108: Add console log when deleting a cipher-role user:
  console.warn("[CIPHER DELETE]", { callerId: user.id, targetId: userId, targetRole, timestamp })
```

### Dialog UX for deleting a Cipher

```text
+------------------------------------------+
|  Delete Cipher User                      |
|                                          |
|  You are about to delete a Cipher user:  |
|  admin@example.com                       |
|                                          |
|  This action cannot be undone.           |
|                                          |
|  Type their email to confirm:            |
|  [_________________________]             |
|                                          |
|  Enter YOUR password to verify:          |
|  [_________________________]             |
|                                          |
|  [Cancel]              [Delete] (red)    |
+------------------------------------------+
```

The Delete button enables only when:
- Email input matches target email exactly
- Password field is non-empty

On click, password is verified via `supabase.auth.signInWithPassword` before calling the delete endpoint.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/UserManagement.tsx` | Split canModify, add password field to cipher delete dialog |
| `supabase/functions/admin-users/index.ts` | Add audit log for cipher-on-cipher deletion |
