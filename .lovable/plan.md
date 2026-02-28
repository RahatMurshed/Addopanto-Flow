

# Fix: CSV Import Crashing Students Page

## Root Cause

The Students page crashes with the error:
> "A `<Select.Item />` must have a value prop that is not an empty string."

This comes from `BulkImportDialog.tsx` line 388:
```tsx
<SelectItem value="">None</SelectItem>
```

Radix UI's Select component does not allow empty string values for SelectItem. Even though the dialog is closed, the component tree is still evaluated, causing the crash.

## Fix

**File: `src/components/dialogs/BulkImportDialog.tsx`**

Change line 388 from:
```tsx
<SelectItem value="">None</SelectItem>
```
to:
```tsx
<SelectItem value="none">None</SelectItem>
```

Then update the logic that reads `selectedBatchId` to treat `"none"` the same as empty. Specifically, in `handleImport` (line 187):
```tsx
batch_id: selectedBatchId || undefined,
```
Change to:
```tsx
batch_id: selectedBatchId && selectedBatchId !== "none" ? selectedBatchId : undefined,
```

This is a one-file, two-line fix that resolves the crash and restores full CSV import functionality.

