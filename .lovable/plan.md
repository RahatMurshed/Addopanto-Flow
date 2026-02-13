

# Fix Modal Loading States - Keep Modals Open During Actions

## Root Cause

The `AlertDialogAction` component from Radix UI has **built-in close behavior** -- clicking it automatically triggers the dialog to close, regardless of any `onOpenChange` guard. The `onOpenChange` guard fires, but by then Radix has already initiated the close animation. This is why users see the "Deleting..." text flash for a split second before the modal disappears.

Similarly, `DialogContent` renders a built-in X (close) button that is never disabled, and neither `onEscapeKeyDown` nor `onInteractOutside` are blocked during pending operations.

## Fix Strategy

Two changes are needed:

### A. Add `e.preventDefault()` to all `AlertDialogAction` onClick handlers

Calling `e.preventDefault()` stops Radix from auto-closing the dialog. The dialog then stays open while the mutation runs, and closes only when `onSuccess` sets the state to `null`.

### B. Add `onInteractOutside` and `onEscapeKeyDown` guards to `DialogContent` and `AlertDialogContent`

For `Dialog`-based modals (Approve, Accept), the built-in X button and overlay/escape dismissal also need to be blocked during pending operations.

## Files to Modify

### 1. `src/pages/RegistrationRequests.tsx`
**4 dialogs to fix:**

- **Reject AlertDialog** (line 487): Add `e.preventDefault()` to `AlertDialogAction` onClick
- **Permanent Delete AlertDialog** (line 511): Add `e.preventDefault()` to `AlertDialogAction` onClick
- **Approve Dialog** (line 425): Add `onInteractOutside`/`onEscapeKeyDown` guards to `DialogContent` when `approveMutation.isPending`
- **Accept from Rejected Dialog** (line 445): Same guards for `acceptFromRejectedMutation.isPending`

### 2. `src/pages/UserManagement.tsx`
**2 AlertDialogs to fix:**

- **Role Change AlertDialog** (line 459): Add `e.preventDefault()` to `AlertDialogAction` onClick
- **Delete User AlertDialog** (line 511): Add `e.preventDefault()` to `AlertDialogAction` onClick

### 3. `src/pages/Revenue.tsx`
**1 AlertDialog to fix:**

- **Delete AlertDialog** (line 454-455): Add `e.preventDefault()` to `AlertDialogAction` onClick

### 4. `src/pages/Expenses.tsx`
**1 AlertDialog to fix:**

- **Delete AlertDialog** (line 561-562): Add `e.preventDefault()` to `AlertDialogAction` onClick

### 5. `src/pages/Khatas.tsx`
**1 AlertDialog to fix:**

- **Delete AlertDialog** (line 297): Add `e.preventDefault()` to `AlertDialogAction` onClick

### 6. `src/components/TransferHistoryCard.tsx`
**1 AlertDialog to fix (also missing loading guards entirely):**

- Add `e.preventDefault()` to `AlertDialogAction` onClick
- Add `onOpenChange` guard for `isDeleting`
- Disable Cancel button during `isDeleting`
- Add "Deleting..." loading text

### 7. `src/components/RevenueDialog.tsx`, `ExpenseDialog.tsx`, `TransferDialog.tsx`, `KhataDialog.tsx`
**Dialog-based modals:** Add `onInteractOutside` and `onEscapeKeyDown` guards to `DialogContent` to prevent closing via overlay click or Escape key during save operations.

## Technical Details

### Pattern for AlertDialogAction fix:

Before (broken -- dialog auto-closes on click):
```tsx
<AlertDialogAction onClick={() => mutation.mutate(data)}>
```

After (dialog stays open until mutation completes):
```tsx
<AlertDialogAction onClick={(e) => { e.preventDefault(); mutation.mutate(data); }}>
```

### Pattern for Dialog content hardening:

```tsx
<DialogContent
  onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}
  onEscapeKeyDown={(e) => { if (isPending) e.preventDefault(); }}
>
```

### Pattern for AlertDialogContent hardening:

```tsx
<AlertDialogContent
  onEscapeKeyDown={(e) => { if (isPending) e.preventDefault(); }}
>
```

Note: AlertDialogContent already blocks outside clicks by default (Radix behavior), but does NOT block Escape key.

## Summary of all changes

| File | Component | Fix |
|------|-----------|-----|
| RegistrationRequests.tsx | Reject AlertDialog | `e.preventDefault()` on Action click |
| RegistrationRequests.tsx | Delete AlertDialog | `e.preventDefault()` on Action click |
| RegistrationRequests.tsx | Approve Dialog | `onInteractOutside` + `onEscapeKeyDown` guards |
| RegistrationRequests.tsx | Accept Dialog | `onInteractOutside` + `onEscapeKeyDown` guards |
| UserManagement.tsx | Role Change AlertDialog | `e.preventDefault()` on Action click |
| UserManagement.tsx | Delete User AlertDialog | `e.preventDefault()` on Action click |
| Revenue.tsx | Delete AlertDialog | `e.preventDefault()` on Action click |
| Expenses.tsx | Delete AlertDialog | `e.preventDefault()` on Action click |
| Khatas.tsx | Delete AlertDialog | `e.preventDefault()` on Action click |
| TransferHistoryCard.tsx | Delete AlertDialog | `e.preventDefault()` + add loading guards |
| RevenueDialog.tsx | Dialog | `onInteractOutside` + `onEscapeKeyDown` guards |
| ExpenseDialog.tsx | Dialog | `onInteractOutside` + `onEscapeKeyDown` guards |
| TransferDialog.tsx | Dialog | `onInteractOutside` + `onEscapeKeyDown` guards |
| KhataDialog.tsx | Dialog | `onInteractOutside` + `onEscapeKeyDown` guards |

