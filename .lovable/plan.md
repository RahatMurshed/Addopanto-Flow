

# Fix Navigation & Page Content Flash for Moderators

## Root Cause

The sidebar flash fix is already in place (`buildNavItems()` returns `[]` during loading). However, **`AccessGuard` does not account for loading state**. During loading, all permission flags default to `false`:

- `isModerator = false` (no membership data yet)
- `isDataEntryModerator = false`

This means every `isDenied` rule evaluates to `false`, so restricted pages (Dashboard, Reports, Members, Products, etc.) briefly render their full content before the role data resolves and the guard kicks in.

## Fix

### File: `src/components/auth/AccessGuard.tsx`

Add a loading guard: when `isLoading` is true, render a spinner instead of evaluating rules or rendering children. This ensures no protected content is ever shown before role data is confirmed.

```text
export function AccessGuard({ children, rules }: AccessGuardProps) {
  const ctx = useCompany();

  // NEW: Block all rendering until role/permission data resolves
  if (ctx.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  for (const rule of rules) {
    if (rule.isDenied(ctx)) {
      return <PermissionDenied ... />;
    }
  }

  return <>{children}</>;
}
```

### File: `src/components/auth/RoleGuard.tsx`

Same pattern -- `RoleGuard` (used for `/users` cipher-only page) also evaluates roles before data is ready. Its existing `isLoading` check returns `null`, which is fine, but confirm it handles this correctly. Currently at line 24: `if (isLoading) return null;` -- this is safe (renders nothing during loading).

No change needed for `RoleGuard`.

## What Changes

| File | Change |
|------|--------|
| `src/components/auth/AccessGuard.tsx` | Show spinner while `ctx.isLoading` is true, before evaluating any rules |

## What Does NOT Change

- No RLS policies modified
- No database migrations
- No edge functions
- No existing features broken
- No route structure changes
- Sidebar fix remains as-is (already working)
- Backend security (RLS) remains as-is (already enforced)

## Result

A moderator refreshing the page will see:
1. Branded loader (auth resolving)
2. Empty sidebar + spinner in content area (role data resolving)
3. Correct moderator-restricted view (data resolved)

At no point will admin-only content or navigation flash.

