

# Add Expense Source and Transfer Permissions for Moderators

This plan adds two new moderator permission controls that Admin and Cipher roles can configure:
1. **Can Add Expense Source** - Permission to create/manage expense accounts (Khatas)
2. **Can Transfer** - Permission to transfer funds between expense accounts

---

## Current State

Currently, the `moderator_permissions` table has 3 permission flags:
- `can_add_revenue`
- `can_add_expense`
- `can_view_reports`

The Expense Sources (Khatas) page and Transfer functionality have no permission checks - they're accessible to everyone.

---

## Changes Required

### 1. Database Migration
Add two new columns to `moderator_permissions` table:
- `can_add_expense_source` (boolean, default: false)
- `can_transfer` (boolean, default: false)

Also add these columns to `registration_requests` table so permissions can be set during approval.

### 2. Update Files

| File | Changes |
|------|---------|
| `src/hooks/useModeratorPermissions.ts` | Add `can_add_expense_source` and `can_transfer` to interface and helpers |
| `src/contexts/RoleContext.tsx` | Add `canAddExpenseSource` and `canTransfer` computed permissions |
| `src/pages/ModeratorControl.tsx` | Add switches for the two new permissions |
| `src/pages/RegistrationRequests.tsx` | Add switches for new permissions during approval |
| `src/pages/Khatas.tsx` | Wrap Add/Edit/Delete buttons with permission guards |
| `src/pages/Expenses.tsx` | Wrap Transfer button with permission guard |
| `src/pages/Dashboard.tsx` | Wrap Transfer button with `canTransfer` permission |
| `supabase/functions/admin-users/index.ts` | Handle new permissions during approval |

---

## Detailed Changes

### Database Migration SQL

```sql
-- Add new permission columns to moderator_permissions
ALTER TABLE moderator_permissions 
ADD COLUMN can_add_expense_source boolean NOT NULL DEFAULT false,
ADD COLUMN can_transfer boolean NOT NULL DEFAULT false;

-- Add new permission columns to registration_requests
ALTER TABLE registration_requests
ADD COLUMN can_add_expense_source boolean NOT NULL DEFAULT false,
ADD COLUMN can_transfer boolean NOT NULL DEFAULT false;
```

### Hook Changes (`useModeratorPermissions.ts`)

Update the `ModeratorPermissions` interface:
```typescript
export interface ModeratorPermissions {
  // ... existing fields
  can_add_expense_source: boolean;
  can_transfer: boolean;
}
```

Add new helper returns:
```typescript
canAddExpenseSource: permissions?.can_add_expense_source ?? false,
canTransfer: permissions?.can_transfer ?? false,
```

### RoleContext Updates

Add new permission flags:
```typescript
interface RoleContextType {
  // ... existing
  canAddExpenseSource: boolean;
  canTransfer: boolean;
}
```

Compute permissions:
```typescript
const canAddExpenseSource = isCipher || isAdmin || (isModerator && modCanAddExpenseSource);
const canTransfer = isCipher || isAdmin || (isModerator && modCanTransfer);
```

### ModeratorControl Page

Add two new toggle switches:
- "Can Add Expense Source" with Wallet icon
- "Can Transfer" with ArrowLeftRight icon

### RegistrationRequests Page

Add two new toggle switches in the approval dialog:
- "Can Add Expense Source"
- "Can Transfer"

### Khatas Page Permission Guards

Wrap buttons with conditions:
```typescript
// Add Expense Source button
{canAddExpenseSource && (
  <Button onClick={() => setDialogOpen(true)}>
    <Plus /> Add Expense Source
  </Button>
)}

// Edit/Delete buttons
{canEdit && (
  <Button onClick={handleEdit}>Edit</Button>
)}
{canDelete && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

### Expenses Page Permission Guards

```typescript
// Transfer button
{canTransfer && (
  <Button onClick={() => setTransferDialogOpen(true)}>
    <ArrowLeftRight /> Transfer
  </Button>
)}
```

### Dashboard Page Permission Guards

Update Transfer button in quick actions:
```typescript
<PermissionGuard permission="canTransfer">
  <Button onClick={() => setTransferDialogOpen(true)}>
    <ArrowLeftRight /> Transfer
  </Button>
</PermissionGuard>
```

### Edge Function Update

Update `admin-users/index.ts` to handle new permissions when approving:
```typescript
permissions: {
  can_add_revenue: data.permissions.can_add_revenue,
  can_add_expense: data.permissions.can_add_expense,
  can_view_reports: data.permissions.can_view_reports,
  can_add_expense_source: data.permissions.can_add_expense_source,
  can_transfer: data.permissions.can_transfer,
}
```

---

## Permission Summary After Changes

| Permission | Cipher | Admin | Moderator |
|------------|--------|-------|-----------|
| Add Revenue | Always | Always | If granted |
| Add Expense | Always | Always | If granted |
| Add Expense Source | Always | Always | If granted |
| Transfer | Always | Always | If granted |
| View Reports | Always | Always | If granted |
| Edit | Always | Always | Never |
| Delete | Always | Always | Never |

---

## Files to Modify

1. **Database**: New migration for `moderator_permissions` and `registration_requests` tables
2. `src/hooks/useModeratorPermissions.ts` - Add new permission fields
3. `src/contexts/RoleContext.tsx` - Add computed permissions
4. `src/pages/ModeratorControl.tsx` - Add new permission toggles
5. `src/pages/RegistrationRequests.tsx` - Add new permission toggles during approval
6. `src/pages/Khatas.tsx` - Add permission guards for Add/Edit/Delete buttons
7. `src/pages/Expenses.tsx` - Add permission guard for Transfer button
8. `src/pages/Dashboard.tsx` - Update Transfer button permission
9. `supabase/functions/admin-users/index.ts` - Handle new permissions

