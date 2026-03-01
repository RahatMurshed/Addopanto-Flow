

# Reactivate Inactive Student and Restore Enrollment

## Problem
When a student is set back to "Active" from "Inactive", their batch enrollments remain in "inactive" status and their `batch_id` stays null. The student appears active but has no active enrollments.

## Solution
When changing a student's status to "active", automatically restore their most recent inactive enrollment(s) back to "active" and reassign their `batch_id`.

## Changes

### 1. QuickActionsPanel.tsx - Add reactivation logic
In the `handleStatusConfirm` function, add a new branch: when the new status is "active", query for the student's most recent "inactive" enrollment(s), update them back to "active", and set the student's `batch_id` to the most recent one.

Logic:
- Query `batch_enrollments` where `student_id` matches, `status = 'inactive'`, ordered by `updated_at DESC`
- Only restore enrollments whose associated batch is still "active" (don't restore enrollments for completed/archived batches)
- Update matching enrollment(s) to `status = 'active'`
- Set the student's `batch_id` to the batch from the most recent restored enrollment
- Show a toast indicating how many enrollments were restored

### 2. Status confirmation dialog - Add context
Update the confirmation dialog text when reactivating to inform the user that inactive enrollments will be restored automatically.

## Technical Details

File: `src/components/students/profile/QuickActionsPanel.tsx`

In `handleStatusConfirm`, after the student status update succeeds, add:

```typescript
if (pendingStatus === "active") {
  // Find inactive enrollments with still-active batches
  const { data: inactiveEnrollments } = await supabase
    .from("batch_enrollments")
    .select("id, batch_id, batches!inner(status)")
    .eq("student_id", student.id)
    .eq("company_id", companyId)
    .eq("status", "inactive");

  const restorableEnrollments = inactiveEnrollments?.filter(
    (e) => e.batches?.status === "active"
  );

  if (restorableEnrollments?.length) {
    // Restore enrollments
    await supabase
      .from("batch_enrollments")
      .update({ status: "active" })
      .in("id", restorableEnrollments.map(e => e.id));

    // Set batch_id to most recent
    await supabase
      .from("students")
      .update({ batch_id: restorableEnrollments[0].batch_id })
      .eq("id", student.id);
  }
}
```

Also update the confirmation dialog message (around line 343-361) to show contextual text:
- For inactive/dropout: "This will deactivate their current enrollments."
- For active (from inactive): "This will restore any inactive enrollments whose batch is still active."

No database migrations needed -- the "active" status is already allowed in the constraint.
