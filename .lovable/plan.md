
# Restructure: Admin + Moderator Roles with Data Entry Mode

## Overview
Restructure company roles to Admin and Moderator only. Moderator gets a "Data Entry Mode" toggle that restricts visibility and access.

---

## Phase 1: Database Schema Changes

### 1a. Add `data_entry_mode` column to `company_memberships`
```sql
ALTER TABLE company_memberships ADD COLUMN data_entry_mode boolean NOT NULL DEFAULT false;
```

### 1b. Add granular mod permissions for courses
Already have `mod_students_*`, `mod_payments_*`, `mod_batches_*`, `mod_expenses_*`, `mod_revenue_*`. Need to add:
```sql
ALTER TABLE company_memberships ADD COLUMN mod_courses_add boolean NOT NULL DEFAULT false;
ALTER TABLE company_memberships ADD COLUMN mod_courses_edit boolean NOT NULL DEFAULT false;
ALTER TABLE company_memberships ADD COLUMN mod_courses_delete boolean NOT NULL DEFAULT false;
```

### 1c. Remove `viewer` and `data_entry_operator` from the enum
Since `company_role` enum has `admin | moderator | viewer | data_entry_operator`, we need to migrate existing viewer/DEO members to moderator, then drop the enum values.
```sql
-- Migrate existing viewer/DEO members to moderator
UPDATE company_memberships SET role = 'moderator' WHERE role IN ('viewer', 'data_entry_operator');
```
Note: Dropping enum values in Postgres requires recreating the enum, which is risky. Instead, we'll just stop using them in the UI and leave them in the DB for backward compat.

---

## Phase 2: Permission Model Redesign

### CompanyContext changes
- Add `dataEntryMode` boolean derived from `membership.data_entry_mode`
- When `dataEntryMode = true`:
  - `canAddStudent` = `deo_students`
  - `canEditStudent` = `deo_students` (BUT only own entries - enforced in queries)
  - `canDeleteStudent` = `deo_students` (BUT only own entries)
  - Same pattern for payments, batches, courses, revenue, expenses
  - `canViewReports` = false
  - `canViewDashboardMetrics` = false
  - `canViewPaymentHistory` = false
  - `canViewFinancialData` = false
- When `dataEntryMode = false` (traditional moderator):
  - Full data visibility
  - Granular add/edit/delete per category via `mod_*` flags
  - Can view reports and analytics

### New context flags needed
- `isDataEntryModerator: boolean` — moderator with data_entry_mode=true
- `canViewDashboardMetrics: boolean`
- `canViewPaymentHistory: boolean`
- `canViewFinancialData: boolean`

---

## Phase 3: Permission Assignment Modal Redesign

### New UI structure:
1. **Role dropdown**: Admin / Moderator (remove Viewer, DEO)
2. **If Moderator selected**:
   - **Data Entry Mode toggle** with description
   - **If Data Entry Mode ON**: Checkboxes for "What they can add" (Students, Payments, Batches, Courses, Revenue, Expenses) — maps to `deo_*` flags
   - **If Data Entry Mode OFF**: Traditional permission grid with add/edit/delete toggles per category — maps to `mod_*` flags

---

## Phase 4: Navigation Changes

### Data Entry Moderator navigation (data_entry_mode = true):
- Dashboard (quick action cards only)
- Students (read-only list for reference + "My Students" tab)
- Payments (only "My Payments")
- Batches (read-only list for reference)
- Courses (read-only list for reference)
- Revenue (only "My Revenue" if permitted)
- Expenses (only "My Expenses" if permitted)
- Profile

### Traditional Moderator navigation (data_entry_mode = false):
- Same as Admin minus: Members, Audit Log, Settings, Platform pages

---

## Phase 5: Dashboard Changes

### Data Entry Moderator dashboard:
- Quick action cards only (Add Student, Record Payment, etc.)
- No financial metrics, no charts, no analytics
- Show count of "my entries" per category

### Traditional Moderator dashboard:
- Full dashboard with metrics and charts (same as Admin)

---

## Phase 6: Page-Level Filtering

### Data Entry Moderator:
- Students page: Read-only list of ALL students (for reference/search), but edit/delete buttons only for `user_id = current_user`
- Payments page: Only show payments where `user_id = current_user`
- Revenue page: Only show revenue where `user_id = current_user`
- Expenses page: Only show expenses where `user_id = current_user`
- Payment form: Show all students in dropdown with pending amounts, but no payment history
- Batch/Course detail pages: Restricted (no financial data)

---

## Phase 7: Server-Side Validation (RLS)

### Update RLS policies to enforce `created_by` / `user_id` filtering for data entry moderators
This requires new DB functions that check `data_entry_mode` on the membership.

---

## Implementation Order

1. **Phase 1**: Database migration (add columns)
2. **Phase 2**: CompanyContext permission model
3. **Phase 3**: Permission Assignment Modal
4. **Phase 4**: Navigation updates (AppLayout)
5. **Phase 5**: Dashboard changes
6. **Phase 6**: Page-level filtering (Students, Payments, etc.)
7. **Phase 7**: RLS policy updates

Each phase builds on the previous. I'll implement one phase at a time, verify it works, then proceed to the next.

---

## Risk Assessment
- **Low risk**: Phases 1-4 (additive changes, no breaking changes)
- **Medium risk**: Phases 5-6 (UI changes, filtering logic)
- **High risk**: Phase 7 (RLS changes could affect existing users)

## Questions Before Starting
1. Should traditional moderators (data_entry_mode=false) have access to Reports and Analytics? (Currently moderators can see reports)
2. For the role dropdown on CompanyMembers, should we keep showing "Admin" option only for Cipher users? (Current behavior)
3. Should we migrate existing DEO/Viewer members to Moderator with data_entry_mode=true/false automatically?
