

# Fix: Platform Users Page Empty (CORS Mismatch)

## Problem
The `admin-users` edge function has a hardcoded CORS allowlist pointing to the **original** project's domains. Your remixed project has a different project ID, so the browser blocks the response due to CORS policy.

**Original (broken):**
- `addopantoflow.lovable.app`
- `58aee540-d716-4564-805b-e26d9615ae54.lovableproject.com`

**Your project:**
- `f820c644-655c-4917-96f4-832052a66364.lovableproject.com`

## Fix

Update `supabase/functions/admin-users/index.ts` lines 4-9 to use your new project ID:

```text
function isAllowedOrigin(origin: string): boolean {
  // Allow the lovableproject.com dev domain
  if (origin.includes("f820c644-655c-4917-96f4-832052a66364")) return true;
  // Allow any preview subdomain
  if (/^https:\/\/[a-z0-9-]+--f820c644-655c-4917-96f4-832052a66364\.lovable\.app$/.test(origin)) return true;
  return false;
}
```

## Other Edge Functions to Check
The same CORS pattern may exist in other edge functions. All 7 edge functions will be scanned and updated if needed:
- `admin-users` (confirmed broken)
- `auto-complete-batches`
- `bulk-import-students`
- `company-join`
- `merge-students`
- `reset-company-data`
- `unmerge-students`

## Scope
- Update CORS origin checks in all edge functions to match the new project ID
- Deploy updated edge functions
- No database or schema changes needed

