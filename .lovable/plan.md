
# Fix "Record Payment" Button in Quick Actions Panel

## Problem
The "Record Payment" button in `QuickActionsPanel` currently shows a toast saying "Use the Financial Breakdown section" instead of opening a payment modal.

## Solution
Wire the existing `StudentPaymentDialog` component into the Student Profile Page, triggered by the Quick Actions panel.

### Changes

**1. `src/components/students/profile/QuickActionsPanel.tsx`**
- Add `onRecordPayment` callback prop to `QuickActionsPanelProps`
- Change the "Record Payment" action's `onClick` from the toast message to calling `onRecordPayment()`
- Remove the `disabledTooltip` / toast logic for this button entirely

**2. `src/pages/StudentProfilePage.tsx`**
- Import `StudentPaymentDialog` and `useCreateStudentPayment`
- Add state: `paymentDialogOpen` (boolean)
- Initialize `useCreateStudentPayment()` hook
- Pass `onRecordPayment={() => setPaymentDialogOpen(true)}` to `QuickActionsPanel`
- Render `StudentPaymentDialog` with:
  - `student`, `summary` (already computed), batch/course defaults from existing data
  - `onSave` calls `createPaymentMutation.mutateAsync()` which already invalidates `student_payments` and related queries, triggering re-renders of the Financial Breakdown and hero banner stats
- No `batchEnrollmentId` hint passed (the dialog will show all active enrollments and let the user pick)

### How it works
- The `StudentPaymentDialog` already fetches all active `batch_enrollments` for the student (line 70-93 of the dialog)
- It already shows enrollment selector with course + batch names (line 387-403), though currently `disabled` -- we will remove the `disabled` prop so users can select a batch
- It shows fee summary per selected batch (total, paid, remaining)
- It has all the required fields: amount, payment method, date, notes
- On save, it passes `batch_enrollment_id` from the selected enrollment
- React Query invalidation in `useCreateStudentPayment` automatically refreshes all payment-related data

### What's NOT changed
- No changes to payment creation logic, validation, or database operations
- No changes to `StudentPaymentDialog` internal logic beyond removing the `disabled` attribute on the batch selector
- No changes to Financial Breakdown or other components

### Technical Details
- The batch selector in `StudentPaymentDialog` (line 390) has `disabled` hardcoded -- this will be removed so users can switch between enrollments when opening from the profile page
- The dialog already handles single-enrollment auto-selection (line 117) and multi-enrollment display
- Query invalidation in `useCreateStudentPayment` already covers `student_payments`, `student_all_payments_for_dialog`, and related keys
