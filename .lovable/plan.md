

# Smart Loading States Throughout the App

## Overview
Add polished loading indicators across the app: skeleton loaders for data pages, descriptive button text during actions, disabled form fields during submission, and hardened dialogs that prevent dismissal during operations.

## Changes by Area

### 1. Reusable Skeleton Components (New File)
Create `src/components/SkeletonLoaders.tsx` with reusable skeleton components:
- **SkeletonTable**: Configurable rows/columns, mimics table layout with header + body
- **SkeletonCards**: Grid of skeleton stat cards (for Dashboard metrics)
- **SkeletonPageHeader**: Title + description placeholder
- Uses existing `Skeleton` component from `src/components/ui/skeleton.tsx`

### 2. Dashboard (`src/pages/Dashboard.tsx`)
- Replace the full-page `Loader2` spinner (lines 350-356) with skeleton cards for the 5 metric cards + skeleton chart area + skeleton transactions table
- This gives users a sense of the page layout while data loads

### 3. Revenue Page (`src/pages/Revenue.tsx`)
- Replace full-page spinner with skeleton table (matching the revenue table layout)
- Add loading text to delete confirmation button: "Deleting..." with spinner

### 4. Expenses Page (`src/pages/Expenses.tsx`)
- Replace full-page spinner with skeleton table
- Add loading text to delete confirmation button: "Deleting..." with spinner

### 5. Khatas Page (`src/pages/Khatas.tsx`)
- Replace full-page spinner (lines 95-101) with skeleton card grid matching khata cards
- Add loading text: "Creating..." / "Deleting..." on action buttons

### 6. User Management Page (`src/pages/UserManagement.tsx`)
- Replace full-page spinner (lines 282-288) with skeleton table (columns: User, Role, Change Role, Member Since, Actions)
- Add descriptive loading text on delete button in dialog: "Deleting..."
- Add descriptive loading text on role change confirm button: "Updating..."
- Disable Cancel button and prevent dialog close (`onOpenChange` guarded) while mutations are pending

### 7. Registration Requests Page (`src/pages/RegistrationRequests.tsx`)
- Replace the center spinner (lines 382-385) with skeleton tabs + skeleton table rows
- Add descriptive text to all action buttons during loading:
  - Approve: "Approving..."
  - Reject: "Rejecting..."
  - Delete: "Deleting..."
  - Accept: "Accepting..."
- Disable Cancel buttons and prevent dialog/alert-dialog close while mutations are pending (guard `onOpenChange` handlers)

### 8. Auth Page (`src/pages/Auth.tsx`)
- Add descriptive loading text:
  - Login button: "Logging in..." (already has spinner, just add text)
  - Signup button: "Creating account..." 
  - Reset password button: "Sending..." 
- Disable all form `Input` fields during submission (add `disabled={loading || googleLoading}` to all inputs)

### 9. Settings Page (`src/pages/SettingsPage.tsx`)
- Save button already has "Saving..." text -- verify fields are disabled during save
- Add `disabled={saving}` to all form inputs during save

### 10. Moderator Control Page (`src/pages/ModeratorControl.tsx`)
- Replace full-page spinner with skeleton cards for moderator permission cards

### 11. Reports Page (`src/pages/Reports.tsx`)
- Replace loading spinner with skeleton chart + skeleton table areas

## Technical Details

### SkeletonTable Component
```text
+--------------------------------------------------+
| [====]     [========]    [======]    [====]       |  <- header
|--------------------------------------------------|
| [========] [==========]  [======]    [====]       |  <- row 1
| [======]   [========]    [========]  [======]     |  <- row 2
| [========] [==========]  [======]    [====]       |  <- row 3
|  ...                                              |
+--------------------------------------------------+
```
Uses `Skeleton` with `animate-pulse`, rounded rectangles with varying widths for natural look.

### Dialog Hardening Pattern
For all confirmation dialogs, during pending mutations:
- `onOpenChange` callback checks if mutation is pending; if so, does nothing (prevents Escape key or overlay click from closing)
- Cancel button gets `disabled={mutation.isPending}`
- Action button shows spinner + descriptive text and is disabled

### Button Loading Text Map
| Button | Normal Text | Loading Text |
|--------|------------|--------------|
| Login | Login | Logging in... |
| Sign Up | Create Account | Creating account... |
| Approve | Approve | Approving... |
| Reject | Reject (1-day ban) | Rejecting... |
| Delete | Delete | Deleting... |
| Accept | Accept & Grant Access | Accepting... |
| Save | Save Changes | Saving... |
| Confirm (role) | Confirm | Updating... |
| Send Reset Link | Send Reset Link | Sending... |

### Files Modified
1. **New**: `src/components/SkeletonLoaders.tsx`
2. `src/pages/Dashboard.tsx`
3. `src/pages/Revenue.tsx`
4. `src/pages/Expenses.tsx`
5. `src/pages/Khatas.tsx`
6. `src/pages/UserManagement.tsx`
7. `src/pages/RegistrationRequests.tsx`
8. `src/pages/Auth.tsx`
9. `src/pages/SettingsPage.tsx`
10. `src/pages/ModeratorControl.tsx`
11. `src/pages/Reports.tsx`

No new dependencies required -- uses existing `Skeleton` component and `Loader2` icon.

