
# Disable Batch Selector Field (Read-Only Auto-Selection)

## Change

Make the batch selector always disabled so the auto-selected batch cannot be changed by the admin. The system determines the correct batch from the student's current `batch_id`, and the field will display it as read-only.

## File: `src/components/dialogs/StudentPaymentDialog.tsx`

**Line 390** -- Change `disabled={saving}` to `disabled` (always disabled):

```typescript
// Before
<Select value={selectedEnrollmentId || ""} onValueChange={...} disabled={saving}>

// After
<Select value={selectedEnrollmentId || ""} onValueChange={...} disabled>
```

This ensures the batch field is always locked to the auto-selected value. The `onValueChange` handler stays in place (harmless since the field is disabled) and no other logic changes are needed since the auto-selection `useEffect` already handles all cases.

## Also show batch info for single-enrollment students

Currently the batch selector only renders when `enrollments.length > 1` (line 387). For single-enrollment students, no batch info is shown at all. We should also display the batch name as a read-only field for single-enrollment students so every payment form clearly shows which batch it belongs to.

**Line 387** -- Change the condition from `enrollments.length > 1` to `enrollments.length >= 1` so the disabled selector always appears when there are enrollments.

## Summary of changes

One file, two small edits:
1. Show batch field for all students with enrollments (not just multi-enrollment)
2. Make the field permanently disabled so it can't be changed
