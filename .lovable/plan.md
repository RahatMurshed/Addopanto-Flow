

# Restructure Role System: Two-Level Architecture

## Overview

Clean separation between **Platform Roles** (system-wide) and **Company Roles** (per-business). This removes the old `moderator_permissions` table dependency and consolidates all company-level permissions into `company_memberships`.

---

## Two-Level Role Architecture

```text
PLATFORM ROLES (user_roles table)
  Cipher  - Full system access, invisible in company member lists
  User    - Default for all signups, can browse/join/request companies

COMPANY ROLES (company_memberships.role)
  Admin              - Full company access
  Moderator          - Full visibility, granular add/edit/delete per category
  Data Entry Operator - Own entries only, simple ON/OFF per category
  Viewer             - Read-only, no modifications, no permission toggles
```

---

## Database Changes

### 1. Add Moderator Granular Permission Columns

Add 15 new boolean columns to `company_memberships` for moderator granular control (5 categories x 3 actions):

```text
mod_students_add, mod_students_edit, mod_students_delete
mod_payments_add, mod_payments_edit, mod_payments_delete
mod_batches_add,  mod_batches_edit,  mod_batches_delete
mod_revenue_add,  mod_revenue_edit,  mod_revenue_delete
mod_expenses_add, mod_expenses_edit, mod_expenses_delete
```

All default to `false`. These are only meaningful when `role = 'moderator'`.

### 2. Update Security Definer Functions

Update all `company_can_*` functions to include moderator granular permissions. For example:

- `company_can_add_student` checks `role = 'admin' OR role = 'moderator' AND mod_students_add = true OR deo_students = true`
- `company_can_edit_student` checks `role = 'admin' OR role = 'moderator' AND mod_students_edit = true OR deo_students = true`
- `company_can_delete_student` checks `role = 'admin' OR role = 'moderator' AND mod_students_delete = true OR deo_students = true`

Same pattern for payments, batches, revenue, expenses.

Also update `company_can_edit_delete` to include moderator edit/delete permissions for respective categories.

### 3. Remove Old Platform Role Dependencies

- Remove `admin` and `moderator` from the `app_role` enum (keep only `cipher` and `user`)
- Clean up `user_roles` table: migrate any existing `admin`/`moderator` entries to `user` (their company-level roles in `company_memberships` are what matter)
- The `moderator_permissions` table becomes unused (keep for now, stop reading from it)

---

## Frontend Changes

### Platform Users Page (`src/pages/UserManagement.tsx`)

Cipher-only page showing:
- Profile picture, full name, email
- Signup date
- Companies joined count (from `company_memberships`)
- Platform role badge (Cipher or User only)
- Actions: change platform role (Cipher/User), delete user
- **No company-specific roles shown here**

### Company Members Page (`src/pages/CompanyMembers.tsx`)

Admin-only management, complete redesign of the members table:
- **Columns**: Profile picture, Name, Email, Role badge, Permissions summary, Join date, Actions
- **Cipher users are hidden** from this list (already implemented)
- **Role dropdown**: Admin, Moderator, Data Entry Operator, Viewer
- **Actions column**: Edit permissions button (opens modal), Remove member
- **No inline permission toggles** in the table -- use a modal instead for cleaner UI
- **Viewer role**: No edit permissions button shown (read-only, nothing to configure)

### Permission Assignment Modal (New Component)

A dialog that opens when clicking "Edit Permissions" on a member:

**For Moderator:**
- 5-category checkbox grid
- Each category (Students, Payments, Batches, Revenue, Expenses) has 3 checkboxes: Add, Edit, Delete
- Visual grid layout with category labels on left, checkboxes across

**For Data Entry Operator:**
- 4 simple ON/OFF toggles (same as current `OperatorPermissionMatrix`)
- Student Management, Payment Recording, Batch Management, Revenue & Expenses

**For Viewer:**
- No modal shown (button hidden) -- viewer is purely read-only

**For Admin:**
- No modal shown -- admin has all permissions by default

### CompanyContext Updates (`src/contexts/CompanyContext.tsx`)

- Add moderator granular permissions to the `CompanyMembership` interface
- Update derived permissions:
  - `canAddStudent` = admin OR (moderator AND mod_students_add) OR (DEO AND deo_students)
  - `canEditStudent` = admin OR (moderator AND mod_students_edit) OR (DEO AND deo_students)
  - Same pattern for all categories
- Moderator gets full data visibility (can view everything), restrictions only on mutations
- Viewer: all `can*` permissions return false, only viewing allowed

### RoleContext Cleanup (`src/contexts/RoleContext.tsx`)

- Remove `useModeratorPermissions` dependency (no longer needed)
- Simplify to only expose platform-level role info (cipher/user)
- All company-level permissions come from `CompanyContext`

### Navigation Updates (`src/components/AppLayout.tsx`)

- Moderator sees all nav items (full visibility) but mutation buttons are gated by granular permissions
- Viewer sees all nav items (read-only access)
- DEO sees only enabled categories
- Remove `ModeratorControl` page from navigation (replaced by in-member permission modal)

### Files to Delete/Deprecate

- `src/pages/ModeratorControl.tsx` -- replaced by permission modal in Members page
- `src/hooks/useModeratorPermissions.ts` -- no longer needed (permissions are on company_memberships)
- Remove moderator control nav item from AppLayout

### Files to Create

- `src/components/PermissionAssignmentModal.tsx` -- the modal for editing moderator/DEO permissions

### Files to Modify

- `src/contexts/CompanyContext.tsx` -- add moderator granular fields, update permission derivation
- `src/contexts/RoleContext.tsx` -- simplify, remove moderator_permissions dependency
- `src/pages/CompanyMembers.tsx` -- redesign table, add modal trigger, hide toggles for viewer
- `src/pages/UserManagement.tsx` -- show companies count, remove company role management
- `src/components/AppLayout.tsx` -- update nav visibility for moderator/viewer
- `src/components/RoleGuard.tsx` -- simplify if needed
- `src/hooks/useUserRole.ts` -- reduce AppRole to just "cipher" | "user"
- `src/components/UserRoleBadge.tsx` -- update for simplified platform roles

### Edge Function Updates

- `admin-users`: Remove role change logic for admin/moderator (only cipher/user platform roles remain)
- Update any edge functions that reference `moderator_permissions` table

---

## Technical Details

### Database Migration SQL

1. Add 15 `mod_*` columns to `company_memberships`
2. Update all `company_can_*` security definer functions to check moderator granular permissions
3. Alter `app_role` enum: remove `admin` and `moderator` values, migrate existing records to `user`
4. Add `company_can_view_reports` function that includes moderator check

### Permission Enforcement

- All permissions enforced server-side via RLS policies using existing `company_can_*` functions (updated)
- DEO queries auto-filtered by `created_by` (already in place)
- Role changes logged in audit trail (existing trigger handles this)
- Company data isolation maintained via `company_id` checks in all policies

### TypeScript Types

```text
PlatformRole = "cipher" | "user"
CompanyRole  = "admin" | "moderator" | "data_entry_operator" | "viewer"
```

### Risks and Mitigations

- **Existing moderator_permissions data**: Stop reading from this table; all permissions now on company_memberships. No data loss since the table stays.
- **Existing admin/moderator platform roles**: Migrate to `user` in the same migration. Their company-level roles are unaffected.
- **Backward compatibility**: The `can_add_revenue`, `can_add_expense` etc. columns stay on company_memberships for now but become secondary to the new `mod_*` columns for moderators.

