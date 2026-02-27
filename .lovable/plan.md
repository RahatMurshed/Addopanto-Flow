

# Auto-select batch in Payment Dialog from profile page context

## Problem
When opening "Record Payment" from the Student Profile Page (navigated via `?from_batch=...`), the batch dropdown is not pre-selected. The `from_batch` query parameter is available in the URL but is never read by `StudentProfilePage.tsx` or passed to the payment dialog.

## Solution

### 1. `src/pages/StudentProfilePage.tsx`
- Import `useSearchParams` from `react-router-dom`
- Read `from_batch` query parameter (batch ID)
- Pass it as a new prop (e.g. `contextBatchId`) to `StudentPaymentDialog`

### 2. `src/components/dialogs/StudentPaymentDialog.tsx`
- Add an optional `contextBatchId?: string` prop (this is a **batch ID**, not an enrollment ID)
- In the auto-select `useEffect` (line 110-125), add logic: if `contextBatchId` is provided and no `batchEnrollmentId` hint exists, find the enrollment whose `batch_id` matches `contextBatchId` and auto-select it
- Priority order remains: editing payment > explicit enrollmentId hint > contextBatchId > single enrollment > student.batch_id fallback

### What stays the same
- The batch dropdown remains **enabled** (not disabled) so users can switch to a different batch if needed
- No changes to payment creation, validation, or other dialog logic
- The `from_batch` param continues to work for other features (batch context navigation)

### Technical detail
The existing auto-select effect already runs when `enrollments` data loads. We just need to add one more condition before the `student.batch_id` fallback:
```
} else if (contextBatchId && enrollments.length > 0) {
  const match = enrollments.find(e => e.batch_id === contextBatchId);
  if (match) setSelectedEnrollmentId(match.id);
}
```
