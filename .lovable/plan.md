

# Replace Month Dropdown with Full Calendar Month Picker

## Problem
The current month selector only shows months that have overdue data. Since there are no overdue payments yet, the dropdown is disabled and empty -- you can't select any month at all. The selector needs to work independently of existing data.

## Solution
Replace the limited dropdown with a month/year picker that lets you browse any month across multiple years (2024, 2025, 2026, 2027, 2028, etc.), regardless of whether overdue data exists. This will use a popover-based month calendar where you first select a year, then pick a month.

## Changes

| File | Change |
|------|--------|
| `src/components/StudentOverdueSection.tsx` | Replace the "Specific Month" Select dropdown with a popover-based month/year picker. Generate all months from the earliest student billing start to the current month. Always allow selection even when no overdue data exists. Update filtering logic to work with the selected month against all students (not just those with known overdue months). |

## How It Will Work
1. The month picker button shows the currently selected month (e.g., "February 2026")
2. Clicking it opens a popover with year navigation (left/right arrows) and a 12-month grid (Jan-Dec)
3. Months in the future are disabled; past months are selectable
4. Selecting a month filters the overdue table for that specific period
5. The "All Overdue" mode continues to work as before
6. When "Specific Month" is selected, the picker is always enabled -- not dependent on existing overdue data

## Technical Details

- Build a `MonthYearPicker` inline within the component using Popover + Button + grid layout
- Generate the selectable month range: from the earliest `billing_start_month` across all students (or January of current year if none) up to the current month
- Format: internal value stays `yyyy-MM` string for consistency with existing logic
- The overdue row computation already handles the case where no students are overdue for a given month (returns empty array with zero metrics) -- no changes needed there
- Remove the `disabled={!hasData}` constraint on the filter mode selector so admins can always switch between "Specific Month" and "All Overdue"

