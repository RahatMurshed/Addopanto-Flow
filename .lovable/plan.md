

# Enhanced Date Filter for Batch Pages

## Overview
Replace the current `MonthYearPicker` on both Batches and Batch Detail pages with a new `BatchDateFilter` component that supports three modes: **Monthly**, **Custom Range**, and **All Time**.

## New Component: `src/components/BatchDateFilter.tsx`

A compact filter with a mode selector (dropdown or tabs) and contextual inputs:

- **Monthly**: Shows the existing month/year grid picker (like current MonthYearPicker)
- **Custom Range**: Two calendar date pickers for start and end date
- **All Time**: No date inputs -- button/option that selects everything

The component exports a filter value object:
```text
type BatchFilterMode = "monthly" | "custom" | "alltime"
type BatchFilterValue = {
  mode: BatchFilterMode
  selectedMonth: string         // "YYYY-MM" (used in monthly mode)
  startDate?: Date              // for custom range
  endDate?: Date                // for custom range
}
```

It calls back `onFilterChange(filterValue)` whenever the user changes the mode or picks dates.

## Changes to `src/pages/Batches.tsx`

- Replace `selectedMonth` state + `MonthYearPicker` with `filterValue` state + `BatchDateFilter`
- Update `batchAnalytics` computation:
  - **Monthly**: current logic (filter by single month)
  - **Custom range**: sum revenue/pending across all months that fall within the start-end range
  - **All time**: sum across ALL months (no filtering)
- Update summary card labels dynamically:
  - Monthly: "Month Revenue", "Month Pending", "Month Overdue"
  - Custom: "Range Revenue", "Range Pending", "Range Overdue"
  - All Time: "Total Revenue", "Total Pending", "Total Overdue"
- Update batch table Revenue/Pending columns similarly

## Changes to `src/pages/BatchDetail.tsx`

- Replace `selectedMonth` state + `MonthYearPicker` with `filterValue` state + `BatchDateFilter`
- Update `batchStats` computation:
  - **Monthly**: current logic
  - **Custom range**: aggregate collected/pending/overdue across months in range
  - **All time**: show lifetime totals
- Update stat card labels dynamically (same pattern as Batches page)
- Update student table:
  - **Monthly**: current per-month status columns
  - **Custom range / All time**: show total paid and total pending across included months; status shows worst-case (overdue if any month is overdue)

## Helper Logic

A shared utility function determines which months to include:
```text
function getIncludedMonths(allMonths: string[], filter: BatchFilterValue): string[]
  - monthly: return [filter.selectedMonth] if it's in allMonths
  - custom: return months where the month falls within startDate-endDate
  - alltime: return all months
```

Both pages use this to filter their analytics/stats computations.

## Technical Details

- **New file**: `src/components/BatchDateFilter.tsx`
- **Modified files**: `src/pages/Batches.tsx`, `src/pages/BatchDetail.tsx`
- No new dependencies -- reuses existing Calendar, Popover, Select, MonthYearPicker patterns
- The mode selector uses a `Select` dropdown with 3 options
- Monthly mode internally renders MonthYearPicker (or similar inline month grid)
- Custom range renders two Shadcn Calendar date pickers inside Popovers
- All Time renders just the "All Time" label with no additional inputs

