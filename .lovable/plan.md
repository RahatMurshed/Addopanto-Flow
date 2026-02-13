

# Admin Role Restriction: Admins Can Only Manage Moderators

## Overview
Currently admins can manage other admins. This change restricts admins so they can only manage and delete **moderators**, while **cipher** can manage everything (admins, moderators, and other ciphers).

## Changes

### 1. Frontend: Update role management logic
**File: `src/hooks/useUserRole.ts`**
- Update `canManageRole` so admin can only manage `moderator` role (not `admin` or `cipher`)

### 2. Frontend: Restrict available roles for admins
**File: `src/pages/UserManagement.tsx`**
- Admin's available roles dropdown: only `["moderator"]` (currently includes `"admin"`)
- Cipher remains: `["cipher", "admin", "moderator"]`

### 3. Backend: Update edge function guard
**File: `supabase/functions/admin-users/index.ts`**
- Add check: if caller is admin and target is admin, block the delete operation (currently only blocks cipher targets)

### 4. Database: Tighten RLS policies on `user_roles`
Update three policies (DELETE, UPDATE, INSERT) so that admins can only operate on moderator-role users:
- **DELETE**: Admin can only delete where target role = `moderator`
- **UPDATE**: Admin can only update where target role = `moderator`  
- **INSERT**: Admin can only insert `moderator` role (currently blocks only `cipher`)

### Summary of permission matrix

| Action | Cipher | Admin |
|--------|--------|-------|
| Manage cipher | Yes | No |
| Manage admin | Yes | No |
| Manage moderator | Yes | Yes |
| Delete cipher | Yes | No |
| Delete admin | Yes | No |
| Delete moderator | Yes | Yes |

### Technical: SQL migration

```sql
-- UPDATE policy: admin can only update moderator-role users
DROP POLICY "Authorized users can update roles" ON public.user_roles;
CREATE POLICY "Authorized users can update roles" ON public.user_roles
FOR UPDATE USING (
  CASE
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin') AND role = 'moderator' THEN true
    ELSE false
  END
);

-- DELETE policy: admin can only delete moderator-role users
DROP POLICY "Authorized users can delete roles" ON public.user_roles;
CREATE POLICY "Authorized users can delete roles" ON public.user_roles
FOR DELETE USING (
  CASE
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin') AND role = 'moderator' THEN true
    ELSE false
  END
);

-- INSERT policy: admin can only insert moderator role
DROP POLICY "Authorized users can insert roles" ON public.user_roles;
CREATE POLICY "Authorized users can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (
  CASE
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin') AND role = 'moderator' THEN true
    ELSE false
  END
);
```

