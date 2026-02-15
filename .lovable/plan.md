

# Remove Platform Approval + Company Creation Requests

## Overview

This plan covers two features (auto-logout was skipped per your choice):

1. **Remove platform-level user approval** -- users sign up and immediately get access to browse/join companies
2. **Company creation request system** -- any user can request creating a company, Cipher reviews and approves

---

## Feature 1: Remove Platform-Level User Approval

### What Changes

Currently, when a user signs up, a `registration_requests` record is created with status "pending", they are immediately signed out, and must wait for Cipher/Admin approval before they can log in. This entire flow gets removed.

### Auth Page (`src/pages/Auth.tsx`)

- **Remove** the ban check, pending check, and rejection check during login (`checkBan`, `BanMessage`, `PendingMessage`, `RejectionMessage`)
- **Remove** the `RegistrationSuccess` component showing "Awaiting Admin Approval"
- **Remove** the post-signup `signOut()` call -- user stays logged in after signup
- After signup, navigate directly to `/companies` instead of showing waiting screen
- Keep password validation, avatar upload, Google/Apple OAuth, and password reset as-is

### Auth Context (`src/contexts/AuthContext.tsx`)

- **Remove** the periodic session validation that checks `registration_requests` status and force-logs out pending/rejected users (lines ~62-100)
- Keep the `user_roles` deletion listener for company-level user removal

### Registration Status Hook and Page

- **Delete** `src/hooks/useRegistrationStatus.ts` -- no longer needed
- **Delete** `src/pages/PendingApproval.tsx` -- no longer needed

### Pending Requests Count (`src/hooks/usePendingRequestsCount.ts`)

- **Remove** this hook entirely since platform-level registration requests are gone
- Update `AppLayout.tsx` to remove the pending badge from the "Requests" nav item (it now refers to company join requests only)

### Company Selection Page (`src/pages/CompanySelection.tsx`)

- **Remove** the `NoCompaniesSection` component that shows "Pending Approval" or "Access Denied" based on `registration_requests`
- When user has no companies, show a simple message with "Join a Business" and "Request to Create Business" buttons
- Remove the registration status queries

### Registration Requests Page (`src/pages/RegistrationRequests.tsx`)

- **Replace entirely** -- this page currently shows platform-level registration requests
- Rename to show only **Company Join Requests** for the active company (which is already handled by `CompanyJoinRequests.tsx` on the Members page)
- Alternatively, redirect `/requests` to the Members page Join Requests tab, or repurpose for Company Creation Requests (see Feature 2)

### Edge Functions

- **`check-ban`** edge function: can be simplified or removed (only needed for company-level bans now, which are handled in `company-join`)
- **`admin-users`** edge function: Remove `approve`, `reject`, `accept-rejected`, `permanent-delete` actions related to `registration_requests`. Keep the `delete` action and user listing for the Platform Users page.

### Database

- The `registration_requests` table can remain for now (no data migration needed), but new signups will no longer create records in it
- The signup trigger that creates registration_requests records needs to be removed or modified

### User Roles

- On signup, insert a `user_roles` record with role `user` immediately (so they can access the app)
- This replaces the current flow where roles are only assigned after admin approval

### Navigation Updates (`src/components/AppLayout.tsx`)

- Remove the "Requests" nav item for platform-level registration requests
- Keep the Members page with its Join Requests tab for company-level requests
- Add "Company Requests" nav item for Cipher (see Feature 2)

---

## Feature 2: Company Creation Request System

### New Database Table

```text
company_creation_requests
  id                 uuid      PK, default gen_random_uuid()
  user_id            uuid      NOT NULL (references auth.users)
  company_name       text      NOT NULL
  company_slug       text      NOT NULL
  description        text      nullable
  logo_url           text      nullable
  industry           text      nullable
  estimated_students integer   nullable
  contact_email      text      nullable
  contact_phone      text      nullable
  reason             text      nullable
  status             text      NOT NULL, default 'pending'
  rejection_reason   text      nullable
  reviewed_by        uuid      nullable
  reviewed_at        timestamptz nullable
  created_at         timestamptz NOT NULL, default now()
```

RLS policies:
- Users can INSERT their own requests (`user_id = auth.uid()`)
- Users can SELECT their own requests
- Cipher can SELECT all requests
- Cipher can UPDATE requests (approve/reject)

### New Edge Function Action: `approve-company-creation`

Add to `company-join` edge function:
- Verify caller is Cipher
- Create the company (same as `create-company` action)
- Assign requesting user as company admin with full permissions
- Update request status to "approved"

### New Edge Function Action: `reject-company-creation`

- Verify caller is Cipher
- Update request status to "rejected" with reason

### Company Selection Page Updates

- Add "Request to Create Business" button alongside "Join Business"
- Clicking opens a modal/page with the creation request form
- Form fields: company name, slug (auto-generated), description, industry, estimated students, contact email, contact phone, reason, logo upload
- On submit, insert into `company_creation_requests` and show success toast
- Show "Pending Company Requests" section if user has any pending requests

### New Page: Company Creation Requests (`src/pages/CompanyCreationRequests.tsx`)

- Accessible only to Cipher role
- Table showing all pending requests with user avatar/name, company name, date, industry, actions
- View detail modal showing all request fields
- Approve button: creates company, assigns user as admin, updates status
- Reject button: modal for rejection reason, updates status

### Navigation

- Add "Company Requests" nav item for Cipher in sidebar with pending count badge

---

## Technical Details

### Files to Create
- `src/pages/CompanyCreationRequests.tsx` -- Cipher review page
- `src/components/CompanyCreationRequestForm.tsx` -- Request form component

### Files to Modify
- `src/pages/Auth.tsx` -- Simplify signup/login flow
- `src/contexts/AuthContext.tsx` -- Remove registration status checks
- `src/pages/CompanySelection.tsx` -- Add creation request button, remove platform approval UI
- `src/components/AppLayout.tsx` -- Update navigation items
- `src/App.tsx` -- Add routes, remove PendingApproval route
- `supabase/functions/company-join/index.ts` -- Add creation request approve/reject actions
- `supabase/functions/admin-users/index.ts` -- Remove registration request actions

### Files to Delete
- `src/hooks/useRegistrationStatus.ts`
- `src/pages/PendingApproval.tsx`
- `src/hooks/usePendingRequestsCount.ts`

### Database Migrations
1. Create `company_creation_requests` table with RLS
2. Create or modify the auth trigger to assign `user_roles` role `user` immediately on signup instead of creating a `registration_requests` record
3. Enable realtime on `company_creation_requests` for live updates

### Edge Function Changes
- `company-join`: Add `request-company-creation`, `approve-company-creation`, `reject-company-creation` actions
- `admin-users`: Clean up registration request related actions
- `check-ban`: Simplify to only handle company-level bans (or remove entirely since company-join handles its own ban checks)

### Risks and Mitigations
- **Existing pending users**: Users who registered under the old system and are still "pending" will need a one-time migration to assign them `user` role so they can log in
- **Registration requests table**: Not dropped immediately -- kept for historical data but no longer used for new signups
- **Edge function deployment order**: Database migration must run before edge function changes to avoid referencing non-existent tables

