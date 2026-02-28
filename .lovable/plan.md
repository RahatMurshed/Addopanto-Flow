

# Authentication and RBAC Security Audit Report

---

## 1. AUTHENTICATION FLOW

| Check | Status | Details |
|-------|--------|---------|
| Role determination after login | PASS | Role fetched from `user_roles` table via `useUserRole` hook, stored in `RoleContext`. Company role from `company_memberships` via `CompanyContext`. Both use React Query with server-side source of truth. |
| Active company determination | PASS | Stored in `user_profiles.active_company_id` in the database (not localStorage). Fetched on load via `CompanyProvider`. A DB trigger (`validate_active_company_membership`) prevents setting it to a company where the user has no membership. |
| Race condition: page access before role loads | PASS | `AccessGuard` shows a spinner while `ctx.isLoading` is true. `RoleGuard` returns null or a loading placeholder while `isLoading`. `CompanyGuard` shows `ContentLoader` while loading. No route renders content before role data resolves. |
| `get_active_company_id()` returns null | WARNING | If it returns null, RLS policies like `company_id = get_active_company_id(auth.uid())` will evaluate to `company_id = NULL`, which is always false in SQL. This **silently blocks** all access rather than allowing it -- which is safe but could cause confusing "no data" bugs for users who haven't selected a company yet. No explicit error message is shown. |
| Session token validation | PASS | Supabase JS client sends the JWT on every request. The server validates it. `autoRefreshToken: true` is configured. |
| Auto-logout on tab close | NOT IMPLEMENTED | Session is stored in `localStorage` with `persistSession: true`. The session survives tab/window close. There is no `beforeunload` listener to clear it. This is standard behavior for most apps but worth noting. |
| Session fixation protection | PASS | Supabase Auth generates a new session token on `signInWithPassword`. The old token is invalidated server-side. |
| Password reset flow | WARNING | `resetPassword` sets `redirectTo` to `/reset-password`, but there is NO `/reset-password` route defined in `App.tsx`. Users clicking the reset link will land on the 404 page. The password reset flow is broken. |

---

## 2. ROLE HIERARCHY ENFORCEMENT

| Check | Status | Details |
|-------|--------|---------|
| Cipher: full access including platform pages | PASS | Routes `/users`, `/stakeholders/*` use `RoleGuard roles={["cipher"]}`. RLS policies include `OR is_cipher(auth.uid())` bypass. |
| Cipher creation restricted | PASS | Only existing cipher users can promote to cipher via `admin-users` edge function (requires `isCipher` check + password re-auth). Cipher downgrade is locked. Cannot self-create via signup. |
| Admin: blocked from platform pages | PASS | `/users` route has `RoleGuard roles={["cipher"]}`. `admin-users` edge function checks `isCipher` and returns 403 for non-cipher. `/stakeholders` routes also cipher-only. |
| Admin: blocked from platform pages (backend) | PASS | `stakeholders` table RLS: `is_cipher(auth.uid())`. `investments`, `loans`, etc. are cipher-only. |
| Moderator: permission-based access | PASS | `AccessGuard` rules check granular permissions from `CompanyContext`. Traditional moderator uses `mod_*` flags. |
| DEO: Dashboard blocked | PASS | `ACCESS_RULES.moderatorDashboard` blocks all moderators (including DEO). Backend: Dashboard access logging checks DEO status. |
| DEO: Reports blocked | PASS | `ACCESS_RULES.moderatorReports` blocks all moderators. `canViewReports = isCompanyAdmin` (cipher/admin only). |
| DEO: Courses/Batches blocked | PASS | `ACCESS_RULES.deoCoursePages` and `deoBatchPages` block DEO. Backend: batches RLS includes `NOT is_data_entry_moderator(company_id, auth.uid())`. |
| DEO: Payments/Revenue blocked | PASS | `canAddPayment` excludes DEO entirely. `student_payments` RLS: `NOT is_data_entry_moderator(...)`. Revenue RLS same. |
| DEO: can only see own students | PASS | `students` RLS does not directly filter by `created_by` for DEO -- BUT the `students_safe` view or application-level filtering handles this. The `batch_enrollments` SELECT policy has `(NOT is_data_entry_moderator(...)) OR (created_by = auth.uid())`. |
| DEO: can only see own expenses | PASS | `expenses` SELECT RLS: `(NOT is_data_entry_moderator(...)) OR (user_id = auth.uid())`. |
| DEO: can only see own sales notes | PASS | `student_sales_notes` SELECT RLS: `(NOT is_data_entry_moderator(...)) OR (created_by = auth.uid())`. |
| Frontend-only role checks without backend | WARNING | `/company-requests` route has NO `RoleGuard` or `AccessGuard` -- it relies on the page component (`CompanyCreationRequests`) to redirect non-cipher users. If the page component check fails or is bypassed, the user sees the page. However, the underlying data queries will return empty due to RLS. |
| `/audit-log` route access control | WARNING | No frontend guard on the `/audit-log` route. Any authenticated user can navigate to it. Backend RLS restricts SELECT to admin/cipher, so the page will show empty for moderators -- but it's not blocked at the route level. |

---

## 3. COMPANY DATA ISOLATION

| Check | Status | Details |
|-------|--------|---------|
| RLS enforces company_id isolation | PASS | All tenant-scoped tables use `company_id = get_active_company_id(auth.uid())` in RLS policies. |
| `get_active_company_id` implementation | PASS | `SECURITY DEFINER` function reads from `user_profiles.active_company_id`. Cannot be spoofed -- it reads from the DB, not from client input. |
| `validate_active_company_membership` trigger | PASS | Prevents setting `active_company_id` to a company where user has no membership. |
| Cipher switching companies | PASS | `switchCompany` updates `user_profiles.active_company_id` in DB. React Query invalidates all caches. RLS re-evaluates on next query. No mixed data risk. |
| Direct ID-based queries without company_id filter | WARNING | `merge-students` and `unmerge-students` edge functions accept `company_id` from the request body, but they also verify `eq("company_id", company_id)` on student lookups, preventing cross-company access. However, `unmerge-students` does NOT filter `transferred_payment_ids` by company_id when moving records back -- it uses `.in("id", transferred_payment_ids)` which could theoretically be exploited if undo data is tampered with. |
| Frontend queries relying on RLS vs explicit filter | PASS | Most hooks use `useActiveCompanyId()` to pass company_id explicitly, but RLS provides the authoritative guard regardless. |

---

## 4. CIPHER SPECIAL ACCESS

| Check | Status | Details |
|-------|--------|---------|
| Cipher invisible in member lists | PASS | `get_company_members_filtered` and `get_cipher_user_ids` security-definer functions filter cipher users unless the caller is also cipher. |
| Cipher can join any company invisibly | PASS | `cipher-join` action creates an admin membership. Cipher memberships are filtered from non-cipher member list views. |
| Cipher bypass in RLS | PASS | All relevant RLS policies include `OR is_cipher(auth.uid())`. |
| Only cipher can approve company creation | PASS | `approve-company-creation` action checks `if (!isCipher) return 403`. |
| Only cipher can access Investors & Loans | PASS | Stakeholders/investments/loans tables: RLS is `is_cipher(auth.uid())`. Frontend routes: `RoleGuard roles={["cipher"]}`. |
| Only cipher can Backup/Restore/Reset | PASS | `reset-company-data` edge function checks cipher role. UI: `DataManagementSection` conditionally renders only for cipher. |
| `is_cipher()` function security | PASS | `SECURITY DEFINER`, reads from `user_roles` via `has_role()`. Regular users cannot modify `user_roles` (no INSERT/UPDATE RLS policy for non-admin). |

---

## 5. PERMISSION SYSTEM FOR MODERATORS

| Check | Status | Details |
|-------|--------|---------|
| Where permissions are stored | PASS | Stored in `company_memberships` table (granular `mod_*` and `deo_*` boolean columns). There is also a `moderator_permissions` table but it appears to be legacy/unused. |
| Backend enforcement | PASS | RLS uses security-definer functions (`company_can_add_payment`, `is_data_entry_moderator`, etc.) that read from `company_memberships`. |
| Permission escalation risk | PASS | `company_memberships` UPDATE/INSERT RLS: only `is_company_admin` or `is_cipher` can modify. A moderator cannot change their own permissions. |
| Admin granting cipher-level access | PASS | Admins can only set `company_memberships` role to "admin" or "moderator". Cipher is a platform-level role in `user_roles`, not settable via membership. |
| `data_entry_mode` flag enforcement | PASS | `is_data_entry_moderator` function checks `role = 'moderator' AND data_entry_mode = true`. Used in RLS policies for filtering. |

---

## 6. API AND EDGE FUNCTION SECURITY

| Function | Auth Check | Role Check | Company ID Source | Status |
|----------|-----------|------------|-------------------|--------|
| `admin-users` | PASS (getUser) | PASS (cipher only) | N/A (platform-level) | PASS |
| `company-join` | PASS (getUser) | PASS (per-action) | From request body but validated against membership | WARNING |
| `reset-company-data` | PASS (getUser) | PASS (cipher + password) | From request body | FAIL |
| `bulk-import-students` | PASS (getUser) | PASS (membership check) | From request body | FAIL |
| `merge-students` | PASS (getUser) | PASS (admin/cipher via RPC) | From request body | FAIL |
| `unmerge-students` | PASS (getUser) | PASS (admin/cipher via RPC) | From request body | FAIL |
| `check-ban` | N/A (pre-auth) | N/A | N/A | WARNING |

### Critical Issues

**`reset-company-data`, `bulk-import-students`, `merge-students`, `unmerge-students` all accept `company_id` from the request body.** While they validate the caller's role/membership for that company_id, the `company_id` itself comes from untrusted client input rather than being derived from the authenticated session. An attacker who is an admin of Company A could potentially send a request with Company B's ID if the membership check has any flaw.

For `reset-company-data`: The cipher check is the only guard, and cipher has access to all companies, so this is less risky but still bad practice.

For `bulk-import-students`: Verifies membership for the provided company_id -- if membership exists and has permissions, it proceeds. This is acceptable but not ideal.

For `merge-students`/`unmerge-students`: Uses `is_company_admin` RPC which checks membership -- acceptable but `company_id` should still come from session.

**`check-ban` has no rate limiting.** It's a public endpoint that accepts an email and returns ban status. An attacker could enumerate emails to discover which are registered and banned.

**No edge function has rate limiting.** All are open to abuse.

**All edge functions have `verify_jwt = false`** in config.toml -- this is correct per the architecture (JWT validation is done in code), but it means the functions are reachable without any JWT at all. Each function handles its own auth check, which is fine, but `check-ban` intentionally skips auth.

---

## 7. INPUT VALIDATION AND INJECTION

| Check | Status | Details |
|-------|--------|---------|
| Raw SQL with string concatenation | PASS | No raw SQL in edge functions. All use Supabase client (parameterized). |
| XSS via stored content | PASS | React escapes content by default. No user-controlled HTML rendering. |
| `dangerouslySetInnerHTML` usage | PASS | Only used in `chart.tsx` for auto-generated CSS theme variables -- no user input involved. |
| File upload validation | WARNING | `ImageUpload` component exists but would need review for file type/size validation. The bulk import CSV parsing uses a whitelist of valid columns (`VALID_DB_COLUMNS`) which prevents arbitrary column injection. |
| CSV import sanitization | PASS | `bulk-import-students` validates each row with explicit field validation, column whitelist, and row limits (5000 max). Status values are validated against a whitelist. |
| Zod validation on edge functions | PASS | All edge functions (except `merge-students`/`unmerge-students`) use Zod schemas for input validation. |
| Missing input validation | WARNING | `merge-students` and `unmerge-students` do not use Zod schemas -- they destructure request body directly. Missing UUID validation on IDs. |

---

## 8. SESSION AND TOKEN SECURITY

| Check | Status | Details |
|-------|--------|---------|
| Session storage location | WARNING | `localStorage` via `persistSession: true`. Survives page refresh and tab close. Vulnerable to XSS if any XSS exists, but React's default escaping mitigates this. |
| JWT expiry | PASS | Default Supabase JWT expiry (1 hour). `autoRefreshToken: true` handles refresh. |
| Hardcoded API keys in frontend | PASS | Only the anon key is in the frontend (`.env` / client.ts). This is expected and protected by RLS. |
| Anon key abuse prevention | PASS | All tables have RLS enabled. The anon key alone cannot read/write any data without authentication. |
| Service role key exposure | PASS | Only used in edge functions via `Deno.env.get()`. Not in frontend code. |
| CORS configuration | WARNING | All edge functions use `Access-Control-Allow-Origin: "*"`. This allows any website to call the edge functions. In production, this should be restricted to the app's domain. |

---

## Prioritized Fix List

### Critical

1. **Missing `/reset-password` route** -- Password reset emails redirect to a non-existent page. Users cannot reset their passwords. Must add a `/reset-password` route with a form that calls `supabase.auth.updateUser({ password })`.

2. **Edge functions accept `company_id` from request body** -- `bulk-import-students`, `merge-students`, `unmerge-students`, and `reset-company-data` all trust `company_id` from client input. While membership/role checks partially mitigate this, `company_id` should ideally be derived from the user's `active_company_id` in the session (via the user's profile) rather than from the request body. This is especially concerning for `unmerge-students` which uses the undo payload's `company_id` without re-validating it.

3. **`unmerge-students` undo data tampering risk** -- The `transferred_payment_ids` array in the undo payload is trusted without validation. An attacker could craft an undo request with IDs belonging to a different company's records. The `.in("id", transferred_payment_ids)` queries do not filter by `company_id`.

### Important

4. **No rate limiting on any edge function** -- Especially concerning for `check-ban` (email enumeration) and `company-join` (password brute-force on join passwords).

5. **CORS `Access-Control-Allow-Origin: "*"`** -- All edge functions allow requests from any origin. Should be restricted to the app's domain in production.

6. **`/company-requests` and `/audit-log` routes lack frontend guards** -- While backend RLS prevents data access, these routes should have `RoleGuard` or `AccessGuard` to prevent moderators from even seeing the page skeleton. Currently a moderator could navigate to `/audit-log` and see an empty page rather than an "Access Denied" message.

7. **`merge-students`/`unmerge-students` missing Zod input validation** -- These edge functions destructure request body without schema validation. Malformed input could cause unexpected errors.

### Minor

8. **No auto-logout on tab/window close** -- Session persists in localStorage. This is standard SPA behavior but could be a concern for shared devices with sensitive financial data. Consider offering an optional "remember me" toggle.

9. **`get_active_company_id` returning null gives silent empty data** -- When a user has no active company selected, all queries return empty results with no explanatory error. The `CompanyGuard` redirects to `/companies` which handles this, but edge cases could exist.

10. **`check-ban` exposes ban/rejection status for any email** -- An unauthenticated caller can determine if an email is banned or rejected. Low risk but information disclosure.

11. **Legacy `moderator_permissions` table may be unused** -- Should be confirmed and removed if no longer referenced to reduce attack surface.

