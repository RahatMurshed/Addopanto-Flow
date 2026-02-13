

# Make Monthly Overdue Section Always Visible

## Problem

The `StudentOverdueSection` component currently returns `null` when there are no overdue months. Since all your students' billing starts in March 2026 (next month), there are no overdue payments yet -- only future pending ones. The section is working correctly but is completely hidden when empty.

## Solution

Make the Monthly Overdue Section always visible on the Students page, even when there are no overdue students. This way admins can see the section exists and will be populated once billing months pass.

## Changes

| File | Change |
|------|--------|
| `src/components/StudentOverdueSection.tsx` | Remove the early `return null` when no overdue months exist. Instead, show an empty state message within the card. |

## Technical Details

In `StudentOverdueSection.tsx`, the line `if (sortedMonths.length === 0) return null;` (around line 140) prevents the entire section from rendering. The fix:

1. Remove the early return
2. When there are no overdue months, show the card header with the title and an empty state message like "No overdue payments found. This section will show students with past-due monthly fees."
3. Disable the month selector and export buttons when there's no data
4. Keep the summary cards visible showing zeros so admins understand the metrics that will be tracked

This ensures the section is always visible and discoverable on the Students dashboard.

