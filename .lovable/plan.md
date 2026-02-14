

## Improve Charts and UX Across Dashboard and Reports

### Critical Bug Found
The **Reports page query does NOT filter by `company_id`** (lines 59-65 in Reports.tsx). It fetches ALL data across all companies, which is both a data leak and causes incorrect charts. The Dashboard correctly filters by `activeCompanyId`, but Reports does not.

### Issues Identified

1. **Reports page data leak** -- queries `revenues`, `expenses`, `allocations`, `expense_accounts`, and `revenue_sources` without `.eq("company_id", activeCompanyId)`, breaking multi-tenant isolation
2. **Dashboard Area Chart** -- no legend, users can't tell which color is revenue vs expenses without hovering
3. **Dashboard Pie Chart** -- legend limited to 6 items (`.slice(0, 6)`), remaining categories invisible; no amounts shown in legend
4. **Reports Bar Chart** -- Y-axis hardcoded to `k` format (`value / 1000`), breaks for small amounts (e.g., 500 shows as "1k")
5. **Reports Profit Line Chart** -- uses same tooltip as bar chart (shows "Revenue/Expenses" labels but data is "Profit")
6. **Reports Pie Charts** -- no percentage labels on the chart itself; the legend uses raw text without amounts
7. **Charts not using currency conversion** -- Reports page Y-axis formatters don't use `useCompanyCurrency` for conversion
8. **No empty state guidance** -- charts show "No data" but don't guide users to add data
9. **Dashboard chart colors** -- hardcoded hex values instead of theme-aware HSL variables (inconsistent in dark mode)

### Plan

#### 1. Fix Reports page multi-tenant data isolation (CRITICAL)
- Add `.eq("company_id", activeCompanyId)` to all 5 queries in the Reports page
- Add `activeCompanyId` to the query key
- Add `enabled: !!activeCompanyId` guard

#### 2. Improve Dashboard Area Chart
- Add a Legend component below the chart showing Revenue (blue) and Expenses (red)
- Use theme-aware colors (`hsl(var(--primary))` and `hsl(var(--destructive))`) instead of hardcoded hex
- Use `useCompanyCurrency` compact formatter for Y-axis tick formatting

#### 3. Fix Dashboard Pie Chart
- Remove the `.slice(0, 6)` limit on the legend so all categories show
- Add amount values next to each legend item
- Add percentage labels directly on larger pie slices using a custom label renderer

#### 4. Improve Reports Bar Chart
- Replace hardcoded `(value / 1000).toFixed(0)}k` Y-axis formatter with the currency compact formatter from `useCompanyCurrency`
- This automatically handles small and large numbers with proper currency symbol

#### 5. Fix Reports Profit Line Chart tooltip
- Create a dedicated `CustomProfitTooltip` that shows "Profit" label with proper positive/negative coloring instead of reusing the bar chart tooltip

#### 6. Improve Reports Pie Charts
- Add percentage labels on pie slices (for slices > 5% of total)
- Show amounts in the legend alongside names
- Use consistent formatting with currency hook

#### 7. Add meaningful empty states
- Replace generic "No data" messages with actionable guidance (e.g., "Add your first revenue entry to see trends here")
- Include a link/button to the relevant page (Revenue, Expenses)

#### 8. Dashboard chart theme consistency
- Replace hardcoded `#3B82F6` and `#EF4444` with CSS variable references in gradient definitions and area strokes

### Technical Details

**Reports query fix (most critical):**
```text
// Before (line 59-65):
supabase.from("revenues").select("*")

// After:
supabase.from("revenues").select("*").eq("company_id", activeCompanyId)
// Same for expenses, allocations, expense_accounts, revenue_sources
```

**Y-axis formatter fix:**
```text
// Before:
tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}

// After:
tickFormatter={(value) => fc(value, { compact: true })}
```

**Pie chart custom label:**
```text
const renderCustomLabel = ({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
  if (percent < 0.05) return null; // Skip labels for slices < 5%
  // Position label on the slice
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} ...>{(percent * 100).toFixed(0)}%</text>;
};
```

**Files to modify:**
- `src/pages/Reports.tsx` -- fix company_id filtering, improve chart formatters, add profit tooltip, improve pie charts, better empty states
- `src/pages/Dashboard.tsx` -- add area chart legend, fix pie chart legend limit, theme-aware colors, better empty states, currency-aware Y-axis

