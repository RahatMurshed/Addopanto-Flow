
# Google Login & Role-Based Access Control Implementation Plan

This plan implements Google authentication and a sophisticated role hierarchy with an invisible "Cipher" super-admin, configurable Admin and Moderator roles.

---

## Overview

We'll implement this in **4 phases** to ensure each feature works correctly before building on top of it:

1. **Phase 1**: Google Login Integration
2. **Phase 2**: Role System Database Setup
3. **Phase 3**: Role-Based Access Control (RBAC) Implementation
4. **Phase 4**: Admin Dashboard & User Management UI

---

## Role Hierarchy

```text
+------------------+
|      CIPHER      |  <- Invisible super-admin (can see/control everything)
+------------------+
         |
+------------------+
|      ADMIN       |  <- Can manage users, edit data, control moderator permissions
+------------------+
         |
+------------------+
|    MODERATOR     |  <- Can add revenues/expenses (permissions controlled by admin)
+------------------+
         |
+------------------+
|       USER       |  <- Default role, access to own data only
+------------------+
```

**Key Security Principle**: Cipher users are completely invisible in all queries, user lists, and admin panels to everyone except other Ciphers.

---

## Phase 1: Google Login Integration

### What We'll Add
- Google sign-in button on the Auth page
- Configure social auth using Lovable Cloud's managed Google OAuth

### Files to Modify
- `src/pages/Auth.tsx` - Add Google login button
- Configure social auth provider

---

## Phase 2: Role System Database Setup

### New Database Tables

**1. `user_roles` table** - Stores user role assignments
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to auth.users |
| role | app_role (enum) | cipher, admin, moderator, user |
| created_at | timestamp | When role was assigned |
| assigned_by | uuid | Who assigned this role (nullable) |

**2. `moderator_permissions` table** - Configurable moderator abilities
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | The moderator's user_id |
| can_add_revenue | boolean | Permission to add revenue entries |
| can_add_expense | boolean | Permission to add expense entries |
| can_view_reports | boolean | Permission to view reports |
| controlled_by | uuid | Admin who controls this moderator |
| updated_at | timestamp | Last modification time |

### Database Functions (Security Definer)

```sql
-- Check if user has a specific role (prevents RLS recursion)
create function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer
set search_path = public;

-- Check if user is cipher (for hiding cipher users)
create function public.is_cipher(_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public;

-- Get user's highest role
create function public.get_user_role(_user_id uuid)
returns app_role
language sql stable security definer
set search_path = public;
```

### RLS Policies

- **user_roles**: Users can view their own role; Admins can manage non-cipher roles; Cipher can manage all
- **moderator_permissions**: Admins can manage permissions for their assigned moderators
- **Critical**: All user-facing queries will exclude cipher users

---

## Phase 3: Role-Based Access Control Implementation

### New Files to Create

**1. `src/hooks/useUserRole.ts`**
- Fetches the current user's role
- Caches role information
- Provides helper functions: `isAdmin()`, `isModerator()`, `isCipher()`

**2. `src/hooks/useModeratorPermissions.ts`**
- Fetches moderator-specific permissions
- Returns what actions the moderator can perform

**3. `src/contexts/RoleContext.tsx`**
- Provides role information throughout the app
- Handles role-based routing and UI visibility

**4. `src/components/RoleGuard.tsx`**
- Wrapper component to conditionally render based on role
- Usage: `<RoleGuard roles={['admin', 'cipher']}>...</RoleGuard>`

### Files to Modify

**`src/components/AppLayout.tsx`**
- Add "User Management" nav item (visible to Admin/Cipher only)
- Hide admin-only features from regular users

**`src/pages/Revenue.tsx` & `src/pages/Expenses.tsx`**
- Check moderator permissions before showing add/edit/delete buttons
- Moderators: Only show "Add" button if permission granted
- Hide edit/delete buttons for moderators

---

## Phase 4: Admin Dashboard & User Management

### New Pages

**1. `src/pages/UserManagement.tsx`** (Admin/Cipher only)
- List all users (excluding cipher users for admins)
- Assign roles: Admin, Moderator, User
- Quick actions: View user details, change role

**2. `src/pages/ModeratorControl.tsx`** (Admin/Cipher only)
- List assigned moderators
- Toggle permissions per moderator:
  - Can add revenue
  - Can add expense
  - Can view reports
- Save permission changes

### Components to Create

**`src/components/UserRoleBadge.tsx`**
- Visual badge showing user's role
- Color-coded: Admin (purple), Moderator (blue), User (gray)

**`src/components/UserList.tsx`**
- Paginated list of users
- Search/filter functionality
- Role assignment dropdown

**`src/components/ModeratorPermissionsCard.tsx`**
- Card for each moderator showing toggles
- Real-time permission updates

---

## Security Considerations

### Cipher Invisibility
- All user queries will include: `WHERE NOT public.is_cipher(user_id)`
- Cipher users won't appear in:
  - User management lists (for admins)
  - Any user-facing queries
  - Activity logs visible to admins
- Only other cipher users can see cipher users

### RLS Policy Strategy
- Use security definer functions to avoid recursion
- Role checks happen server-side via database functions
- Frontend role checks are for UX only (not security)

### Permission Validation
- All permission checks validated server-side
- Moderator permissions checked on every add operation
- Admin role verified before any user management action

---

## Implementation Order

### Step 1: Google Login
Configure Google OAuth and add sign-in button

### Step 2: Create Role Tables
Run migration to create `user_roles` and `moderator_permissions` tables with proper RLS

### Step 3: Create Security Functions
Implement `has_role`, `is_cipher`, and `get_user_role` database functions

### Step 4: Build Role Hooks & Context
Create React hooks and context for role management

### Step 5: Update Existing Pages
Modify Revenue/Expenses pages to respect role permissions

### Step 6: Build Admin UI
Create User Management and Moderator Control pages

### Step 7: Test & Verify
Test all role combinations and permission scenarios

---

## Summary

This implementation creates a secure, hierarchical role system where:
- **Cipher** is completely invisible and has full control
- **Admin** can manage visible users and control moderator permissions
- **Moderator** has configurable, limited add-only permissions
- **User** has standard access to their own data

The system prioritizes security by implementing all access control at the database level with RLS, while the frontend provides a smooth user experience.
