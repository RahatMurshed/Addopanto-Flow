
# Plan: Make All Charts Filter-Responsive

## Problem Summary

Currently, several charts across the app do **not** respond to the date filter selections:

| Page | Chart | Current Behavior | Issue |
|------|-------|------------------|-------|
| Dashboard | Revenue vs Expenses Area Chart | Always shows "Last 6 months" | Ignores date filter |
| Dashboard | Expense Distribution Pie Chart | Always shows "All-time" data | Ignores date filter |
| Reports | Monthly Overview Bar Chart | Uses separate year selector | Not synced with date filter |
| Reports | Profit Trend Line Chart | Uses separate year selector | Not synced with date filter |

## Solution

### Change 1: Dashboard - Make Area Chart Filter-Responsive

**File:** `src/pages/Dashboard.tsx`

**Current:** The `revenueTrend` data is calculated once during query fetch and always shows the last 6 months:
```tsx
// Revenue trend data (last 6 months) - hardcoded
for (let i = 5; i >= 0; i--) {
  const monthDate = subMonths(now, i);
  // ...
}
```

**Fix:** Create a `filteredRevenueTrend` memo that recalculates based on the selected date range. For monthly/half-yearly/yearly filters, aggregate by month. For daily/custom filters with smaller ranges, show daily data points.

- Update the chart title dynamically to reflect the selected period
- Use `filteredData.filteredRevenues` and `filteredData.filteredExpenses` to compute trend data

### Change 2: Dashboard - Make Pie Chart Filter-Responsive

**File:** `src/pages/Dashboard.tsx`

**Current:** Uses `data.expenseBreakdown` which is all-time data
```tsx
<p className="text-sm text-muted-foreground">All-time spending by category</p>
// ...
{data.expenseBreakdown.map(...)}
```

**Fix:** 
- Use `filteredData.expenseBreakdown` instead (already computed in the `filteredData` memo)
- Update the chart subtitle to show the selected date range label
- Update legend and tooltip to use filtered data

### Change 3: Reports - Sync Bar/Line Charts with Date Filter

**File:** `src/pages/Reports.tsx`

**Current:** Bar and Line charts use a separate `selectedYear` state with a year dropdown that's independent from the main date filter.

**Fix Options:**
1. **Option A - Remove year selector**: Make bar/line charts fully responsive to the date filter (aggregate based on filter type)
2. **Option B - Keep year selector but improve**: Keep the year dropdown but move it into the chart card for clarity

**Recommended: Option A** - Remove the separate year selector and make charts fully responsive to the date filter. When filter is:
- **Daily**: Show daily bars for the selected day (or skip if single day)
- **Monthly**: Show the selected month's daily breakdown
- **Half-Yearly**: Show 6 months of data
- **Yearly**: Show 12 months of the selected year
- **Custom**: Aggregate appropriately based on date range span

---

## Technical Implementation Details

### Dashboard.tsx Changes

1. **Add a `filteredRevenueTrend` memo** (after `filteredData` memo, around line 226):
   - Group filtered revenues/expenses by month within the selected date range
   - Generate month labels and aggregated values
   - Handle edge cases where date range spans multiple months

2. **Update Area Chart section** (around lines 511-567):
   - Replace `data.revenueTrend` with `filteredRevenueTrend`
   - Update title/subtitle: "Revenue vs Expenses - {dateRange.label}"
   - Update `hasRevenueTrendData` check to use filtered data

3. **Update Pie Chart section** (around lines 570-614):
   - Replace `data.expenseBreakdown` with `filteredData.expenseBreakdown`
   - Replace `totalExpenseValue` with `totalFilteredExpense`
   - Update subtitle: "Spending by category - {dateRange.label}"
   - Update tooltip to use `totalFilteredExpense`

### Reports.tsx Changes

1. **Remove `selectedYear` state** (line 45) and year selector UI

2. **Update `monthlyBreakdown` memo** (lines 139-170):
   - Change to calculate based on `dateRange` instead of `selectedYear`
   - Smart aggregation: if range is < 31 days, show daily; if < 6 months, show by month; otherwise show by month for the range

3. **Update chart titles** (lines 578-580, 603-605):
   - Show `{dateRange.label}` instead of `{selectedYear}`

4. **Update `availableYears` memo** - Remove or repurpose for other uses

---

## Visual Result After Changes

### Dashboard - Before vs After

| Before | After |
|--------|-------|
| Area Chart: "Last 6 months comparison" | Area Chart: "Revenue vs Expenses - March 2026" |
| Pie Chart: "All-time spending by category" | Pie Chart: "Spending by category - March 2026" |

### Reports - Before vs After

| Before | After |
|--------|-------|
| Bar Chart: "Monthly Overview - 2026" (with year dropdown) | Bar Chart: "Monthly Overview - March 2026" |
| Line Chart: "Profit Trend - 2026" (with year dropdown) | Line Chart: "Profit Trend - March 2026" |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add `filteredRevenueTrend` memo, update Area chart to use filtered data, update Pie chart to use `filteredData.expenseBreakdown` |
| `src/pages/Reports.tsx` | Remove `selectedYear` state and UI, update `monthlyBreakdown` to use `dateRange`, update chart titles |

---

## Edge Cases to Handle

1. **Single day filter**: Show a message or single data point for charts
2. **No data in range**: Show "No data for selected period" message
3. **Custom range spanning multiple years**: Aggregate by month across years
4. **Very long custom ranges**: Limit data points to prevent chart overcrowding
