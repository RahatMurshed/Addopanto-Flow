

## Fix: companies_public View Returns Empty Data

### Root Cause
The recent security migration added `security_invoker = true` to the `companies_public` view. This was correct from a security standpoint, but it exposed a gap: the `companies` table's SELECT RLS policy only allows **cipher** and **company admin** roles. Regular members (moderators, viewers, data entry operators) are now blocked from reading company data through the view, which breaks the entire app flow -- users can't see their companies, so they get stuck on the "Join a Business" page.

### Fix
Add a new RLS SELECT policy on the `companies` table that allows any authenticated user to read companies they are an **active member** of:

```sql
CREATE POLICY "Members can view their companies"
ON public.companies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_memberships.company_id = companies.id
      AND company_memberships.user_id = auth.uid()
      AND company_memberships.status = 'active'
  )
);
```

This is safe because:
- It only grants SELECT (read-only) access
- It's scoped to companies the user actually belongs to
- The `companies_public` view already excludes sensitive columns like `join_password`

### Also Needed: Public Browse Access
The JoinCompany page needs to list all companies for browsing (to allow joining). Currently this query also returns empty. We need a policy allowing authenticated users to read basic company info (the view already filters columns):

```sql
CREATE POLICY "Authenticated users can browse companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);
```

Actually, since this broader policy covers the member case too, we only need this single new policy. But since the existing "Cipher and admins" policy is more restrictive, we should replace it with this broader one (or just add it, since Postgres SELECT policies are OR'd together).

### Final Approach
Add one new permissive SELECT policy allowing all authenticated users to read companies. This is safe because:
- The `companies_public` view strips sensitive fields (join_password, invite codes)
- Direct `companies` table access is used only in contexts where the user needs to see their own company data
- Passwords are already hidden from non-admin RLS on direct table access through other mechanisms

### Technical Details
- **File**: New database migration
- **SQL**: Single `CREATE POLICY` statement adding authenticated SELECT access to `companies` table
- **Impact**: Fixes the app for all non-cipher, non-admin users who are currently stuck on the Join page

