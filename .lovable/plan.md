
# Role Restructuring: Admin + Moderator with Data Entry Mode

## Overview
Simplify to 2 company roles (Admin, Moderator) with Cipher as invisible platform superadmin. Moderators get a "Data Entry Mode" toggle that restricts them to adding records and editing/deleting only their own entries.

## Current State
- `company_role` enum: `admin | moderator | viewer | data_entry_operator`
- `company_memberships` has `deo_*` flags (students, payments, batches, finance) and legacy `mod_*` add/edit/delete flags
- CompanyContext already treats admin + cipher as full access, moderator as restricted
- Viewer and DEO roles exist in enum but memory says they're already deprecated

## Phase 1: Database Migration

### 1a. Add `data_entry_mode` column
```sql
ALTER TABLE public.company_memberships ADD COLUMN data_entry_mode boolean NOT NULL DEFAULT false;
```

### 1b. Add per-feature add/edit/delete permissions for non-DEO moderators
Reuse existing `mod_*` columns (mod_students_add, mod_students_edit, mod_students_delete, etc.) which are already in the schema. Also add course permissions:
```sql
ALTER TABLE public.company_memberships ADD COLUMN mod_courses_add boolean NOT NULL DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN mod_courses_edit boolean NOT NULL DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN mod_courses_delete boolean NOT NULL DEFAULT false;
```

### 1c. Migrate existing viewer/DEO members to moderator
```sql
UPDATE company_memberships SET role = 'moderator', data_entry_mode = true WHERE role = 'data_entry_operator';
UPDATE company_memberships SET role = 'moderator', data_entry_mode = false WHERE role = 'viewer';
```

### 1d. Remove legacy enum values (or keep for safety)
Since Postgres enum value removal is complex and risky, keep old values but stop using them in code.

## Phase 2: CompanyContext Changes

### New context values:
- `isDataEntryModerator: boolean` — true when moderator AND data_entry_mode is ON
- Permission derivation logic:

**Admin / Cipher**: Full access to all company features
**Moderator (data_entry_mode OFF)**: Full data visibility, configurable add/edit/delete per feature via `mod_*` columns
**Moderator (data_entry_mode ON)**: 
  - Can add entries based on `deo_*` flags
  - Can edit/delete ONLY entries they created (filtered by user_id)
  - Read-only access to students, batches, courses for reference
  - NO access to: dashboard metrics, reports, analytics, revenue totals, payment history
  - NO access to: members page, audit log, settings

### Permission matrix:

| Feature | Admin | Mod (normal) | Mod (data entry) |
|---------|-------|-------------|-------------------|
| Dashboard metrics | ✅ | ✅ | ❌ (quick actions only) |
| Students list | ✅ | ✅ | ✅ read-only (edit/delete own only) |
| Payments | ✅ | per mod_* | add + own only |
| Batches | ✅ | per mod_* | read-only (add if deo_batches) |
| Courses | ✅ | per mod_* | read-only (add if deo_batches) |
| Revenue | ✅ | per mod_* | add if deo_finance, own only |
| Expenses | ✅ | per mod_* | add if deo_finance, own only |
| Reports | ✅ | ✅ | ❌ |
| Members | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Expense Sources | ✅ | ❌ | ❌ |

## Phase 3: Permission Assignment Modal Redesign

New UI flow:
1. Role dropdown: Admin / Moderator
2. If Moderator selected → show Data Entry Mode toggle
3. If Data Entry Mode ON → show checkboxes: "What they can add" (6 options using deo_* flags)
4. If Data Entry Mode OFF → show permission grid with add/edit/delete toggles per category using mod_* columns

## Phase 4: Navigation Changes

### Admin nav (unchanged):
Dashboard, Courses, Students, Expense Sources, Revenue, Expenses, Reports, Members, Audit Log, Settings

### Moderator (normal) nav:
Dashboard, Courses, Students, Revenue, Expenses, Reports (based on mod_* permissions)

### Moderator (data entry) nav:
Dashboard (quick actions), Students (reference + own), Payments (own), Revenue (if deo_finance, own), Expenses (if deo_finance, own), Profile

## Phase 5: Data Filtering for Data Entry Mode

### Client-side changes:
- Students page: show all students read-only, edit/delete buttons only for `user_id === currentUser`
- Payments: filter to show only payments where `user_id === currentUser`
- Revenue: filter to show only revenue where `user_id === currentUser`
- Expenses: filter to show only expenses where `user_id === currentUser`

### Server-side (RLS is already in place):
- Existing RLS allows company members to SELECT all company data
- Edit/delete is already gated by permission functions
- No RLS changes needed — the filtering is a UI concern since moderators should be able to reference data

## Phase 6: Dashboard for Data Entry Moderators

Quick action cards only (no metrics, charts, or transactions):
- Add Student (if deo_students)
- Record Payment (if deo_payments)
- Add Batch (if deo_batches)
- Add Course (if deo_batches)
- Add Revenue (if deo_finance)
- Add Expense (if deo_finance)

## Phase 7: Member Page Role Selector

Update role dropdown to show only:
- Admin (only if current user is Cipher)
- Moderator

Remove viewer and data_entry_operator options.

## Files to Modify

| File | Changes |
|------|---------|
| Migration SQL | Add data_entry_mode, mod_courses_*, migrate old roles |
| `src/contexts/CompanyContext.tsx` | Add isDataEntryModerator, update permission derivation, add mod_* to interface |
| `src/components/dialogs/PermissionAssignmentModal.tsx` | Complete redesign with Data Entry Mode toggle |
| `src/components/layout/AppLayout.tsx` | Different nav for data entry moderator vs normal moderator |
| `src/pages/Dashboard.tsx` | Already has DEO quick-actions view, adapt for data entry mode |
| `src/pages/CompanyMembers.tsx` | Update role dropdown, permission summary |
| `src/pages/Students.tsx` | Add own-only edit/delete filter for data entry mode |
| `src/pages/Revenue.tsx` | Add own-only filter for data entry mode |
| `src/pages/Expenses.tsx` | Add own-only filter for data entry mode |
| `src/components/auth/UserRoleBadge.tsx` | Add "Data Entry Moderator" badge variant |

## Implementation Order

1. Database migration (data_entry_mode column + course permissions + data migration)
2. CompanyContext (add isDataEntryModerator + permission logic)
3. PermissionAssignmentModal (redesign)
4. CompanyMembers (role selector update)
5. AppLayout (navigation for data entry mode)
6. Dashboard (already mostly done, minor tweaks)
7. Data pages (own-only filtering)
8. Badge update
