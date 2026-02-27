

# Auto-Detect Batch Enrollment in Payment Recording Form

## Problem
The payment dialog receives `batchEnrollmentId` as an optional prop from parent pages, but:
- It never shows the admin which batch a payment is for
- Students with multiple enrollments have no way to select the correct batch
- The prop is silently null when callers don't resolve it, producing orphaned payments

## Solution

### 1. Fetch enrollments inside StudentPaymentDialog itself

Instead of relying on each calling page to resolve and pass `batchEnrollmentId`, the dialog will query `batch_enrollments` (joined with `batches` and `courses`) directly for the student when it opens. This is self-contained and eliminates all caller-side enrollment resolution code.

**File: `src/components/dialogs/StudentPaymentDialog.tsx`**

- Add a `useQuery` call inside the dialog that fetches all active enrollments for `student.id` (joined to `batches` and `courses` for display names)
- Add local state `selectedEnrollmentId` to track admin's selection
- If exactly 1 active enrollment: auto-select it, no dropdown shown (just display the batch name)
- If multiple active enrollments: show a required `<Select>` dropdown listing each batch (with course name), and block form submission if none selected
- If 0 enrollments: allow saving without enrollment (edge case for students not yet enrolled)
- On submit, use `selectedEnrollmentId` as `batch_enrollment_id` instead of the prop

### 2. Show fee summary for selected batch

When a batch is selected (auto or manual), display a small info card showing:
- **Total fee** (from `batch_enrollments.total_fee` or batch defaults)
- **Already paid** (sum of existing payments with that `batch_enrollment_id`)
- **Remaining due** (total - paid)

This requires a secondary query or computation from the student's existing payments. The dialog already receives `summary` which has global payment data -- but for per-batch breakdown, we'll filter the student's payments by the selected `batch_enrollment_id`.

**File: `src/components/dialogs/StudentPaymentDialog.tsx`**

- Add a `useStudentPayments(student.id)` call to get all payments
- When `selectedEnrollmentId` changes, compute: paid amount for that enrollment, total fee from the enrollment record, and remaining

### 3. Clean up caller pages

Remove the enrollment resolution queries from `BatchDetail.tsx`, `StudentDetail.tsx`, and `Students.tsx` since the dialog now handles this internally. The `batchEnrollmentId` prop becomes unnecessary but can be kept as an optional hint to pre-select (useful when opening from BatchDetail context).

**Files:**
- `src/pages/BatchDetail.tsx` -- Keep enrollment query (used elsewhere), but dialog no longer depends on it
- `src/pages/StudentDetail.tsx` -- Remove standalone enrollment query if only used for dialog
- `src/pages/Students.tsx` -- Remove standalone enrollment query if only used for dialog

### 4. Update "Uncategorized" label in FinancialBreakdown

**File: `src/components/students/profile/FinancialBreakdown.tsx`** (lines 202-203)

Change `"Uncategorized"` to `"Unlinked (pre-tracking)"` for payments with null `batch_enrollment_id` when multiple enrollments exist. This is honest about historical data.

## Technical Details

### Enrollment query inside dialog
```typescript
const { data: enrollments = [] } = useQuery({
  queryKey: ["student_active_enrollments", student.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("batch_enrollments")
      .select("id, batch_id, total_fee, batches(batch_name, default_admission_fee, default_monthly_fee, course_id, courses(course_name))")
      .eq("student_id", student.id)
      .eq("status", "active");
    return data || [];
  },
  enabled: open,
});
```

### Batch selector UI (only shown for multi-enrollment)
```text
+------------------------------------------+
| Batch *                                  |
| [v] Practice Club Batch-1 (English...)   |
+------------------------------------------+
| Fee Summary for selected batch:          |
| Total: 12,000 | Paid: 3,000 | Due: 9,000|
+------------------------------------------+
```

### Per-batch fee summary computation
```typescript
const batchFeeSummary = useMemo(() => {
  if (!selectedEnrollmentId || !allPayments) return null;
  const enrollment = enrollments.find(e => e.id === selectedEnrollmentId);
  const paid = allPayments
    .filter(p => p.batch_enrollment_id === selectedEnrollmentId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(enrollment?.total_fee || 0);
  return { total, paid, remaining: Math.max(0, total - paid) };
}, [selectedEnrollmentId, enrollments, allPayments]);
```

### Submission guard
```typescript
// In handleSubmit, before saving:
if (enrollments.length > 0 && !selectedEnrollmentId) {
  setFeeError("Please select a batch before recording payment.");
  return;
}
```

## Files Changed

1. **`src/components/dialogs/StudentPaymentDialog.tsx`** -- Add enrollment query, batch selector, fee summary display, submission guard
2. **`src/components/students/profile/FinancialBreakdown.tsx`** -- Update "Uncategorized" to "Unlinked (pre-tracking)"
3. **`src/pages/Students.tsx`** -- Remove enrollment resolution query (dialog handles it now)
4. **`src/pages/StudentDetail.tsx`** -- Remove enrollment resolution query (dialog handles it now)
5. **`src/pages/BatchDetail.tsx`** -- Optionally keep passing `batchEnrollmentId` as a pre-select hint

## Edge Cases
- Student with 0 enrollments: No batch selector shown, `batch_enrollment_id` saved as null
- Student with 1 enrollment: Auto-selected, shown as read-only text (not a dropdown)
- Editing existing payment: Pre-select from `editingPayment.batch_enrollment_id` if available
- BatchDetail context: Pre-select the batch being viewed via `batchEnrollmentId` prop hint
