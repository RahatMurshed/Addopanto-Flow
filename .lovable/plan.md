

# Add Advanced Address Filters to Student Search Panel

## Current State
The Advanced Filters panel has 5 fields: Batch, Gender, Class/Grade, City, and Academic Year. The "City" field is the only address filter, but the server-side search already supports all address fields via the global search bar.

## Plan

### 1. Expand `StudentFilterValues` interface (StudentFilters.tsx)
Add new filter fields:
- `addressState: string`
- `addressArea: string`
- `addressPinZip: string`

Update `defaultFilters` with empty strings for each.

### 2. Add debounced inputs for new fields (StudentFilters.tsx)
Follow the existing pattern used for `cityInput`/`classInput`:
- Add `stateInput`, `areaInput`, `pinInput` state variables
- Add debounce `useEffect` hooks (300ms) for each
- Add sync-back `useEffect` hooks for external changes

### 3. Update the Advanced Filters grid (StudentFilters.tsx)
Reorganize the grid from 5 columns to 2 rows:
- Row 1: Batch, Gender, Class/Grade, Academic Year
- Row 2 (Address group): City, State, Area/Locality, PIN/ZIP

The address group will have a subtle "Address" label/divider to visually group them.

### 4. Update filter counting and chips (StudentFilters.tsx)
- Include new fields in `advancedFilterCount`
- Add chips for State, Area, PIN/ZIP (like existing City chip)
- Update `clearChip` and `resetAll` to handle new fields

### 5. Add server-side filtering (useStudents.ts)
Apply `.ilike()` filters for `address_state`, `address_area`, and `address_pin_zip` following the same pattern as `addressCity`:
```
if (addressState) {
  const s = addressState.replace(/[%_\\]/g, '\\$&');
  countQuery = countQuery.ilike("address_state", `%${s}%`);
  dataQuery = dataQuery.ilike("address_state", `%${s}%`);
}
```
Add these to the query key array as well.

### Files Modified
| File | Change |
|------|--------|
| `src/components/StudentFilters.tsx` | Add state/area/PIN inputs, debounce hooks, chips, grid layout update |
| `src/hooks/useStudents.ts` | Add `addressState`, `addressArea`, `addressPinZip` to filters interface and query logic |

