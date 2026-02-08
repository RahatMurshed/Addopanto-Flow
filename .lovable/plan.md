
# Plan: Fix Report Year Filter and Add Informative Data

## Problems Identified

### Issue 1: Monthly Summary Shows Only Current Year (2026)
The Monthly Summary tab hardcodes the year using `new Date().getFullYear()` (line 93-94) and doesn't have a year selector. Users cannot view historical monthly data from previous years.

### Issue 2: Report Lacks Informative Visualizations
The current report is purely tabular data. It lacks:
- Charts/graphs for visual analysis
- Comparison metrics (profit margins, trends)
- Key performance indicators
- Year-over-year comparisons

---

## Solution

### Fix 1: Add Year Selector to Monthly Summary Tab
- Add a state variable `selectedYear` for the monthly summary
- Add a year dropdown selector in the Monthly Summary tab header
- Update the `monthlyBreakdown` calculation to use `selectedYear` instead of hardcoded current year

### Fix 2: Add Informative Report Sections
- **Visual Charts**: Add a bar chart showing revenue vs expenses by month
- **Summary Statistics Card**: Add calculated KPIs including:
  - Profit Margin percentage
  - Average Revenue per transaction
  - Average Expense per transaction
  - Highest/Lowest revenue months
- **Year-over-Year Comparison**: Show current vs previous year totals with percentage change
- **Pie Chart**: Expense distribution by Khata (account)

---

## Technical Implementation

### File to Modify: `src/pages/Reports.tsx`

**Changes:**

1. **Add state for selected year** (new state variable)
   ```
   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
   ```

2. **Update Monthly Breakdown calculation** to use `selectedYear` (lines 91-120)
   - Replace hardcoded `const year = new Date().getFullYear();` with `selectedYear`

3. **Add year selector to Monthly Summary tab header** (around line 317)
   - Add a Select dropdown next to the title

4. **Add new Summary Statistics section** (after summary cards)
   - Profit Margin = (Net Profit / Revenue) * 100
   - Average transaction values
   - Best/worst performing months

5. **Add Bar Chart component** for monthly revenue vs expenses visualization
   - Use recharts BarChart (already in dependencies)
   - Display revenue and expenses side by side for each month

6. **Add Year-over-Year comparison card**
   - Calculate previous year totals
   - Show percentage change using existing `PercentageChange` component

7. **Add Pie Chart for expense breakdown by account**
   - Reuse similar logic from Dashboard

---

## Visual Layout After Changes

```text
+--------------------------------------------------+
|  REPORTS PAGE                                    |
+--------------------------------------------------+
|  [Date Filter: Monthly | February | 2026]        |
+--------------------------------------------------+
|  SUMMARY CARDS (existing)                        |
|  [Revenue] [Expenses] [Net Profit] [Transactions]|
+--------------------------------------------------+
|  NEW: KEY PERFORMANCE INDICATORS                 |
|  [Profit Margin %] [Avg Revenue] [Avg Expense]   |
|  [Best Month] [Worst Month] [YoY Change %]       |
+--------------------------------------------------+
|  NEW: CHARTS SECTION                             |
|  [Bar Chart: Monthly Revenue vs Expenses]        |
|  [Pie Chart: Expense by Khata]                   |
+--------------------------------------------------+
|  TABS: [Monthly Summary] [By Khata] [By Source]  |
+--------------------------------------------------+
|  Monthly Summary Tab:                            |
|  Title: Monthly Breakdown - [Year Selector ▾]    |
|  [Table with monthly data for selected year]     |
+--------------------------------------------------+
```

---

## Expected Results

| Before | After |
|--------|-------|
| Monthly tab shows only 2026 | Year selector allows viewing any year (2021-2026) |
| No visualizations | Bar chart + Pie chart for visual analysis |
| Basic summary cards only | Additional KPIs: profit margin, averages, best/worst months |
| No year comparisons | Year-over-Year comparison with percentage change |

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Reports.tsx` | Add year selector, charts, KPI cards, YoY comparison |

---

## New Imports Required

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import PercentageChange from "@/components/PercentageChange";
```

These are already available in the project dependencies (recharts is installed, PercentageChange component exists).
