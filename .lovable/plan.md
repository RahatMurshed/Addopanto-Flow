

# Add User Name to Signup, Members, and User Management

## Overview

Currently the app only collects email and password during signup. This plan adds a **full name** field to the registration flow and displays it across the Members and User Management pages. It also addresses the placement of the User Management page.

---

## Part 1: Add Name to Signup

### Database Change
- Add a `full_name` text column (nullable) to the `user_profiles` table
- Update the `handle_new_user()` trigger to accept and store the name from `auth.users.raw_user_meta_data`

### Signup Form Changes (Auth.tsx)
- Add a "Full Name" input field above the email field in the Sign Up tab
- Pass the name as `user_metadata` in the `signUp` call:
  ```text
  supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
  ```
- The trigger will read `NEW.raw_user_meta_data->>'full_name'` and store it in `user_profiles`
- Google OAuth users will have their name extracted from the Google profile automatically

### AuthContext Update
- Update the `signUp` function signature to accept an optional `fullName` parameter
- Pass it through as `options.data.full_name`

---

## Part 2: Display Name in Members Page (CompanyMembers.tsx)

- Update the member profiles query to also fetch `full_name` from `user_profiles`
- Show the name as the primary identifier in the Member column, with email below it in smaller text
- Fall back to email if no name is set

---

## Part 3: Display Name in User Management Page

### Edge Function Update (admin-users/index.ts)
- When listing users in the GET handler, also fetch `full_name` from `user_profiles` and include it in the response
- Alternatively, read the name from `auth.users.user_metadata.full_name`

### UI Update (UserManagement.tsx)
- Show the user's name as the primary label in the User column, with email below
- Update the search to also filter by name

---

## Part 4: User Management Page Placement

The current separation is actually well-designed for your system:

- **User Management** (global, platform-level): Manages platform roles (Cipher, Admin, Moderator). Only visible to platform Admins and Ciphers. This controls *who can do what across the entire platform*.
- **Members** (company-scoped): Manages workspace membership and per-company permissions. This controls *who can do what within a specific company*.

**Recommendation**: Keep them separate. They serve different purposes in the dual-layer role hierarchy. The User Management page is for platform governance, while Members is for day-to-day company operations. Moving User Management into a company dashboard would blur these responsibilities and could create confusion about scope.

One small improvement: rename the sidebar label from "User Management" to "Platform Users" to make the distinction clearer.

---

## Technical Details

### Migration SQL
```text
ALTER TABLE public.user_profiles ADD COLUMN full_name text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  -- Updated to read full_name from raw_user_meta_data
  -- and store it in user_profiles.full_name
```

### Files to Create/Modify
1. **New migration** -- add `full_name` column and update trigger
2. **src/contexts/AuthContext.tsx** -- update `signUp` to accept and pass `fullName`
3. **src/pages/Auth.tsx** -- add name input field to signup form
4. **src/pages/CompanyMembers.tsx** -- fetch and display `full_name`
5. **src/pages/UserManagement.tsx** -- display name in user table, update search
6. **supabase/functions/admin-users/index.ts** -- include `full_name` in GET response
7. **src/components/AppLayout.tsx** -- rename "User Management" to "Platform Users" (optional)

