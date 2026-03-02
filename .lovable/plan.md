

# Show Business Logo for DEO Moderators in Sidebar

## Problem
When a DEO (Data Entry Only) moderator is logged in, the sidebar shows a generic Building2 icon next to the company name instead of the actual business logo. Admin users see the logo in the company switcher dropdown, but DEO moderators bypass that dropdown and get a static display (lines 219-224 in AppLayout.tsx).

## Solution
Update the static company display block (shown to DEO moderators) to check for `activeCompany?.logo_url` and render the logo image when available, falling back to the Building2 icon when no logo exists -- matching the same pattern already used in the dropdown trigger (lines 188-194).

## Changes

### `src/components/layout/AppLayout.tsx` -- Show logo for DEO moderators

Lines 219-224: Replace the static `Building2` icon block with a conditional that renders the company logo if `activeCompany?.logo_url` exists, otherwise falls back to the existing icon.

**Before:**
```tsx
<div className="flex items-center gap-2 px-2 py-1.5">
  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
    <Building2 className="h-3 w-3" />
  </div>
  <span className="truncate text-sm font-medium text-sidebar-foreground">{activeCompany?.name || "Business"}</span>
</div>
```

**After:**
```tsx
<div className="flex items-center gap-2 px-2 py-1.5">
  {activeCompany?.logo_url ? (
    <img src={activeCompany.logo_url} alt="" className="h-5 w-5 rounded object-cover" />
  ) : (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
      <Building2 className="h-3 w-3" />
    </div>
  )}
  <span className="truncate text-sm font-medium text-sidebar-foreground">{activeCompany?.name || "Business"}</span>
</div>
```

One block changed, no new files or dependencies needed.

