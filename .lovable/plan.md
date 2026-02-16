
# Saved Search Presets for Student List

## Overview
Add a "Saved Searches" feature that lets admins save the current filter combination as a named preset and recall it with one click. Presets are stored per-user per-company in a new database table, so they persist across sessions.

## Database

### New table: `saved_search_presets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK, default gen_random_uuid()) | |
| `user_id` | uuid, NOT NULL, references auth.users(id) ON DELETE CASCADE | |
| `company_id` | uuid, NOT NULL, references companies(id) ON DELETE CASCADE | |
| `name` | text, NOT NULL | Display label (e.g. "Overdue Males in Delhi") |
| `filters` | jsonb, NOT NULL | Serialized `StudentFilterValues` object |
| `created_at` | timestamptz, default now() | |

**RLS policies**: Users can only SELECT/INSERT/UPDATE/DELETE rows matching `auth.uid() = user_id`. An additional filter on `company_id` ensures presets are scoped to the active company.

**Index**: Composite index on `(user_id, company_id)`.

## New Hook: `src/hooks/useSavedSearchPresets.ts`

- `useSavedSearchPresets()` -- fetches all presets for the current user and active company via React Query.
- `useCreatePreset()` -- mutation to insert a new preset.
- `useDeletePreset()` -- mutation to delete a preset by ID.
- Uses `useActiveCompanyId()` and `useAuth()` for scoping.
- Query key: `["saved-search-presets", companyId]`.

## UI Changes: `src/components/StudentFilters.tsx`

### New props
- `savedPresets: Preset[]`
- `onSavePreset: (name: string) => void`
- `onDeletePreset: (id: string) => void`
- `onLoadPreset: (filters: StudentFilterValues) => void`

### Layout addition
Add a row between the search bar and the Advanced Filters button:

1. **"Save Current" button** (Bookmark icon) -- opens a small Popover with a text input for the preset name and a "Save" confirmation button. Only enabled when filters differ from defaults.
2. **Preset chips** -- horizontal scrollable list of saved presets as `Badge` buttons. Clicking one calls `onLoadPreset(preset.filters)`. Each chip has a small X to delete.

## Wiring: `src/pages/Students.tsx`

- Import and call the new `useSavedSearchPresets` hook.
- Pass preset data and handlers down to `StudentFilters`.
- `onLoadPreset` sets the filter state, which triggers the existing `useEffect` page reset and server query.

## Technical Details

### Serialization
`StudentFilterValues` is a flat object of strings, so it serializes to JSONB cleanly. When loading, cast values back to the `StudentFilterValues` type with a simple spread over `defaultFilters` to fill any missing keys from older presets.

### Files changed

| File | Change |
|------|--------|
| (migration) | Create `saved_search_presets` table + RLS + index |
| `src/hooks/useSavedSearchPresets.ts` | New file -- query + mutations |
| `src/components/StudentFilters.tsx` | Add preset save/load UI row |
| `src/pages/Students.tsx` | Wire hook to filters component |
