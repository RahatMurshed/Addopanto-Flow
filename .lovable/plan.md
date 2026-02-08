
# Fix: User Management - Deletion, Role Simplification, and Email Visibility

This plan addresses four issues on the Users page:
1. Admin and Cipher cannot delete users
2. Need to remove the "user" role option (only cipher, admin, moderator remain)
3. Admin and Moderator should not see Cipher users (already working, but need to verify)
4. User emails are not showing on the users page

---

## Current Analysis

### Issue 1: User Deletion Not Available
The current `UserManagement.tsx` has no delete user functionality. There is:
- No delete button in the UI
- No delete mutation
- Deleting users from `auth.users` requires a backend function (cannot be done directly from the client)

### Issue 2: "User" Role Displayed
The `availableRoles` array in `UserManagement.tsx` (lines 187-189) includes "user":
```typescript
const availableRoles: AppRole[] = isCipher
  ? ["cipher", "admin", "moderator", "user"]
  : ["admin", "moderator", "user"];
```

### Issue 3: Cipher Visibility (Already Working)
The RLS policies and `can_view_user()` function already filter out cipher users from admin/moderator views. This is working correctly at the database level.

### Issue 4: User Emails Not Showing
The current implementation cannot get emails because:
- Emails are stored in `auth.users` table which cannot be queried directly from client
- The `user_profiles` table does not store email
- Only the current logged-in user's email is available (lines 93-96)

---

## Solution Overview

### 1. Create Edge Function for Admin Operations
Create a backend function with service role access to:
- Fetch user emails from `auth.users`
- Delete users from `auth.users` (with cascading deletion)

### 2. Update Role Options
Remove "user" from available roles in the dropdown, keeping only: cipher, admin, moderator

### 3. Update User Profiles Table
Add an `email` column to `user_profiles` to store user emails for easier access

### 4. Update UserManagement Component
- Add delete user functionality with confirmation dialog
- Remove "user" from available roles
- Fetch emails through the edge function

---

## Implementation Details

### Part 1: Database Migration

Add `email` column to `user_profiles` and create a trigger to sync it from `auth.users`:

```sql
-- Add email column to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN email TEXT;

-- Update existing profiles with emails (via edge function after migration)

-- Create function to sync email on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email) 
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow admins to view user profiles for the users page
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'cipher')
);
```

### Part 2: Edge Function for User Management

Create `supabase/functions/admin-users/index.ts`:

```typescript
// Handles:
// GET - List users with emails (for admins/cipher only)
// DELETE - Delete a user (with cascading cleanup)

// Uses service role key to access auth.admin API
// Validates caller has admin or cipher role before processing
```

**Endpoints:**
- `GET /admin-users` - Returns list of users with emails (filtered by role visibility)
- `DELETE /admin-users?userId=xxx` - Deletes user from auth.users (cascades to all tables)

### Part 3: Update UserManagement.tsx

1. **Remove "user" from availableRoles:**
```typescript
const availableRoles: AppRole[] = isCipher
  ? ["cipher", "admin", "moderator"]
  : ["admin", "moderator"];
```

2. **Add delete functionality:**
- Add delete button to each row (except current user and protected roles)
- Add confirmation dialog for deletion
- Call edge function to delete user

3. **Fetch emails from edge function or user_profiles:**
- Update query to fetch emails from user_profiles table (after migration syncs them)

### Part 4: Update AppRole Type

Update `src/hooks/useUserRole.ts` to keep "user" type for backward compatibility but hide it from role selection:

```typescript
// AppRole type remains: "cipher" | "admin" | "moderator" | "user"
// But UI only shows: cipher, admin, moderator for role assignment
```

---

## Security Considerations

| Action | Who Can Do It |
|--------|---------------|
| **View user list** | Cipher, Admin |
| **View user emails** | Cipher, Admin |
| **Change roles** | Cipher (all), Admin (non-cipher) |
| **Delete users** | Cipher (all), Admin (non-cipher) |
| **See cipher users** | Cipher only |

The edge function will:
1. Verify the caller has admin or cipher role
2. Use `can_view_user()` logic to filter visible users
3. Prevent admins from deleting cipher users
4. Handle cascading deletion properly

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/admin-users/index.ts` | Create - Edge function for user operations |
| `src/pages/UserManagement.tsx` | Modify - Add delete functionality, fix emails |
| `src/hooks/useUserRole.ts` | Keep as-is (type still includes "user") |
| Database migration | Create - Add email to user_profiles, update trigger |

---

## Summary

After these changes:
- Admins and Cipher can delete users (with proper role restrictions)
- Role dropdown shows only: Cipher (for Cipher), Admin, Moderator
- User emails display correctly on the users page
- Existing "user" role users remain in system but new role assignments exclude "user"
- Cipher users remain hidden from Admin and Moderator views
