

# Role Simplification: Rename DEO to Moderator, Remove Old Moderator and Viewer

## Overview

The current system has 4 company roles: Admin, Moderator, Viewer, and Data Entry Operator (DEO). This change simplifies it to just 2 company roles:

- **Admin** -- unchanged, full access
- **Moderator** -- replaces DEO, keeps all DEO permission controls (Students, Payments, Batches, Finance categories), "own entries only" restriction stays

The old Moderator (with mod_* granular permissions) and Viewer (read-only) roles are removed entirely.

## Data Migration

There is currently 1 viewer and 1 moderator member in the database. Both will be migrated to the new "moderator" role (which is actually the old DEO role behavior). The old moderator's legacy permissions will be mapped to the DEO-style category toggles.

## Technical Plan

### 1. Database Migration

- Migrate existing `viewer` members to `moderator` role (with all deo_* permissions set to false -- effectively read-only until admin grants access)
- Migrate existing `moderator` members to `data_entry_operator` temporarily, then rename
- Actually, since we're keeping the `moderator` enum value but changing its meaning:
  - Convert `data_entry_operator` rows to `moderator` (keeping their deo_* permissions)
  - Convert `viewer` rows to `moderator` (with deo_* all false)
  - Drop the `viewer` and `data_entry_operator` enum values
  - But you can't drop enum values in Postgres easily. Instead:
    1. Update all `data_entry_operator` memberships to `moderator`, copying deo_* permissions
    2. Update all `viewer` memberships to `moderator` (deo_* already false by default)
    3. The old moderator rows keep `moderator` role -- clear their mod_* permissions and set deo_* from their old mod_* permissions as best mapping
    4. Leave the enum as-is (unused values won't cause issues)
- Update all security-definer functions that reference `data_entry_operator` or `viewer` to use `moderator` instead
- Update the default role in `company_memberships` from `viewer` to `moderator`

### 2. Edge Function: `company-join/index.ts`

- Remove `viewer` and `data_entry_operator` from role enum validation -- only allow `moderator`
- Remove viewer-specific logic (invite code auto-assigns viewer)
- Invite code joins now assign `moderator` role (with no permissions by default)
- Remove old moderator permission handling (can_add_revenue, etc.)
- Keep DEO permission handling but under the `moderator` role
- Clean up `buildPermissionsPayload` and `roleLabel` functions

### 3. `CompanyContext.tsx`

- Remove `isCompanyViewer` and `isCompanyModerator` flags
- Add `isModerator` (replaces `isDataEntryOperator`)
- Remove `viewerBlock` logic
- Remove mod_* permission calculations
- Keep deo_* permission logic but apply it to `moderator` role
- Update all derived permissions (canAddStudent, canEditStudent, etc.) to use new moderator check
- Remove `isCompanyViewer` and `isCompanyModerator` from the context type and provider

### 4. UI Components

**`CompanyMembers.tsx`:**
- Role dropdown: only show Admin and Moderator
- Update `getPermissionsSummary` to remove viewer/old moderator branches
- Permission editing: show DEO-style permissions for moderator role

**`CompanyJoinRequests.tsx`:**
- Role selector: only Moderator option (Admin assigned separately by Cipher)
- Remove viewer permission toggles section
- Remove old moderator permission toggles (can_add_revenue, etc.)
- Keep DEO-style category toggles for moderator

**`PermissionAssignmentModal.tsx`:**
- Remove the old moderator section (MOD_CATEGORIES with Add/Edit/Delete matrix)
- Show DEO_CATEGORIES when role is `moderator`
- Update dialog title/description

**`UserRoleBadge.tsx`:**
- Remove `viewer` and `data_entry_operator` from `CompanyRole` type
- Keep `moderator` with DEO-style styling (teal gradient)
- Update label from "Data Entry Operator" to "Moderator"

**`OperatorPermissionMatrix.tsx`:**
- Rename title from "Data Entry Operator Permissions" to "Moderator Permissions"

### 5. Pages Using `isCompanyViewer`

Update these pages to remove viewer badge and viewer checks:
- `Students.tsx` -- remove `isCompanyViewer` badge, rename DEO badge
- `Expenses.tsx` -- same
- `Khatas.tsx` -- remove viewer badge
- `Batches.tsx` -- same
- `Courses.tsx` -- same

Replace `isDataEntryOperator` references with `isModerator` (or whatever the renamed flag is).

### 6. Access Guards

**`AccessGuard.tsx`:**
- Update `isDenied` checks: replace `isDataEntryOperator` with the new moderator check
- Rules stay the same conceptually (moderators with no permissions are blocked from those routes)

### 7. Audit Log

- Update role filter options: remove "Viewer", rename "DEO" to "Moderator"
- Update `roleLabelMap` export mapping

### 8. Tests

- Update `useUserRole.test.ts` -- remove moderator from platform role hierarchy (it was already separate)
- Update `AccessGuard.test.tsx` -- replace `isDataEntryOperator` with new flag name
- Update `pii-redaction.test.tsx` -- remove `isCompanyViewer` mocks
- Update `useStudentsSafeView.test.ts` -- adjust mocks

### 9. `useModeratorPermissions.ts`

- This hook queries the legacy `moderator_permissions` table. Since old moderator role is being removed, this hook and its table can be deleted (permissions are now on `company_memberships` via deo_* columns).

### 10. `LandingPage.tsx`

- Update marketing text from "admins, moderators, and viewers" to "admins and moderators"

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Role data migration + function updates |
| `supabase/functions/company-join/index.ts` | Remove viewer/old-moderator logic |
| `src/contexts/CompanyContext.tsx` | Simplify role checks |
| `src/pages/CompanyMembers.tsx` | Simplify role dropdown + permissions |
| `src/components/auth/CompanyJoinRequests.tsx` | Remove viewer/old-moderator options |
| `src/components/dialogs/PermissionAssignmentModal.tsx` | Remove old moderator section |
| `src/components/auth/UserRoleBadge.tsx` | Remove viewer/DEO entries |
| `src/components/shared/OperatorPermissionMatrix.tsx` | Rename labels |
| `src/components/auth/AccessGuard.tsx` | Update role checks |
| `src/pages/Students.tsx` | Remove viewer badge |
| `src/pages/Expenses.tsx` | Remove viewer badge |
| `src/pages/Khatas.tsx` | Remove viewer badge |
| `src/pages/Batches.tsx` | Remove viewer badge |
| `src/pages/Courses.tsx` | Remove viewer badge |
| `src/pages/AuditLog.tsx` | Update role filters |
| `src/pages/LandingPage.tsx` | Update marketing copy |
| `src/hooks/useModeratorPermissions.ts` | Delete (legacy) |
| Test files (4) | Update mocks and assertions |

