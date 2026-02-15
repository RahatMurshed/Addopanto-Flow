

## Standardize AdvancedDateFilter and TablePagination Across All Pages

### Summary

Replace all custom/missing date filters and pagination with the unified `AdvancedDateFilter` and `TablePagination` components (matching the Dashboard pattern) across the entire app.

### Current State

| Page | AdvancedDateFilter | TablePagination |
|---|---|---|
| Dashboard | Yes | Yes |
| Revenue | Yes | Yes |
| Expenses | Yes | Yes |
| Reports | Yes | Yes |
| Batches | No (uses BatchDateFilter) | Yes |
| Students | No | Yes |
| Audit Log | No | No (custom pagination) |
| Expense Sources (Transfer History) | No (custom calendar popup) | Yes |
| Company Members | No | No |

### Changes

**1. TransferHistoryCard -- Replace custom calendar filter with AdvancedDateFilter**
- Remove the `react-day-picker` based date range popover
- Replace with `AdvancedDateFilter` component in the card header
- Update filtering logic to use `DateRange` from `dateRangeUtils` instead of `react-day-picker` DateRange
- Remove the `showDateFilter` prop; replace with an `advancedFilter` boolean or always show AdvancedDateFilter
- Keep existing TablePagination (already present)

**2. Audit Log -- Replace custom pagination with TablePagination**
- The Audit Log uses server-side pagination (offset-based), so we need to adapt `TablePagination` to work with the existing `page`/`totalCount` pattern rather than introducing `usePagination` (which is client-side)
- Replace the custom `ChevronLeft/ChevronRight` pagination block with `TablePagination`
- Map the existing `page` (0-indexed) to TablePagination's 1-indexed interface
- Add items-per-page selector (replace hardcoded `PAGE_SIZE = 25`)

**3. Batches -- No change needed**
- Batches uses `BatchDateFilter` which is purpose-built for month-based batch filtering (students enrolled per month). This is fundamentally different from the financial date range filter; changing it would break the batch logic. It stays as-is.

**4. Students -- No date filter needed**
- Students are not date-ranged financial data; they have enrollment status filters. The existing `StudentFilters` component is appropriate. No change needed.

**5. Company Members -- No change needed**
- Members are a settings-type list, not time-series data. No date filter is appropriate. The list is typically small enough that pagination is unnecessary.

### Technical Details

**TransferHistoryCard changes:**
- Import `AdvancedDateFilter` and `DateRange` from `dateRangeUtils`
- Remove imports for `Calendar`, `Popover`, `CalendarIcon`, `X` (from date filter usage)
- Replace `dateRange` state (react-day-picker type) with `filterDateRange` state using the app's `DateRange` type
- Filter transfers by comparing `transfer.created_at` against `filterDateRange.start` and `filterDateRange.end`
- AdvancedDateFilter placed in the CardHeader where the old calendar button was

**AuditLog changes:**
- Replace the manual pagination div (lines 312-325) with `TablePagination`
- Convert `page` state from 0-indexed to 1-indexed for TablePagination compatibility
- Add `pageSize` state (replacing `PAGE_SIZE` constant) to support the per-page dropdown
- Calculate `startIndex` and `endIndex` for display
- Remove `ChevronLeft`/`ChevronRight` icon imports (if no longer used elsewhere)

### Files to modify

- `src/components/TransferHistoryCard.tsx` -- replace calendar date filter with AdvancedDateFilter
- `src/pages/AuditLog.tsx` -- replace custom pagination with TablePagination, add page size selector
