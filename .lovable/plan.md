

## Fix: Auth Issues (Google redirect loop, invalid credentials, email verification)

### Root Causes Found

1. **Google login redirects back to auth**: The `handle_new_user` trigger is **missing** from `auth.users`. The function exists, but no trigger calls it. So when a new Google user signs up, no `user_profiles` or `user_roles` records are created. After ~30 seconds the app's safety check detects "no role" and forces a logout.

2. **"Invalid credentials" on email login**: The auth logs confirm a `400: Invalid login credentials` response. Since the admin user's profile and role records now exist (from our earlier fix), the issue is likely that email confirmation is required and the password may need resetting, or the credentials are simply incorrect.

3. **Email verification blocking signups**: New users must verify email before they can sign in. The user wants this disabled.

### Plan

**Step 1: Re-create the missing database trigger**

Run a migration to attach the `handle_new_user` function to `auth.users`:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This ensures every new user (Google, Apple, or email) automatically gets `user_profiles` and `user_roles` records.

**Step 2: Fix the existing Google user**

Insert missing records for `rahatmurshed01@gmail.com` (user ID `ac88fbed-1eb2-4e6a-82d2-f5d998b2a03f`):

```sql
INSERT INTO public.user_profiles (user_id, email, full_name)
VALUES ('ac88fbed-1eb2-4e6a-82d2-f5d998b2a03f', 'rahatmurshed01@gmail.com', 'Rahat Murshed')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('ac88fbed-1eb2-4e6a-82d2-f5d998b2a03f', 'user')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Step 3: Enable auto-confirm for email signups**

Use the configure-auth tool to disable email confirmation, so new users can sign in immediately after creating an account.

### Technical Details

- **Files modified**: None (database-only changes + auth config)
- **Database changes**: Re-create trigger on `auth.users`, insert missing user data
- **Auth config**: Enable auto-confirm for email signups
- **No breaking changes**: All existing users are unaffected

