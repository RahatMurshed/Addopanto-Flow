

## Create Test Cipher Account

### What will happen
A one-time backend function will be created to set up a test account with these credentials:
- **Email**: cipher@app.com
- **Password**: cipher123
- **Role**: Cipher (superadmin)
- **Email verification**: Skipped (auto-confirmed)

### Implementation

#### Step 1: Create a setup edge function
Create `supabase/functions/create-test-user/index.ts` that:
1. Uses the admin API to create a user with `email_confirm: true` (skips verification)
2. Ensures the `cipher` role is assigned in `user_roles`
3. Returns success/error status
4. Only works once (checks if user already exists)

#### Step 2: Call the function
After deploying, the function will be invoked to create the account.

#### Step 3: Clean up
The function can be deleted after use since it's a one-time setup tool.

### Technical Details

**Edge function** (`supabase/functions/create-test-user/index.ts`):
- Uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY` for admin privileges
- Calls `auth.admin.createUser({ email, password, email_confirm: true })` to create user without verification
- The existing `handle_new_user` database trigger will auto-create the profile and assign the `user` role
- After user creation, updates the role to `cipher` in `user_roles`
- Protected: only callable once (returns error if user already exists)

**No frontend changes needed** -- this is a backend-only operation.

