

# Multi-Company System Transformation

## Overview

Transform KhataFlow from a single-tenant shared-data app into a multi-company platform where each company has completely isolated data, its own members with roles, and independent management. Users can belong to multiple companies with different roles and switch between them.

## Database Schema Changes

### New Tables

**1. `companies`** - Core company registry

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| name | text | Company display name |
| slug | text (unique) | URL-friendly identifier |
| join_password | text (nullable) | Hashed password for join requests |
| invite_code | text (unique, nullable) | Unique invite code |
| logo_url | text (nullable) | Company branding |
| description | text (nullable) | Short description |
| currency | text | Default: 'BDT' |
| fiscal_year_start_month | integer | Default: 1 |
| created_by | uuid | The user who created it |
| created_at | timestamptz | Default: now() |
| updated_at | timestamptz | Default: now() |

**2. `company_memberships`** - Links users to companies with roles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | References auth.users |
| company_id | uuid | References companies |
| role | company_role enum | 'admin', 'moderator', 'viewer' |
| can_add_revenue | boolean | Default: false |
| can_add_expense | boolean | Default: false |
| can_add_expense_source | boolean | Default: false |
| can_transfer | boolean | Default: false |
| can_view_reports | boolean | Default: false |
| can_manage_students | boolean | Default: false |
| status | text | 'active', 'suspended' |
| joined_at | timestamptz | Default: now() |
| approved_by | uuid (nullable) | Who approved the join |

Unique constraint on (user_id, company_id).

**3. `company_join_requests`** - Pending requests to join a company

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Requesting user |
| company_id | uuid | Target company |
| status | text | 'pending', 'approved', 'rejected' |
| message | text (nullable) | Optional message from user |
| rejection_reason | text (nullable) | If rejected |
| requested_at | timestamptz | Default: now() |
| reviewed_at | timestamptz (nullable) | When reviewed |
| reviewed_by | uuid (nullable) | Who reviewed |

### Modified Tables

Add `company_id` (uuid, NOT NULL, FK to companies) to all data tables:

- `students`
- `student_payments`
- `monthly_fee_history`
- `revenues`
- `revenue_sources`
- `expenses`
- `expense_accounts`
- `allocations`
- `khata_transfers`

### Modified Table: `user_profiles`

Add column:
- `active_company_id` (uuid, nullable, FK to companies) -- tracks which company the user is currently viewing

### New Enum

```sql
CREATE TYPE public.company_role AS ENUM ('admin', 'moderator', 'viewer');
```

### New Helper Functions

- `get_active_company_id(uuid)` -- returns the user's active company_id from user_profiles
- `is_company_admin(uuid, uuid)` -- checks if user is admin of a specific company
- `has_company_permission(uuid, uuid, text)` -- checks specific permission for user in company

### Data Migration

1. Create a "Default Company" record
2. Assign all existing data rows a `company_id` pointing to the default company
3. Convert existing `user_roles` into `company_memberships`:
   - Cipher users get platform-level status (kept in `user_roles` with role='cipher')
   - Admin users become company admins of the default company
   - Moderator users become company moderators with their existing permissions migrated
   - Regular users become viewers
4. Migrate `moderator_permissions` data into the `company_memberships` permission columns

### RLS Policy Updates

Every data table's RLS policies will be rewritten to filter by company_id matching the user's active_company_id, combined with membership-based permission checks. Example pattern:

```sql
-- SELECT: User must be a member of the company that owns the data
CREATE POLICY "Members can view company data" ON students
FOR SELECT USING (
  company_id = get_active_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM company_memberships
    WHERE user_id = auth.uid()
    AND company_id = students.company_id
    AND status = 'active'
  )
);
```

## Application Architecture Changes

### New Context: `CompanyContext`

Replaces much of `RoleContext`. Provides:
- `activeCompany` -- current company object
- `membership` -- current user's membership and permissions in active company
- `companies` -- list of all companies the user belongs to
- `switchCompany(companyId)` -- change active company
- `isCompanyAdmin`, `isCompanyModerator`, permission helpers
- `isCipher` -- platform-level super admin check (still from user_roles)

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| Company Selection | `/companies` | Landing page after login showing user's companies + option to join new ones |
| Join Company | `/companies/join` | Search/browse companies, enter password or invite code |
| Company Settings | `/company/settings` | Company admin manages name, branding, password, invite codes |
| Company Members | `/company/members` | View all members, manage permissions, handle join requests |
| Create Company | `/companies/create` | Cipher-only page to create new companies |

### Modified Auth Flow

```text
Login --> Check if Cipher (platform admin)?
  Yes --> Show company selector (can also create companies)
  No  --> Check company_memberships
    Has companies --> Show company selector
    No companies  --> Redirect to /companies/join
```

After selecting a company, `active_company_id` is set in `user_profiles` and the user enters the main app with data scoped to that company.

### Modified Pages

Every existing page that reads/writes data needs to be company-aware:

- **Dashboard** -- shows data filtered to active company
- **Students** -- scoped to active company
- **Revenue/Expenses/Khatas** -- scoped to active company
- **Reports** -- scoped to active company
- **Settings** -- becomes company settings (managed by company admin)
- **User Management** -- replaced by Company Members page
- **Moderator Control** -- merged into Company Members permissions view
- **Registration Requests** -- replaced by Company Join Requests

### Modified Hooks

All data hooks (`useStudents`, `useRevenues`, `useExpenses`, `useExpenseAccounts`, `useKhataTransfers`, `useStudentPayments`, etc.) already work without explicit company filtering because RLS will handle isolation. No code changes needed in query logic -- RLS does the filtering server-side based on `active_company_id`.

The permission hooks (`useUserRole`, `useModeratorPermissions`) will be replaced by the `CompanyContext` which reads from `company_memberships`.

### Modified Layout

- **Sidebar header** -- shows active company name/logo with a company switcher dropdown
- **Company switcher** -- dropdown in sidebar to switch between companies without leaving the page
- **Navigation** -- "Company Members" replaces "Users", "Moderators", and "Requests" as a single unified page with tabs

### Edge Function Updates

**`admin-users`** -- updated to be company-aware:
- Approve/reject actions target company join requests
- User deletion scoped to company membership removal (not platform deletion unless Cipher)
- New actions: create-company, update-company, generate-invite-code

### New Edge Function: `company-join`

Handles:
- Validating company passwords (bcrypt comparison server-side)
- Creating join requests
- Invite code validation and auto-joining

## UI Components

### Company Selector Page
- Card grid showing companies the user belongs to
- Each card shows company name, logo, role badge, member count
- "Join a Company" button
- Cipher users see "Create Company" button

### Company Switcher (Sidebar)
- Dropdown in the sidebar header area
- Shows current company name with logo
- List of other companies with role badges
- Quick switch without page reload

### Company Members Page (Tabs)
- **Members tab** -- table of all members with role, permissions, joined date
- **Join Requests tab** -- pending requests with approve/reject actions
- **Invite tab** -- manage invite codes, set/change join password

### Permission Management Interface
- Expandable row or side panel for each member
- Toggle switches for granular permissions
- Role selector (admin/moderator/viewer)

## File Change Summary

| Category | Files | Type |
|----------|-------|------|
| Database | 1 large migration | New tables, columns, RLS, functions, data migration |
| Contexts | CompanyContext.tsx (new), RoleContext.tsx (refactored) | New + Modified |
| Pages | 5 new pages, 8+ modified pages | New + Modified |
| Components | CompanySwitcher, CompanyCard, MemberPermissions, JoinCompanyDialog | New |
| Hooks | useCompany, useCompanyMembers, useJoinRequests (new); all data hooks updated | New + Modified |
| Edge Functions | admin-users (modified), company-join (new) | Modified + New |
| Layout | AppLayout.tsx (modified) | Modified |
| Auth Flow | AuthContext, ProtectedRoute logic | Modified |

## Implementation Sequence

1. Database migration (tables, enums, functions, data migration, RLS)
2. CompanyContext and auth flow changes
3. Company selection and join pages
4. AppLayout with company switcher
5. Company members/permissions page
6. Update all existing pages to use CompanyContext instead of RoleContext
7. Edge function updates
8. Company creation page (Cipher only)
9. Company settings and branding
10. Testing and edge case handling

## Important Considerations

- **Existing sessions**: After migration, users will need to select a company on next login since `active_company_id` starts null
- **Cipher role stays platform-level**: The `user_roles` table is kept for the Cipher role only; all other roles move to `company_memberships`
- **Data isolation is enforced at RLS level**: Even if frontend has a bug, the database prevents cross-company data access
- **Password security**: Company join passwords are hashed with bcrypt server-side in the edge function; never stored in plain text
- **Invite codes**: Generated as random 8-character alphanumeric strings, validated server-side

