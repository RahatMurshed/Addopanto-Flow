

# Combined Fix: Global Data Visibility & Moderator Settings Access

This plan addresses two issues:
1. **New users cannot see platform data** - currently all data tables are restricted to user_id filtering
2. **Moderators cannot access the Settings page** - a loading state issue with role detection

---

## Issue 1: Global Data Visibility

### Current Problem
- All data tables have RLS policies that restrict access to `auth.uid() = user_id`
- Frontend queries also filter by the current user's ID
- Result: New users see empty dashboards with no data

### Solution Overview
We need to update both the database RLS policies and the frontend hooks to allow all authenticated users to view all platform data while maintaining proper write controls.

---

### Database Changes

**Tables to update SELECT policies:**
- `revenues`
- `expenses`  
- `expense_accounts`
- `revenue_sources`
- `allocations`
- `khata_transfers`

For each table, we will:
1. Drop the existing restrictive SELECT policy
2. Create a new SELECT policy allowing all authenticated users to read all data
3. Keep INSERT/UPDATE/DELETE policies unchanged (still restricted to owner + role-based controls)

**Example migration pattern:**
```sql
-- Drop existing SELECT-only policy
DROP POLICY IF EXISTS "Users can view own revenues" ON public.revenues;

-- Create new shared SELECT policy
CREATE POLICY "Authenticated users can view all revenues"
ON public.revenues 
FOR SELECT 
TO authenticated 
USING (true);
```

---

### Frontend Changes

**Files to modify:**

| File | Change |
|------|--------|
| `src/hooks/useRevenues.ts` | Remove `.eq("user_id", user.id)` from SELECT query |
| `src/hooks/useExpenses.ts` | Remove `.eq("user_id", user.id)` from SELECT query |
| `src/hooks/useRevenueSources.ts` | Remove user_id filter from SELECT query |
| `src/hooks/useExpenseAccounts.ts` | Remove user_id filter from SELECT query |
| `src/hooks/useKhataTransfers.ts` | Remove user_id filter from SELECT query |

**Query Key Updates:**
Change from user-specific to shared keys:
```typescript
// Before
queryKey: ["revenues", user?.id]

// After  
queryKey: ["revenues"]
```

**INSERT operations remain unchanged** - they still set `user_id: user.id` to maintain ownership tracking.

---

## Issue 2: Moderator Settings Access

### Current Problem
When a moderator navigates to `/settings`, they may experience issues because:
1. The `RoleContext` combines loading states from both `useUserRole` and `useModeratorPermissions`
2. The `SettingsPage` component starts fetching user profile data immediately
3. If role data hasn't loaded when the page renders, it can cause race conditions

### Solution Overview
Add proper loading state handling to the SettingsPage to ensure the role context is fully loaded before attempting to render or fetch data.

---

### SettingsPage Changes

Add loading state awareness from RoleContext:

```typescript
// Add at top of component
const { isLoading: roleLoading } = useRole();

// In the loading check, also wait for role
if (loading || roleLoading) {
  return <LoadingSpinner />;
}
```

This ensures:
- The role data is fully loaded before rendering the settings form
- No race conditions between auth state and role state
- Moderators see the settings page properly once all data is ready

---

## Security Summary

After these changes:

| Action | Who Can Do It |
|--------|---------------|
| **View** all revenues, expenses, etc. | All authenticated users |
| **Add** new entries | Based on role (Cipher, Admin, Moderator with permissions, User) |
| **Edit** entries | Cipher, Admin, or data owner |
| **Delete** entries | Cipher, Admin, or data owner |
| **Access Settings** | All authenticated users (their own profile only) |
| **Manage Users** | Cipher and Admin only |
| **Control Moderator Permissions** | Cipher and Admin only |

---

## Implementation Order

1. **Database Migration** - Update RLS SELECT policies for all data tables
2. **Frontend Hooks** - Remove user_id filters from read queries
3. **SettingsPage** - Add role loading state check
4. **Testing** - Verify moderators can access settings and all users see shared data

