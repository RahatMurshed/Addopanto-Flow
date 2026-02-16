

# Add Address-Based Filters to Exports for Large Datasets

## Problem
1. The export dialog's "Active Filters" summary only shows City but not the new State, Area, or PIN/ZIP filters.
2. CSV export only exports the current page of students (e.g., 50 of 5,000 matching records), which is insufficient for large datasets.

## Plan

### 1. Update filter summary in `StudentExportDialog.tsx`
Add the missing address filters to `activeFilterDescription`:
- `addressState` -> "State: {value}"
- `addressArea` -> "Area: {value}"
- `addressPinZip` -> "PIN/ZIP: {value}"
- `includeAltContact === false` -> "Alt contact excluded"

### 2. Add server-side full export for CSV (large datasets)
Currently the dialog receives only the current page's students. For CSV exports, fetch ALL matching records server-side using the same filters.

**Changes in `src/hooks/useStudents.ts`:**
- Export a new `fetchFilteredStudentsForExport` async function that accepts the same filter parameters but fetches ALL matching rows (no pagination), using `.range()` in batches of 1000 to bypass the default limit.

**Changes in `src/components/StudentExportDialog.tsx`:**
- Import and call `fetchFilteredStudentsForExport` when exporting CSV, instead of using the passed-in `students` prop (which is only the current page).
- Show a progress indicator during the fetch ("Fetching all records...").
- The `students` prop continues to be used for PDF export (which captures the visible table).

**Changes in `src/pages/Students.tsx`:**
- Pass the current `activeCompanyId` to the export dialog so the export function can scope queries correctly.

### 3. Files changed

| File | Change |
|------|--------|
| `src/components/StudentExportDialog.tsx` | Add missing address filters to summary; use server-side fetch for CSV export |
| `src/hooks/useStudents.ts` | Add `fetchFilteredStudentsForExport()` function |
| `src/pages/Students.tsx` | Pass `activeCompanyId` to export dialog |

### Technical Details

**Batch fetching for export** (useStudents.ts):
```typescript
export async function fetchFilteredStudentsForExport(
  activeCompanyId: string,
  filters: { search, status, batchId, gender, classGrade, addressCity, addressState, addressArea, addressPinZip, academicYear, includeAltContact }
): Promise<Student[]> {
  // Build query with same filter logic as useStudents
  // Fetch in batches of 1000 using .range(from, to) to bypass default limit
  // Return concatenated results
}
```

**Updated filter summary** (StudentExportDialog.tsx):
```typescript
if (filters.addressState) parts.push(`State: ${filters.addressState}`);
if (filters.addressArea) parts.push(`Area: ${filters.addressArea}`);
if (filters.addressPinZip) parts.push(`PIN/ZIP: ${filters.addressPinZip}`);
if (filters.includeAltContact === false) parts.push("Alt contact excluded");
```

