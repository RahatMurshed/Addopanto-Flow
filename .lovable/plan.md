

## Fix: Platform Users page showing no users

### Root Cause

The `admin-users` edge function crashes on startup with:
```
SyntaxError: Identifier 'corsHeaders' has already been declared
```

Line 4 declares `const corsHeaders = {...}` and line 15 declares `let corsHeaders: Record<string, string> = {};` — a duplicate variable name in the same scope. The function never loads, so the GET request to list users fails silently, returning an empty list.

### Fix

**File: `supabase/functions/admin-users/index.ts`**

- Remove the duplicate `let corsHeaders` declaration on line 15
- Remove the `getCorsHeaders` wrapper function (lines 11-13) since it just returns the same static object
- Remove the reassignment on line 42 (`corsHeaders = getCorsHeaders(req)`)

The static `const corsHeaders` on line 4 is sufficient — the CORS headers don't change per-request.

### Result

After deploying, the Platform Users page will correctly list all registered users.

