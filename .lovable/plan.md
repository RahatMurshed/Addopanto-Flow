

# Add Month Picker to "This Month" Card

## What Changes
The "This Month" card currently always shows the current calendar month. This change adds a small month/year picker so admins can select any month to view collection stats for that specific month.

## How It Works
- Replace the static "This Month" label with a clickable MonthYearPicker (already exists in the project)
- The selected month drives the calculation instead of `new Date()`
- Default selection remains the current month
- Card title updates to show the selected month name (e.g., "January 2026")

## Technical Details

### File: `src/pages/BatchDetail.tsx`

1. **Add state for selected month**
   - Add a `useState` initialized to the current month in `YYYY-MM` format
   - Import `MonthYearPicker` component and `format`/`parse` from date-fns

2. **Update `batchStats` computation (lines 140-141)**
   - Replace `const now = new Date()` and the hardcoded `currentMonth` with the selected month state value
   - Add the selected month state to the `useMemo` dependency array

3. **Update the "This Month" card UI (lines 385-404)**
   - Replace the static "This Month" text with a `MonthYearPicker` component
   - The picker uses the existing `MonthYearPicker` component already built in the project
   - Constrain min/max year to the batch's start and end date range

### No new files or dependencies needed -- reuses existing `MonthYearPicker` component.
