
# Shared Data Model with Role-Based Permissions

This plan implements a fully shared data model where all financial data is global across all roles. Any authorized user can view all data, and write operations are controlled by role and permission levels.

---

## Current State Analysis

### Data Visibility (Already Working)
- All SELECT operations already return all data (no user_id filter in queries)
- RLS SELECT policies use `USING (true)` for authenticated users

### Write Operations (Need Fixes)
| Table | Current INSERT | Current UPDATE/DELETE |
|-------|---------------|----------------------|
| revenues | Only owner (`user_id = auth.uid()`) | Only owner |
| expenses | Only owner | Only owner |
| expense_accounts | Only owner | Only owner |
| revenue_sources | Only owner | Only owner |
| allocations | Only owner | Only owner |
| khata_transfers | Only owner | Only owner |

### Hooks (Need Fixes)
- `useRevenues.ts` lines 52, 123: Filters expense_accounts by `user_id` when creating allocations
- Dashboard queries (lines 85-91) filter by `user_id` - should be removed for shared data

---

## Target State

### Permission Matrix

| Operation | Cipher | Admin | Moderator | User |
|-----------|--------|-------|-----------|------|
| **View All Data** | Yes | Yes | Yes | No |
| **Add Revenue** | Yes | Yes | If `can_add_revenue` | No |
| **Add Expense** | Yes | Yes | If `can_add_expense` | No |
| **Add Expense Source** | Yes | Yes | If `can_add_expense_source` | No |
| **Transfer** | Yes | Yes | If `can_transfer` | No |
| **Edit** | Yes | Yes | Based on permission | No |
| **Delete** | Yes | Yes | Based on permission | No |

---

## Implementation

### 1. Database Migration

Create helper functions and update RLS policies:

```sql
-- Helper function: can add revenue
CREATE OR REPLACE FUNCTION public.can_add_revenue(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (
      SELECT 1 FROM moderator_permissions mp 
      WHERE mp.user_id = _user_id AND mp.can_add_revenue = true
    );
  END IF;
  RETURN false;
END;
$$;

-- Similar functions for:
-- can_add_expense
-- can_add_expense_source  
-- can_transfer
-- can_edit_delete (only cipher/admin)
```

Update policies for all 6 financial tables:
- DROP existing INSERT/UPDATE/DELETE policies
- CREATE new policies using permission functions

### 2. Frontend Hook Changes

| File | Changes |
|------|---------|
| `useModeratorPermissions.ts` | Add `can_add_expense_source` and `can_transfer` fields |
| `RoleContext.tsx` | Add `canAddExpenseSource` and `canTransfer` computed permissions |
| `useRevenues.ts` | Remove `.eq("user_id", user.id)` filter when fetching expense_accounts (lines 52, 123) |
| `Dashboard.tsx` | Remove `.eq("user_id", user.id)` from all queries (lines 85-91) |

### 3. UI Permission Guards

| Page | Changes |
|------|---------|
| `Khatas.tsx` | Wrap "Add Expense Source" with `canAddExpenseSource`, Edit/Delete with `canEdit`/`canDelete` |
| `Expenses.tsx` | Wrap "Transfer" button with `canTransfer` permission |
| `Revenue.tsx` | Already has `canAddRevenue`, `canEdit`, `canDelete` guards |
| `Dashboard.tsx` | Add `canTransfer` guard to Transfer quick action |
| `ModeratorControl.tsx` | Add toggles for `can_add_expense_source` and `can_transfer` |
| `RegistrationRequests.tsx` | Add toggles for new permissions during approval |

### 4. Edge Function Update

Update `admin-users/index.ts` to handle new permissions:
```typescript
permissions: {
  can_add_revenue,
  can_add_expense,
  can_view_reports,
  can_add_expense_source,  // NEW
  can_transfer,            // NEW
}
```

---

## Files to Modify

### Database (1 migration)
- Create 5 permission helper functions
- Update RLS policies for 6 tables (revenues, expenses, expense_accounts, revenue_sources, allocations, khata_transfers)

### Frontend Files (10 files)
1. `src/hooks/useModeratorPermissions.ts` - Add new permission fields
2. `src/contexts/RoleContext.tsx` - Add computed permissions
3. `src/hooks/useRevenues.ts` - Remove user_id filter for expense_accounts
4. `src/pages/Dashboard.tsx` - Remove user_id filters from queries
5. `src/pages/Khatas.tsx` - Add permission guards
6. `src/pages/Expenses.tsx` - Add Transfer permission guard
7. `src/pages/ModeratorControl.tsx` - Add new permission toggles
8. `src/pages/RegistrationRequests.tsx` - Add new permission toggles
9. `src/components/RoleGuard.tsx` - Add new permission types
10. `supabase/functions/admin-users/index.ts` - Handle new permissions

---

## Technical Details

### Database Function Pattern

Using `SECURITY DEFINER` prevents RLS infinite recursion:

```sql
CREATE OR REPLACE FUNCTION can_edit_delete(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin')
$$;
```

### RLS Policy Pattern

```sql
-- INSERT: Role + permission based
CREATE POLICY "Authorized users can insert revenues"
ON revenues FOR INSERT
WITH CHECK (can_add_revenue(auth.uid()));

-- UPDATE/DELETE: Admin/Cipher only
CREATE POLICY "Admins can update revenues"
ON revenues FOR UPDATE
USING (can_edit_delete(auth.uid()));
```

### Frontend Permission Flow

```text
User Action --> RoleContext --> Permission Check
                     |
                     v
              isCipher/isAdmin? --> Always allowed
                     |
                     v
              isModerator? --> Check moderator_permissions table
                     |
                     v
              Other roles --> Not allowed
```

---

## Summary of Changes

1. **Database**: Create permission functions, update RLS policies to check roles instead of ownership
2. **Hooks**: Remove user_id filters from queries so all users see shared data
3. **Context**: Add `canAddExpenseSource` and `canTransfer` computed permissions
4. **Pages**: Add UI permission guards to hide/show action buttons
5. **Admin Pages**: Add controls for new moderator permissions
6. **Edge Function**: Include new permissions in approval flow
