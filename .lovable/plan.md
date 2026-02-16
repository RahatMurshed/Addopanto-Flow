

# Add Toggle to Include/Exclude Alternate Contact Number in Search

## Overview
The global search bar currently searches across 14 fields including `alt_contact_number`. This change adds a toggle (switch) in the Advanced Filters panel that lets admins opt in or out of searching the alternate contact number field. It defaults to **included** (preserving current behavior).

## Changes

### 1. `src/components/StudentFilters.tsx`
- Add `includeAltContact: boolean` to the `StudentFilterValues` interface (default: `true`).
- Add a `Switch` + label row inside the Advanced Filters panel (below the address group), labeled "Include alternate contact in search".
- Wire the switch to update `filters.includeAltContact`.
- No chip needed since this is a boolean toggle with a sensible default.

### 2. `src/hooks/useStudents.ts`
- Accept `includeAltContact` from filters.
- Conditionally include `alt_contact_number.ilike.%...%` in the `.or()` search filter string only when `includeAltContact` is `true` (or undefined, for backward compatibility).

### 3. `src/pages/Students.tsx`
- No changes needed beyond what already flows through the existing `filters` state object.

## Technical Details

**Search filter construction** (useStudents.ts, ~line 242-246):
```typescript
const fields = [
  "name", "student_id_number", "father_name", "phone",
  "mother_name", "whatsapp_number",
  ...(includeAltContact !== false ? ["alt_contact_number"] : []),
  "email", "address_house", "address_street",
  "address_area", "address_city", "address_state", "address_pin_zip"
];
const searchFilter = fields.map(f => `${f}.ilike.%${sanitized}%`).join(",");
```

**UI toggle** (StudentFilters.tsx, inside Advanced Filters):
```tsx
<div className="flex items-center gap-2">
  <Switch
    checked={filters.includeAltContact}
    onCheckedChange={(v) => onChange({ ...filters, includeAltContact: v })}
  />
  <span className="text-sm">Include alternate contact in search</span>
</div>
```

| File | Change |
|------|--------|
| `src/components/StudentFilters.tsx` | Add `includeAltContact` to interface/defaults, add Switch in Advanced Filters |
| `src/hooks/useStudents.ts` | Conditionally include `alt_contact_number` in search filter |

