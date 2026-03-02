# Fix: Batch Detail Page and Auto-Complete Enrollment Bugs

## Database Investigation Summary


| Field              | Value                                             |
| ------------------ | ------------------------------------------------- |
| Student            | Imran Hossain (`2f211591...`)                     |
| Batch              | English Evening (`67fbc8af...`), ended 2025-04-30 |
| Enrollment status  | `completed` (updated 2026-03-02 00:00:06)         |
| Batch status       | `completed`                                       |
| Student status     | `active`                                          |
| Payment rows       | 3 (admission paid, Jan paid, Feb partial)         |
| Total fee          | 2600, paid ~1200                                  |
| Enrollment created | 2026-03-01 (after batch already ended)            |


**Bug 1 fix** is right — removing `status = 'active'` filter from batch detail is the correct approach. Completed batches should still show their historical students.

**Bug 2 fix** is right — explicitly updating enrollments in the cron is better than relying on a trigger that may or may not fire.

**Bug 3 improvements** are both good — especially blocking enrollment into completed batches. This prevents the exact data quality issue that caused this confusion (student enrolled 10 months after batch ended).

---

### ⚠️ One Thing to Watch After Fix 1

Removing `.eq("status", "active")` means the batch detail will now show ALL students including completed and historically removed ones. Make sure:

- The **student count** displayed (`0/15 students`) also updates to count ALL enrollment statuses — not just active
- The **payment stats** (Total Collected, Total Pending, Total Overdue) correctly handle completed enrollments — completed batch dues should show as "Historical" not "Overdue"
- The **"Remove from Batch"** button should be hidden for completed enrollments — you can't remove someone from a batch they already completed

Tell Lovable to verify these three things after applying the fix.

---

### 🔴 Root Cause Worth Noting

The real root cause of Bug 3 is that someone enrolled Imran Hossain into a batch that **ended 10 months ago** — the system allowed it. Fix 3 (blocking enrollment into completed batches) prevents this from happening again. Good catch.  
  
Bug 1 Fix — Batch Detail should show ALL enrolled students

**Problem:** `BatchDetail.tsx` line 71 filters `batch_enrollments` by `.eq("status", "active")`, hiding completed and inactive enrollments. A completed batch will always show 0 students.

**Fix:** Remove the `.eq("status", "active")` filter from the batch enrollments query in `BatchDetail.tsx`. Instead, show all enrollments and let the existing student status filter UI handle visibility. This matches how EnrollmentTimeline works (it shows all statuses).

**File:** `src/pages/BatchDetail.tsx`

- Line 71: Remove `.eq("status", "active")`
- The existing `studentStatusFilter` state (line 98) already supports filtering by status in the UI

## Bug 2 Fix — Auto-complete cron should also complete enrollments

**Problem:** The `auto-complete-batches` edge function only updates `batches.status` to `completed`. It does NOT update `batch_enrollments.status` for active enrollments in that batch. Currently something else is handling this (possibly a trigger), but it should be explicit in the cron.

**Fix:** After marking a batch as completed, also update all `batch_enrollments` with `status = 'active'` for that batch to `status = 'completed'`.

**File:** `supabase/functions/auto-complete-batches/index.ts`

- After the batch update (line 37-38), add:

```typescript
await supabase
  .from("batch_enrollments")
  .update({ status: "completed", updated_at: new Date().toISOString() })
  .eq("batch_id", batch.id)
  .eq("status", "active");
```

## Bug 3 — No code fix needed, but two improvements recommended

**Finding:** The enrollment was created on 2026-03-01 — 10 months after the batch ended (2025-04-30). This is a data entry issue. The unpaid amount is legitimate debt from an enrollment that happened to be in a completed batch.

**Improvement 1 — Enrollment validation:** In `BatchEnrollDialog.tsx`, add a warning or block when enrolling into a batch with `status = 'completed'`. Currently the dialog only checks capacity, not batch status.

**File:** `src/components/dialogs/BatchEnrollDialog.tsx`

- In `handleEnroll`, after the capacity check, add a check: if the batch status is `completed`, show a warning toast and prevent enrollment.

**Improvement 2 — Visual distinction for completed batch dues:** In `EnrollmentTimeline.tsx`, when an enrollment's status is `completed` and there's still a due amount, show the due amount with a "Historical" label or muted styling instead of the standard red "Due" indicator.

**File:** `src/components/students/profile/EnrollmentTimeline.tsx`

- Around line 292 where `dueAmount` is computed, conditionally style/label it if `status === "completed"`.

## Summary of Changes


| File                                                     | Change                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `src/pages/BatchDetail.tsx`                              | Remove `.eq("status", "active")` from enrollments query         |
| `supabase/functions/auto-complete-batches/index.ts`      | Add enrollment status update when batch completes               |
| `src/components/dialogs/BatchEnrollDialog.tsx`           | Block enrollment into completed batches                         |
| `src/components/students/profile/EnrollmentTimeline.tsx` | Visual distinction for historical dues on completed enrollments |
