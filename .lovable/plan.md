

## Plan: Audit & Fix All Issues for Client/Recruiter Friendliness

### Issues Found

**Critical Bug: `company-join` Edge Function crashes (same duplicate `corsHeaders` bug)**
- The screenshot shows "Failed to send a request to the Edge Function" when changing the join password
- Root cause: `supabase/functions/company-join/index.ts` lines 40-44 declare `getCorsHeaders` + `let corsHeaders` duplicating the `const corsHeaders` on line 33
- Line 139 reassigns `corsHeaders = getCorsHeaders(req)` which also fails
- This breaks ALL company-join actions: joining, creating companies, changing passwords

**Viewer Experience Gaps**

1. **Settings page redirects viewers away** — `SettingsPage.tsx` line 66 kicks out anyone who isn't `isCompanyAdmin || isCipher`. Viewers get silently redirected to `/dashboard` but the sidebar doesn't even show Settings for viewers, so this is fine — no fix needed.

2. **Dashboard obligations not visible to viewers** — `Dashboard.tsx` line 105 has `enabled: isCipher` for the investments/loans query. Viewers should see this data too since they have "full cipher power" read access.

3. **Dashboard quick-action buttons visible to viewers** — The Dashboard shows "Add Revenue", "Add Expense", etc. buttons. Since `canAdd*` is already `false` for viewers, these should be hidden already via `PermissionGuard` checks. Need to verify.

4. **Viewer sidebar missing "Members" link** — Viewers have `canViewMembers: true` but the sidebar viewer block doesn't include Members.

### Fix Plan

**Step 1: Fix `company-join` Edge Function** (critical)
- File: `supabase/functions/company-join/index.ts`
- Remove `getCorsHeaders` function (lines 40-42), `let corsHeaders` (line 44), and `corsHeaders = getCorsHeaders(req)` (line 139)
- Same fix as applied to `admin-users`

**Step 2: Enable Dashboard obligations for viewers**
- File: `src/pages/Dashboard.tsx` line 105
- Change `enabled: !!user && !!activeCompanyId && isCipher` to `enabled: !!user && !!activeCompanyId && (isCipher || isViewer)`
- Also destructure `isViewer` from `useCompany()`

**Step 3: Add "Members" to viewer sidebar**
- File: `src/components/layout/AppLayout.tsx`
- Add `{ label: "Members", href: "/company/members", icon: Users }` to the viewer nav items block (around line 115)

**Step 4: Hide mutation elements on pages for viewers**
- The pages already use `canAdd*`, `canEdit*`, `canDelete*` which are all `false` for viewers
- Most action buttons are already gated by these permissions — no additional changes needed
- The `AccessGuard` already bypasses denial rules for viewers, letting them view all pages

### Technical Details
- **Files modified**: `supabase/functions/company-join/index.ts`, `src/pages/Dashboard.tsx`, `src/components/layout/AppLayout.tsx`
- **Edge function redeployment**: `company-join` needs redeployment after fix
- No database changes needed

