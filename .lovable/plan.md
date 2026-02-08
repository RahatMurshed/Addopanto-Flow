

# User Registration Approval System

This plan implements a complete registration approval workflow where new users must request access and wait for Admin/Cipher approval before gaining access to the application.

## Overview

When a new user registers:
1. They create a "pending" registration request instead of getting immediate access
2. They see a "Pending Approval" screen after registration
3. Admins and Ciphers see pending requests in a new approval interface
4. When approving, admins can set the user's permissions (for moderator access)
5. Approved users become moderators by default with configured permissions
6. Rejected requests are removed from the system entirely (auth + database)

## Database Changes

### 1. New Table: `registration_requests`

```sql
CREATE TABLE public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT,
  -- Pre-configured permissions (set during approval)
  can_add_revenue BOOLEAN NOT NULL DEFAULT true,
  can_add_expense BOOLEAN NOT NULL DEFAULT true,
  can_view_reports BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
```

### 2. RLS Policies for `registration_requests`

- **Users can view their own request**: For showing pending status
- **Admins/Ciphers can view all pending requests**: For the approval interface
- **Admins/Ciphers can update requests**: For approve/reject actions
- **Users can insert their own request**: Created during signup

### 3. Update `handle_new_user` Trigger

Instead of automatically assigning the "user" role, the trigger will:
1. Create the user_profiles entry (as before)
2. Create a registration_request with status = 'pending'
3. NOT create a user_roles entry (no role until approved)

## Edge Function Updates

### Update `admin-users` Edge Function

Add new endpoints:
- **GET with `?pending=true`**: List all pending registration requests
- **POST with `action: 'approve'`**: Approve a request, set role to moderator, create permissions
- **POST with `action: 'reject'`**: Reject a request and delete user from auth

## Frontend Changes

### 1. New Component: `PendingApprovalPage.tsx`

A waiting screen shown to users whose registration is pending:
- Shows "Your registration is pending approval" message
- Option to sign out
- Polls periodically to check if approved

### 2. Update Auth Flow in `App.tsx`

After authentication, check if user has a role:
- If no role exists, check for pending registration_request
- If pending, show `PendingApprovalPage`
- If approved, proceed normally
- If rejected (shouldn't happen - user deleted), show error

### 3. New Page: `RegistrationRequests.tsx`

Admin interface showing:
- Table of pending registration requests with email, requested date
- For each request: Approve / Reject buttons
- Approve opens a dialog to configure permissions before confirming
- Reject shows confirmation dialog with optional reason

### 4. Update Navigation

Add "Requests" link in sidebar for Admin/Cipher users (with badge showing count)

### 5. Update User Deletion

Ensure that when deleting a user:
- User is deleted from auth.users (already implemented)
- Cascade deletes handle registration_requests automatically (via foreign key)

## Detailed Component Breakdown

### PendingApprovalPage Component
```
- Logo and app name
- "Registration Pending" heading
- Description: "Your account is awaiting approval from an administrator"
- Sign Out button
- Auto-refresh every 10 seconds to check status
```

### RegistrationRequests Page
```
- Header: "Registration Requests"
- Tabs: Pending | Approved | Rejected (optional, could show history)
- Table columns: Email | Requested | Actions
- Approve button opens dialog with:
  - Permission toggles (same as ModeratorPermissionsCard)
  - Confirm Approve button
- Reject button opens confirmation dialog
```

### Approval Flow
```
1. Admin clicks Approve on a pending request
2. Dialog appears with permission toggles (pre-checked by default)
3. Admin adjusts permissions as needed
4. Clicks "Approve & Grant Access"
5. Backend:
   a. Updates registration_request status to 'approved'
   b. Creates user_roles entry with role = 'moderator'
   c. Creates moderator_permissions entry with selected permissions
6. User's next status check redirects them to dashboard
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[new].sql` | Create | Add registration_requests table, RLS policies, update trigger |
| `supabase/functions/admin-users/index.ts` | Modify | Add pending requests list, approve/reject handlers |
| `src/pages/PendingApproval.tsx` | Create | Waiting screen for pending users |
| `src/pages/RegistrationRequests.tsx` | Create | Admin approval interface |
| `src/App.tsx` | Modify | Add route for /pending and /requests, update ProtectedRoute logic |
| `src/components/AppLayout.tsx` | Modify | Add Requests nav link with pending count badge |
| `src/hooks/useRegistrationStatus.ts` | Create | Hook to check if user is pending/approved |
| `src/contexts/AuthContext.tsx` | Modify | Add registration status check |

## Security Considerations

1. **Pending users cannot access any protected routes** - they're blocked at the ProtectedRoute level
2. **Only Admin/Cipher can approve/reject** - enforced via RLS and edge function checks
3. **Rejected users are fully deleted** - no orphan accounts in auth.users
4. **Cipher users remain invisible** - approval requests don't expose cipher status

## Technical Notes

- The `registration_requests` table uses a foreign key to `auth.users` with CASCADE delete, so if an auth user is deleted, their request is automatically cleaned up
- Polling interval of 10 seconds balances user experience with server load
- Approved users get the "moderator" role as specified, with permissions pre-configured during approval

