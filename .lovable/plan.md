# Restructure: Admin + Moderator Roles with Data Entry Mode

## Status: Phases 1-5 COMPLETE, Phases 6-7 TODO

---

## ✅ Phase 1: Database Schema (DONE)
- Added `data_entry_mode` boolean to `company_memberships`
- Added `deo_courses`, `mod_courses_add/edit/delete` columns
- Created `is_data_entry_moderator()` security definer function
- Added indexes on `user_id`/`created_by` for efficient filtering
- Migrated existing DEO → Moderator (data_entry_mode=true), Viewer → Moderator

## ✅ Phase 2: CompanyContext (DONE)
- Added `isDataEntryModerator`, `isTraditionalModerator` flags
- Added `canViewDashboardMetrics`, `canViewPaymentHistory`, `canViewFinancialData`
- Added `canAddCourse`, `canEditCourse`, `canDeleteCourse`
- Traditional moderator uses `mod_*` granular flags
- Data entry moderator uses `deo_*` category flags

## ✅ Phase 3: Permission Assignment Modal (DONE)
- Redesigned with Data Entry Mode toggle
- Data Entry Mode ON: simple category checkboxes (what they can add)
- Data Entry Mode OFF: full permission grid with add/edit/delete per category

## ✅ Phase 4: Navigation + Members Page (DONE)
- AppLayout: data entry moderators see restricted nav (Students, Batches, Courses, My Revenue, My Expenses)
- Traditional moderators see full nav minus admin-only pages
- Members page: role dropdown shows only Admin/Moderator (removed Viewer, DEO)
- Permission summary shows "Data Entry: ..." or category list

## ✅ Phase 5: Dashboard (DONE)
- Data entry moderators see quick action cards only (no financial metrics)
- Traditional moderators see full dashboard with charts
- Added Course quick action for data entry moderators

## ⬜ Phase 6: Page-Level Filtering (TODO)
- Revenue/Expenses pages: filter to show only own entries for data entry moderators
- Students page: show all students (read-only reference) but edit/delete only own
- Payment form: show all students for selection but no payment history
- Batch/Course detail pages: restricted financial data

## ⬜ Phase 7: RLS Policy Updates (TODO)
- Server-side enforcement of data entry mode restrictions
- Modification operations filtered by user_id for data entry moderators
- Block access to aggregate/analytics queries
