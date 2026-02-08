

# Fix Registration Approval Flow - Updated Plan

This plan fixes the registration approval system to ensure:
1. New users CANNOT access the app until approved - they stay on pending screen
2. Rejected users are IMMEDIATELY logged out
3. Approved users become **Moderators only** with permissions set during approval
4. Quick action buttons (Add Revenue/Expense/Transfer) only show if moderator has those specific permissions

---

## Core Problem Analysis

The current system has these issues:

1. **`useUserRole` defaults to "user" role** - When no role is found in `user_roles`, it returns `"user"` as default
2. **RoleContext grants permissions to "user"** - The logic `canAddRevenue = ... || isUser` gives pending users full access
3. **No force logout on rejection** - When admin rejects, the user's session remains active
4. **Dashboard buttons always visible** - Quick actions aren't wrapped with permission guards

---

## Solution

### Flow After Fix

```text
New User Registers
       |
       v
Trigger creates: user_profiles + registration_requests (status=pending)
NO user_roles entry created
       |
       v
User logs in -> useUserRole finds NO role -> returns null, hasNoRole=true
       |
       v  
useRegistrationStatus finds pending request -> status="pending"
       |
       v
ProtectedRoute redirects to /pending (blocked from app)
       |
       v
[Admin Approves]
  - Creates user_roles with role="moderator"
  - Creates moderator_permissions with configured permissions
       |
       v
User's poll detects has_role -> redirects to Dashboard
User sees buttons ONLY for permissions they were granted
```

---

## File Changes

### 1. Update `src/hooks/useUserRole.ts`

**What changes:**
- Return `null` instead of `"user"` when no role found in database
- Add `hasNoRole` boolean flag to indicate pending status
- `isUser` only true when role is explicitly `"user"` from database

**Key logic change:**
```typescript
// Before: return (data?.role as AppRole) ?? "user";
// After: return data?.role as AppRole | null ?? null;

const role = userRole; // Can be null now
const hasNoRole = role === null;
const isUser = role === "user"; // Only true if DB says "user"
```

### 2. Update `src/contexts/RoleContext.tsx`

**What changes:**
- Import `hasNoRole` from useUserRole
- Block ALL permissions when user has no role
- Permissions only granted to confirmed role holders

**Updated permission logic:**
```typescript
// Moderator-only permissions (no "isUser" fallback)
const canAddRevenue = isCipher || isAdmin || (isModerator && modCanAddRevenue);
const canAddExpense = isCipher || isAdmin || (isModerator && modCanAddExpense);
const canViewReports = isCipher || isAdmin || (isModerator && modCanViewReports);

// Edit/Delete: Only Cipher and Admin (moderators are add-only)
const canEdit = isCipher || isAdmin;
const canDelete = isCipher || isAdmin;
```

### 3. Update `src/hooks/useRegistrationStatus.ts`

**What changes:**
- Handle `"rejected"` status by triggering automatic logout
- Import and use `signOut` from AuthContext
- When status is "rejected", call signOut() immediately

**Key additions:**
```typescript
// When rejected status detected:
if (requestData?.status === "rejected") {
  setStatus("rejected");
  // Force logout will happen in PendingApproval component
}
```

### 4. Update `src/pages/PendingApproval.tsx`

**What changes:**
- Handle rejected status with auto-logout
- Show rejection message briefly before logging out
- Ensure pending users cannot navigate away

**Key additions:**
```typescript
useEffect(() => {
  if (status === "rejected") {
    toast({ title: "Access Denied", description: "Your registration was rejected." });
    setTimeout(async () => {
      await signOut();
      navigate("/auth");
    }, 2000);
  }
}, [status]);
```

### 5. Update `src/pages/Dashboard.tsx`

**What changes:**
- Import `PermissionGuard` from RoleGuard
- Wrap quick action buttons with appropriate permission guards
- Add Revenue button: requires `canAddRevenue`
- Add Expense button: requires `canAddExpense`
- Transfer button: requires both `canAddExpense` (transfer is an expense operation)

**Example:**
```typescript
<PermissionGuard permission="canAddRevenue">
  <Button onClick={() => setRevenueDialogOpen(true)}>
    <Plus /> Add Revenue
  </Button>
</PermissionGuard>

<PermissionGuard permission="canAddExpense">
  <Button onClick={() => setExpenseDialogOpen(true)}>
    <Plus /> Add Expense
  </Button>
</PermissionGuard>

<PermissionGuard permission="canAddExpense">
  <Button onClick={() => setTransferDialogOpen(true)}>
    <ArrowLeftRight /> Transfer
  </Button>
</PermissionGuard>
```

---

## Permission Hierarchy (Updated)

| Role | canAddRevenue | canAddExpense | canViewReports | canEdit | canDelete |
|------|---------------|---------------|----------------|---------|-----------|
| cipher | Always Yes | Always Yes | Always Yes | Yes | Yes |
| admin | Always Yes | Always Yes | Always Yes | Yes | Yes |
| moderator | If granted | If granted | If granted | No | No |
| pending (no role) | No | No | No | No | No |

---

## Summary of Changes

| File | Change Type | Purpose |
|------|-------------|---------|
| `src/hooks/useUserRole.ts` | Modify | Return null when no role, add `hasNoRole` flag |
| `src/contexts/RoleContext.tsx` | Modify | Remove "isUser" fallback from all permissions |
| `src/hooks/useRegistrationStatus.ts` | Modify | Detect rejected status for force logout |
| `src/pages/PendingApproval.tsx` | Modify | Handle rejection with auto-logout |
| `src/pages/Dashboard.tsx` | Modify | Wrap quick actions with PermissionGuard |

---

## Security Benefits

1. **Zero access for pending users** - No role = no permissions
2. **Immediate rejection enforcement** - Session terminated on rejection
3. **Granular moderator control** - Each permission explicitly granted
4. **No privilege escalation** - Moderators cannot edit/delete, only add if permitted

