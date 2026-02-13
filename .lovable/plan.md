

# Fix Company Members Management + Add Global User Management Route

## Problem Summary
Three issues are preventing you from managing users:

1. **Company Members page blocks managing admin-role members** -- even for cipher users who should have full control
2. **No route to the Global User Management page** (`UserManagement.tsx` exists but has no route in `App.tsx`)
3. **Navigation missing** -- no link to access global user management from the sidebar

## Changes

### 1. Fix CompanyMembers.tsx -- Allow cipher users to manage all members

**File: `src/pages/CompanyMembers.tsx`**

Currently the page has hardcoded logic:
```
const isAdmin = member.role === "admin";
// Then uses isAdmin to disable role changes and hide delete button
```

This needs to be updated so that **cipher users can manage admin members too**:
- A cipher user can change any member's role and delete any member (except themselves)
- A company admin can manage moderators and viewers, but not other admins
- The role dropdown for cipher users should include "admin", "moderator", "viewer"

### 2. Add UserManagement route to App.tsx

**File: `src/App.tsx`**
- Import `UserManagement` page
- Add route: `/users` pointing to `UserManagement` component (inside `ProtectedRoute`)

### 3. Add navigation link to UserManagement

**File: `src/components/AppLayout.tsx`**
- Add a "User Management" nav link visible only to cipher and admin users
- This is where global roles (cipher, admin, moderator) are managed

## Technical Details

### CompanyMembers.tsx changes (lines 254-296)
Replace the `isAdmin` check with a permission-aware check:
- `const canModifyMember = !isCurrentUser && (isCipher || (isCompanyAdmin && member.role !== "admin"))`
- Use `canModifyMember` to control the role dropdown and delete button
- Cipher users see all role options; non-cipher admins see moderator/viewer only

### App.tsx changes
```tsx
import UserManagement from "@/pages/UserManagement";
// Add route:
<Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
```

### AppLayout.tsx changes
- Add nav item for `/users` with a shield icon, conditionally shown for admin/cipher roles

