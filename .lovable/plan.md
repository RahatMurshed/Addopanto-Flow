

# User Profile Page + Simplified DEO Permissions

This plan covers both features: a new user profile page and a complete redesign of the Data Entry Operator permission system.

---

## Feature 1: User Profile Page

### Database Changes

Add new columns to the existing `user_profiles` table:

```text
phone           text     nullable
alt_phone       text     nullable
address         text     nullable
city            text     nullable
country         text     nullable
department      text     nullable
employee_id     text     nullable
date_of_birth   date     nullable
bio             text     nullable
```

The table already has `full_name`, `email`, `avatar_url`, and `created_at` (serves as join date).

Add an RLS policy so DEOs and all company members can view profiles of users in the same company (needed for displaying names/avatars in audit logs and lists). Currently only admins, ciphers, moderators, and the user themselves can see profiles. We need to add a policy for DEOs too.

### Storage Bucket

Create a `profile-avatars` storage bucket (public) for profile picture uploads. The upload path will be `{user_id}/avatar.{ext}` with upsert.

### New Page: `/profile`

Create `src/pages/ProfilePage.tsx` with:
- Profile picture upload using the existing `ImageUpload` component (max 2MB, jpg/png/webp)
- Form fields for all profile data in a clean card layout
- Email displayed as read-only
- Join date (created_at) displayed as read-only
- Explicit "Save Profile" button with loading state ("Saving Profile...")
- Mobile-responsive grid layout

### Navigation

Add a "Profile" link to the user dropdown in `AppLayout.tsx` (accessible to all roles).
Add a route `/profile` in `App.tsx`.

### Audit Trail for Profile Changes

Profile field changes are already captured by the existing audit log trigger system (it tracks all table changes). The audit log page already shows user emails. We will enhance audit log entries to show the user's full name and avatar thumbnail alongside their email.

### Enhanced User Identity Display

Update the audit log table (`AuditLog.tsx`) to show full name + avatar using the `UserAvatar` component instead of just email/user ID. This requires joining user profiles in the audit log query. Since profiles are already fetched for member lists, we'll use a similar pattern -- batch-fetch profiles for the user IDs in the current log page.

---

## Feature 2: Simplified DEO Permissions

### Database Migration

Replace the 20+ granular permission columns with 4 simple category booleans:

```text
deo_students     boolean  default false   -- Student Management category
deo_payments     boolean  default false   -- Payment Recording category
deo_batches      boolean  default false   -- Batch Management category
deo_finance      boolean  default false   -- Revenue & Expenses category
```

Migration strategy:
1. Add the 4 new columns
2. Migrate existing data: if ANY sub-permission in a category was true, set the category to true
3. Drop the old granular columns: `can_add_student`, `can_edit_student`, `can_delete_student`, `can_add_payment`, `can_edit_payment`, `can_delete_payment`, `can_add_batch`, `can_edit_batch`, `can_delete_batch`, `can_edit_revenue`, `can_delete_revenue`, `can_edit_expense`, `can_delete_expense`, `can_view_revenue`, `can_view_expense`

Keep the moderator-level permissions (`can_add_revenue`, `can_add_expense`, `can_add_expense_source`, `can_transfer`, `can_view_reports`, `can_manage_students`) as they serve a different role.

### Update RLS Helper Functions

Update the `SECURITY DEFINER` helper functions used in RLS policies to check the new category columns instead of granular ones. For example, `company_can_add_student` will check `deo_students = true` instead of `can_add_student = true`.

### CompanyContext Updates

Replace all granular DEO permission properties with 4 category booleans:
- `deoStudents`, `deoPayments`, `deoBatches`, `deoFinance`
- Derive `canAddStudent`, `canEditStudent`, etc. from the category boolean (all true when category is on)
- Keep the existing permission property names for backward compatibility in the context interface, but compute them from the 4 categories

### Permission Matrix UI

Replace `OperatorPermissionMatrix.tsx` with a simple 4-switch panel:
- Student Management (on/off)
- Payment Recording (on/off)
- Batch Management (on/off)
- Revenue & Expenses (on/off)

Each switch has a brief description of what it enables.

### DEO Data Filtering ("Own Entries + Assigned")

Update data hooks to filter DEO views:
- **Students**: Show students created by the DEO OR students in batches created by the DEO
- **Payments**: Show payments created by the DEO
- **Batches**: Show batches created by the DEO
- **Revenue/Expenses**: Show entries created by the DEO

This requires checking `user_id` (which is `created_by` in these tables) against the current user's ID in the hooks. The filtering happens client-side for simplicity (RLS already prevents unauthorized writes).

Each page will show "You have added X entries" counter instead of company totals.

### Navigation Updates

`AppLayout.tsx` sidebar visibility logic changes to use the 4 category booleans:
- Show Students if `deoStudents || deoPayments` (payments need student dropdown)
- Show Batches if `deoBatches`
- Show Revenue if `deoFinance`
- Show Expenses if `deoFinance`

### Page Updates for DEO Mode

All list pages (Students, Batches, Revenue, Expenses) already hide analytics/summaries for DEOs. Update them to:
- Filter data to "own entries + assigned" when DEO
- Show "Data Entry Mode - Viewing Only Your Entries" badge
- Show entry count like "You have added 15 students"
- Hide navigation to detail pages that expose other data (already partially done)

### Dashboard DEO View

Already shows quick action cards. Update to use the 4 category booleans for determining which cards to show.

---

## Technical Details

### Files to Create
- `src/pages/ProfilePage.tsx` -- User profile page

### Files to Modify
- `src/App.tsx` -- Add `/profile` route
- `src/components/AppLayout.tsx` -- Add Profile link to dropdown, update nav logic for 4 categories
- `src/contexts/CompanyContext.tsx` -- Replace granular DEO permissions with 4 categories
- `src/components/OperatorPermissionMatrix.tsx` -- Simplify to 4 toggle switches
- `src/pages/CompanyMembers.tsx` -- Update permission columns in member table
- `src/pages/Revenue.tsx` -- Filter to own entries for DEO, update permission checks
- `src/pages/Expenses.tsx` -- Filter to own entries for DEO, update permission checks
- `src/pages/Students.tsx` -- Filter to own entries for DEO
- `src/pages/Batches.tsx` -- Filter to own entries for DEO
- `src/pages/Dashboard.tsx` -- Update quick action card visibility
- `src/pages/AuditLog.tsx` -- Show user avatar + name
- `src/hooks/useRevenues.ts` -- Add DEO filtering
- `src/hooks/useExpenses.ts` -- Add DEO filtering
- `src/hooks/useStudents.ts` -- Add DEO filtering
- `src/hooks/useBatches.ts` -- Add DEO filtering

### Database Migrations (in order)
1. Add profile columns to `user_profiles`
2. Create `profile-avatars` storage bucket
3. Add RLS policy for DEOs to view company member profiles
4. Add 4 `deo_*` category columns to `company_memberships`
5. Migrate existing granular permission data to categories
6. Drop old granular permission columns
7. Update RLS helper functions to use new category columns

### Risks and Mitigations
- **Breaking change**: Dropping 15+ columns requires updating all RLS functions in the same migration. Will be done atomically.
- **Data loss**: Migration step preserves existing permissions by OR-ing all sub-permissions within each category.
- **Live data**: Will check live environment for existing DEO memberships before dropping columns.

