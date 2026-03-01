

# Fix: Student Status and Enrollment Status Inconsistency

## Problems Identified

### Bug 1: Status not updating instantly in the profile header
When you change the status to "Inactive" via the Quick Actions panel, the sticky bar updates but the profile header badge may still show the old status until a reload. The `handleStatusConfirm` function in `QuickActionsPanel` updates the database directly but the query invalidation in the callback may not fully refresh the UI.

**Fix**: Add `queryClient.invalidateQueries` directly inside `QuickActionsPanel.handleStatusConfirm` after the successful update, covering all related query keys (students, batch_enrollments, dashboard).

### Bug 2: Enrollment still shows "Active" after student is set inactive
When you set a student to "Inactive", the enrollment in `batch_enrollments` is not updated -- it stays "active". The enrollment "Active" badge in the Enrollment History card reflects the enrollment record, not the student status.

**Fix**: When a student's status is changed to "inactive", also update their active `batch_enrollments` records to "completed" (or "inactive"). This ensures the enrollment timeline reflects the student's actual state.

### About "Still showing Enrolled"
After setting a student inactive, since the enrollment record remains active, the "Enrolled" badge persists. Once we fix Bug 2 (deactivating enrollments when student goes inactive), the enrollment status will correctly update, and the "Enrolled" badge logic we already added will also reflect correctly.

## Technical Changes

### 1. QuickActionsPanel.tsx -- Fix status change to also deactivate enrollments
- Import `useQueryClient` from `@tanstack/react-query`
- In `handleStatusConfirm`, after updating `students.status`:
  - If new status is "inactive" or "dropout", also update `batch_enrollments` for that student where `status = 'active'` to `status = 'completed'`
  - Also update `students.batch_id` to `null` (clear the legacy field)
- After all updates, directly invalidate query keys: `students`, `batch_enrollments`, `dashboard`, `reports`

### 2. StudentProfilePage.tsx -- Broaden invalidation on status change
- Update the `onStatusChange` callback to also invalidate `batch_enrollments` and `dashboard` queries, not just `students`.

### 3. No database migration needed
All changes are application-level query and update logic.
