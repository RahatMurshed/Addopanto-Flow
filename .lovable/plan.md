
# Fix All Detected Errors

## Errors Found

### Error 1: Realtime Not Enabled for `user_roles` Table (Critical)
The `AuthContext.tsx` has a Realtime listener on `user_roles` to force logout deleted users, but Realtime is NOT enabled for any table. The listener silently does nothing -- deleted users keep their active sessions.

**Fix**: Run a database migration to add `user_roles` to the `supabase_realtime` publication.

### Error 2: Duplicate/Wasted API Call in UserManagement (Bug)
In `src/pages/UserManagement.tsx` lines 84-90, there is an unused `supabase.functions.invoke("admin-users")` call that fires before the actual `fetch()` call on line 93. This means every page load makes TWO requests to the edge function -- one is completely discarded. This wastes resources and slows down the page.

**Fix**: Remove the unused `supabase.functions.invoke` call (lines 84-90) and keep only the `fetch()` call.

### Error 3: ModeratorControl Shows No Emails for Other Moderators (Bug)
In `src/pages/ModeratorControl.tsx` line 163, moderator emails are only set for the current user. All other moderators show their UUID instead of email, making it impossible to identify them.

**Fix**: Fetch moderator emails from `user_profiles` table (which stores emails) and join with the user_roles query.

### Error 4: `useAccountBalances` Missing Pagination Guard (Minor)
All queries to `expenses`, `allocations`, etc. have no `.limit()` -- Supabase defaults to 1000 rows. For users with more than 1000 transactions, data will be silently truncated, producing incorrect balances.

**Fix**: Not critical now but worth noting. No change for this round.

---

## Implementation Plan

### Step 1: Database Migration -- Enable Realtime for `user_roles`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
```

### Step 2: Fix UserManagement Duplicate Call
**File**: `src/pages/UserManagement.tsx`

Remove the unused `supabase.functions.invoke` block (lines 84-90) so only the paginated `fetch()` call remains.

### Step 3: Fix ModeratorControl Missing Emails
**File**: `src/pages/ModeratorControl.tsx`

Update the moderators query to also fetch emails from `user_profiles`:
```typescript
const { data: profiles } = await supabase
  .from("user_profiles")
  .select("user_id, email");

// Map emails to moderators
return data.map(m => ({
  user_id: m.user_id,
  email: profiles?.find(p => p.user_id === m.user_id)?.email || null,
  created_at: m.created_at,
}));
```

---

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | Database migration | Enable Realtime on `user_roles` |
| 2 | `src/pages/UserManagement.tsx` | Remove unused `supabase.functions.invoke` call |
| 3 | `src/pages/ModeratorControl.tsx` | Fetch moderator emails from `user_profiles` |
