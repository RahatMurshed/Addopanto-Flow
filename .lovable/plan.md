

# Auto-select and lock batch in Record Payment dialog

## Problem
The "Record Payment" dialog on the StudentDetail page (accessed via `?from_batch=...`) does not auto-select the batch, and the batch dropdown remains changeable. The user wants the batch to be auto-detected and locked (disabled) in every payment dialog opened from a batch/course context.

## Solution
Two changes needed:

### 1. `src/pages/StudentDetail.tsx` -- Pass `contextBatchId` to the payment dialog
- The page already reads `fromBatch` from the URL (line 57) but never passes it to `StudentPaymentDialog`
- Add `contextBatchId={fromBatch || undefined}` prop to the dialog (line 788-800)

### 2. `src/components/dialogs/StudentPaymentDialog.tsx` -- Disable batch selector when context is provided
- When `batchEnrollmentId` or `contextBatchId` is provided (meaning the dialog was opened from a specific batch context), disable the batch `Select` dropdown so the user cannot change it
- The auto-select logic (lines 110-130) already handles selecting the right enrollment -- it just needs the prop to be passed, and the selector needs to be locked
- Add `disabled` prop to the `<Select>` component (line 395) when `batchEnrollmentId` or `contextBatchId` is truthy

## Files Modified
- `src/pages/StudentDetail.tsx`
- `src/components/dialogs/StudentPaymentDialog.tsx`
