

# Fix Registration Requests Visibility, Admin Login, and Remove Members Page

## Root Causes

### Issue 1: Registration requests not visible to admin/cipher
The `RegistrationRequests` page exists but has **no route** in `App.tsx` and **no navigation link** in `AppLayout.tsx`. It is completely inaccessible.

### Issue 2: Admin cannot log in
In `Auth.tsx` (lines 189-206), after a successful login the code queries `registration_requests` and if the status is `"pending"`, it immediately signs the user out. The problem: `hi@hi.com` has an old `pending` registration request row even though they already have a `moderator` role in `user_roles`. The login logic never checks `user_roles` first, so approved users with stale registration records get blocked.

### Issue 3: Remove Members page
The `/company/members` route and its navigation link need to be removed entirely.

---

## Changes

### 1. Fix login logic in `Auth.tsx` (lines 188-210)

Update the post-login check to query `user_roles` **first**. If the user already has a role, skip the registration request check entirely and proceed to the app.

```
// Current (broken):
1. Check registration_requests -> if pending, sign out

// Fixed:
1. Check user_roles -> if role exists, proceed to app
2. Only if NO role: check registration_requests -> if pending, sign out
```

### 2. Add Registration Requests route to `App.tsx`

- Import `RegistrationRequests` from `src/pages/RegistrationRequests`
- Add route: `/requests` -> `RegistrationRequests` inside `ProtectedRoute`

### 3. Add "Requests" navigation link to `AppLayout.tsx`

- Add a "Requests" nav item with `UserPlus` icon, visible to `isCompanyAdmin` or `isCipher` users
- Show the pending count badge next to it (the `usePendingRequestsCount` hook is already imported)

### 4. Remove Members page route and nav link

- **`App.tsx`**: Remove the `/company/members` route and the `CompanyMembers` import
- **`AppLayout.tsx`**: Remove the "Members" nav item from the `navItems` array (the line with `canManageMembers`)

### 5. Also fix `AuthContext.tsx` periodic validation (lines 66-100)

The same logic flaw exists in the periodic session validator -- it checks `registration_requests` for pending status and allows them to stay, but for approved users with stale pending records, it could cause issues. Update to check `user_roles` first, same as the login fix.

