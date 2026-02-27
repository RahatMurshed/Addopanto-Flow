

# Fix: Rejected Request Visibility and Persistent Dismissal

## Problems Found

1. **Cipher users see everyone's rejected requests**: The rejected creation requests query (line 78) doesn't filter by `user_id`. RLS allows cipher users to see ALL rows, so cipher users see rejection messages meant for other users.

2. **Same issue with pending creation requests query** (line 63): No `user_id` filter -- cipher users see all pending requests too.

3. **Dismissals don't persist**: Both `dismissedRejections` and `dismissedCreationRejections` use React `useState`, so dismissed cards reappear every time the user refreshes or logs in.

## Solution

### 1. Add `user_id` filter to creation request queries

Add `.eq("user_id", user.id)` to both the pending and rejected creation request queries so each user only sees their own requests, regardless of RLS.

### 2. Persist dismissals in `localStorage`

Replace `useState` with `localStorage`-backed state for both `dismissedRejections` and `dismissedCreationRejections`. Use a user-specific key (e.g., `dismissed-join-rejections-{userId}` and `dismissed-creation-rejections-{userId}`) so dismissals are per-user and survive page refreshes and logins.

## Technical Details

### File: `src/pages/CompanySelection.tsx`

**Query fixes (lines 60-87):**
- Add `.eq("user_id", user.id)` to the pending creation requests query (line 66)
- Add `.eq("user_id", user.id)` to the rejected creation requests query (line 81)

**Dismissal persistence (lines 21-22, 240-246):**
- Initialize `dismissedRejections` from `localStorage` using key `dismissed-join-rejections-${user?.id}`
- Initialize `dismissedCreationRejections` from `localStorage` using key `dismissed-creation-rejections-${user?.id}`
- Update the dismiss handlers to write to `localStorage` in addition to state
- Read from `localStorage` on mount (lazy initializer in `useState`)

No database changes required.

