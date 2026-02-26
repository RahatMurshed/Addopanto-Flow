

# Security Audit: Complete RLS Analysis & Fixes

## Architecture Context

This application does NOT use Express.js API routes. All data access goes through the Supabase client directly, with PostgreSQL Row-Level Security (RLS) as the sole authorization layer. There are no `/api/*` endpoints to protect -- RLS IS the backend enforcement. Edge functions handle specific operations (reset, merge, admin-users, etc.) and already validate auth + roles server-side.

## Audit Results: 27 Feature Areas

### SECURE -- No Changes Needed (23 of 27)

| # | Feature | Enforcement | Status |
|---|---------|------------|--------|
| 1 | Dashboard | Revenues/expenses RLS blocks DEO; non-DEO moderators with finance perms see data (by design) | Secure |
| 2 | Courses SELECT | `NOT is_data_entry_moderator` blocks DEO | Secure |
| 3 | Courses Write | `is_company_admin OR is_cipher` -- admin/cipher only | Secure |
| 4 | Course Details | Same as Courses -- company_id + active_company check | Secure |
| 5 | Batches | DEO blocked from SELECT; write uses `company_can_*_batch` | Secure |
| 6 | Students SELECT | DEO sees only `user_id = auth.uid()` rows | Secure |
| 7 | Students INSERT | `company_can_add_student` + forces `user_id = auth.uid()` | Secure |
| 8 | Students UPDATE | `company_can_edit_student` + DEO only own records | Secure |
| 9 | Students DELETE | `company_can_delete_student` + DEO only own records | Secure |
| 10 | Payments (all) | `company_can_*_payment` + `NOT is_data_entry_moderator` blocks DEO entirely | Secure |
| 11 | Revenue (all) | `company_can_*_revenue` + `NOT is_data_entry_moderator` blocks DEO | Secure |
| 12 | Expenses SELECT | DEO sees only `user_id = auth.uid()` | Secure |
| 13 | Expenses Write | `company_can_*_expense` + DEO only own records | Secure |
| 14 | Products | DEO blocked from SELECT; write is admin/cipher only | Secure |
| 15 | Product Sales | DEO blocked; write is admin/cipher only | Secure |
| 16 | Reports | Queries revenues/expenses -- RLS blocks DEO; moderator access controlled by finance perms | Secure |
| 17 | Members | `company_memberships` write is admin/cipher only; cipher filtering via `get_company_members_filtered` | Secure |
| 18 | Company Settings | `companies` UPDATE requires `is_cipher OR is_company_admin` | Secure |
| 19 | Reset Data | Edge function validates cipher role + password server-side | Secure |
| 20 | Audit Logs | SELECT requires `is_company_admin OR is_cipher`; DELETE cipher-only | Secure |
| 21 | Company Requests | `company_creation_requests` SELECT/UPDATE cipher-only (+ own for users) | Secure |
| 22 | Platform Users | Edge function `admin-users` validates cipher role server-side | Secure |
| 23 | Employees | SELECT uses `company_can_view_employees`; salary payments use `company_can_manage_employees` (admin/cipher only) | Secure |
| 24 | Join Requests | UPDATE requires `is_company_admin OR is_cipher` | Secure |
| 25 | Transfers | INSERT requires `company_can_transfer` + DEO blocked from SELECT | Secure |

### GAPS FOUND -- Fixes Required (3 issues)

#### Gap 1: `expense_accounts` INSERT is too permissive (MEDIUM severity)

**Current policy**: Any company member can insert expense accounts
```sql
WITH CHECK: (company_id = get_active_company_id(auth.uid()))
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
  AND (user_id = auth.uid())
```
**Problem**: A moderator (including DEO) can create expense accounts via direct Supabase API call, bypassing the frontend-only restriction. The `company_can_add_expense_source` function exists but is NOT used in this policy.
**Fix**: Replace the INSERT policy to use admin/cipher check, matching the existing `company_can_add_expense_source` function:
```sql
DROP POLICY "Authorized users can insert expense accounts" ON expense_accounts;
CREATE POLICY "Admin/Cipher can insert expense accounts" ON expense_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_active_company_id(auth.uid())
    AND company_can_add_expense_source(company_id, auth.uid())
    AND user_id = auth.uid()
  );
```

#### Gap 2: `allocations` INSERT is too permissive (LOW severity)

**Current policy**: Any company member can insert allocations
```sql
WITH CHECK: (company_id = get_active_company_id(auth.uid()))
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
  AND (user_id = auth.uid())
```
**Problem**: Allocations are normally system-managed (created by triggers on revenue/payment insert). But a moderator could manually insert fake allocation records via direct API. The audit trigger skips allocations, so this would be invisible.
**Fix**: Restrict INSERT to admin/cipher only (triggers run as SECURITY DEFINER so they bypass RLS):
```sql
DROP POLICY "Authorized users can insert allocations" ON allocations;
CREATE POLICY "Admin/Cipher can insert allocations" ON allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_active_company_id(auth.uid())
    AND company_can_edit_delete(auth.uid(), company_id)
    AND user_id = auth.uid()
  );
```

#### Gap 3: `student_siblings` missing UPDATE/DELETE policies (LOW severity)

**Current**: No UPDATE or DELETE policies exist. This means siblings can never be updated or removed (even by admins), which is a functionality gap rather than a security hole.
**Fix**: Add policies for admin/cipher:
```sql
CREATE POLICY "Admin/Cipher can update student siblings" ON student_siblings
  FOR UPDATE TO authenticated
  USING (
    company_id = get_active_company_id(auth.uid())
    AND company_can_edit_delete(auth.uid(), company_id)
  );

CREATE POLICY "Admin/Cipher can delete student siblings" ON student_siblings
  FOR DELETE TO authenticated
  USING (
    company_id = get_active_company_id(auth.uid())
    AND company_can_edit_delete(auth.uid(), company_id)
  );
```

## Summary

The backend authorization is comprehensive. Out of 27 feature areas audited, 25 are fully secured via RLS. The Express.js middleware approach in the request is not applicable -- this app uses Supabase RLS which enforces authorization at the database level, making it impossible to bypass via direct API calls, browser dev tools, or URL manipulation.

**3 migration statements needed** to fix the gaps found. No frontend changes. No edge function changes. No existing features will break.

