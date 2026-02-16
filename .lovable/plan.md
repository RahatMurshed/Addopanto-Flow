
# Fix: Cipher/Admin Seeing Moderator Dashboard

## Problem

Your account (`technoboa1@gmail.com`) has `role = "moderator"` in the `company_memberships` table. This happened during the role migration. Because of this, the Dashboard code sees `isModerator = true` and shows the simplified "quick actions only" view instead of the full financial dashboard with charts and metrics.

## Root Cause

Two issues:
1. **Data issue**: Your membership was incorrectly migrated to `moderator` instead of `admin`
2. **Logic issue**: `isModerator` in `CompanyContext.tsx` returns `true` for anyone with `role = "moderator"`, even if they're also a Cipher (platform superadmin). Pages like Dashboard check `if (isModerator)` before rendering, which catches Ciphers who happen to have a moderator membership.

## Fix

### 1. Database Fix
Update your membership role back to `admin`:
```sql
UPDATE company_memberships
SET role = 'admin'
WHERE user_id = '0889e961-b2d6-4abe-b201-bdf98966adae';
```

Also check if any other Cipher users were incorrectly migrated and fix them too.

### 2. Logic Fix in `CompanyContext.tsx`
Change the `isModerator` definition so it excludes Admins and Ciphers:
```typescript
const isModerator = membership?.role === "moderator" && !isCompanyAdmin;
```
This ensures that even if a Cipher/Admin somehow has a moderator membership, they won't get the restricted moderator view.

### 3. Dashboard and Other Pages
No changes needed to page files -- once `isModerator` correctly returns `false` for Admins/Ciphers, all the existing `if (isModerator)` guards will work properly.

## Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Fix membership role for Cipher users |
| `src/contexts/CompanyContext.tsx` | Add `&& !isCompanyAdmin` to `isModerator` definition |
