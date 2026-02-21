

## Fix "Unknown Member" on the Members Page

### Root Cause
The Members page fetches user names/emails from the `user_profiles` table. However, most company members **have no profile record** -- only 2 out of 7+ members have a `user_profiles` row. Members without profiles show as "Unknown Member".

This happened because those users were created before the `handle_new_user` database trigger existed, so their profiles were never auto-generated.

### Solution (Two Parts)

#### Part 1: Backfill Missing Profiles (One-Time Fix)
Create a temporary backend function that:
1. Reads all users from the auth system (using admin privileges)
2. Checks which ones are missing a `user_profiles` row
3. Creates the missing profile rows using email and name from auth metadata
4. Deletes itself after use

#### Part 2: Defensive UI Fallback (Permanent Fix)
Update `CompanyMembers.tsx` so that if a profile is still missing, the page shows the user's email or user ID snippet instead of "Unknown Member". This prevents the issue from recurring for any future edge cases.

### Technical Details

**New file**: `supabase/functions/backfill-profiles/index.ts`
- Uses `SUPABASE_SERVICE_ROLE_KEY` to call `auth.admin.listUsers()`
- For each auth user without a matching `user_profiles` row, inserts a profile with their email and display name
- Returns a summary of how many profiles were created

**Modified file**: `src/pages/CompanyMembers.tsx`
- Update line 308: Change the fallback from `"Unknown Member"` to show `getEmail(member.user_id)` or a truncated user ID, so even without a profile the member is identifiable
- Update `getEmail` fallback to show user ID snippet when both name and email are unavailable

**Cleanup**: After running the backfill function, delete it (same pattern as the test user function).

### Impact
- All existing members will get proper profile records with their emails/names
- The Members page will display real names and emails instead of "Unknown Member"
- Future users are already covered by the `handle_new_user` trigger
- No changes to permissions or security model

