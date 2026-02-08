

# Advanced Date Filtering and Export System

## Overview
Implement a comprehensive date filtering system with multiple preset options (Daily, Monthly, Half-Yearly, Yearly, Custom Range) and export functionality (CSV for transaction data, PDF for full page reports) across all four pages: Expenses, Revenue, Reports, and Dashboard.

---

## Components to Create

### 1. Advanced Date Filter Component (`src/components/AdvancedDateFilter.tsx`)

A unified, reusable filter component replacing the current `MonthFilter` with expanded capabilities:

**Filter Options:**
- **Daily** - Select a specific date
- **Monthly** - Select a specific month (current behavior)
- **Half-Yearly** - H1 (Jan-Jun) or H2 (Jul-Dec) of a year
- **Yearly** - Full calendar year
- **Custom Range** - Pick start and end dates

**UI Design:**
- Primary dropdown for filter type (Daily/Monthly/Half-Yearly/Yearly/Custom)
- Secondary control that adapts based on selection:
  - Daily: Date picker calendar
  - Monthly: Month/Year selector
  - Half-Yearly: Year selector + H1/H2 toggle
  - Yearly: Year selector
  - Custom: Date range picker (start to end)

---

### 2. Export Utility Functions (`src/utils/exportUtils.ts`)

**CSV Export:**
- Generic function to convert transaction arrays to CSV format
- Includes headers: Date, Type, Amount, Category/Khata, Description
- Filename format: `{page}_transactions_{dateRange}.csv`

**PDF Export:**
- Use browser's `window.print()` with a print-specific stylesheet
- Create a hidden print-optimized container that captures:
  - Page header with filter info
  - Summary cards
  - All tables and charts
- Alternative: Use `html2canvas` + `jsPDF` for programmatic PDF generation

---

## Page-by-Page Implementation

### Expenses Page (`src/pages/Expenses.tsx`)

**Filtering applies to:**
- Expense history table
- Spending by Khata breakdown
- Summary cards (filtered period total vs all-time)
- Khata balances (shows current state, always live)
- Transfer history (already has date filter, will sync)

**Export Options:**
- **CSV**: Export filtered expense transactions
- **PDF**: Full page snapshot including summary, breakdown, and tables

---

### Revenue Page (`src/pages/Revenue.tsx`)

**Filtering applies to:**
- Revenue history table
- Summary cards (filtered period vs all-time)
- Revenue source breakdown (if added)

**Export Options:**
- **CSV**: Export filtered revenue transactions
- **PDF**: Full page snapshot with allocation info

---

### Reports Page (`src/pages/Reports.tsx`)

**Filtering applies to:**
- Monthly Summary tab (filters to show selected period)
- By Khata tab (filters expense data)
- By Source tab (filters revenue data)
- Transfers tab (already has date filter, will sync)
- Summary cards at top

**Export Options:**
- **CSV**: Export all transactions (revenues + expenses) for the period
- **PDF**: Complete financial report with all tabs content

---

### Dashboard Page (`src/pages/Dashboard.tsx`)

**Filtering applies to:**
- Monthly Overview section (replace current simple month filter)
- Expense breakdown for selected period
- Recent transactions (can filter or show "most recent in period")

**Export Options:**
- **CSV**: Export combined transactions for the period
- **PDF**: Full dashboard snapshot

---

## Technical Details

### Date Range Calculation Utility (`src/utils/dateRangeUtils.ts`)

```text
Functions:
+------------------------------------------+
| getDateRange(filterType, filterValue)    |
|   -> { start: Date, end: Date, label }   |
+------------------------------------------+
| Filter Types:                            |
|   - daily: specific date                 |
|   - monthly: first to last of month      |
|   - half-yearly: 6-month period          |
|   - yearly: Jan 1 to Dec 31              |
|   - custom: user-selected range          |
+------------------------------------------+
```

### State Management

Each page will manage filter state locally:
```text
filterType: 'daily' | 'monthly' | 'half-yearly' | 'yearly' | 'custom'
filterValue: {
  date?: Date           // for daily
  month?: number        // for monthly
  year?: number         // for monthly, half-yearly, yearly
  half?: 'H1' | 'H2'    // for half-yearly
  startDate?: Date      // for custom
  endDate?: Date        // for custom
}
```

### PDF Export Implementation

**Option A - Print-based (Simpler):**
- Add print-specific CSS in `index.css`
- Hide non-essential UI elements (navigation, filters) during print
- Call `window.print()`

**Option B - Programmatic (Better control):**
- Install `html2canvas` and `jsPDF` packages
- Capture page content as canvas
- Convert to PDF with proper dimensions

Recommendation: Start with Option A for quick implementation, upgrade to Option B if more control is needed.

---

## Files to Create

1. `src/components/AdvancedDateFilter.tsx` - Main filter component
2. `src/utils/dateRangeUtils.ts` - Date calculation helpers
3. `src/utils/exportUtils.ts` - CSV and PDF export functions
4. `src/components/ExportButtons.tsx` - Reusable export button group

## Files to Modify

1. `src/pages/Expenses.tsx` - Replace MonthFilter, add exports
2. `src/pages/Revenue.tsx` - Replace MonthFilter, add exports
3. `src/pages/Reports.tsx` - Enhance filters, add exports
4. `src/pages/Dashboard.tsx` - Replace MonthFilter, add exports
5. `src/index.css` - Add print-specific styles
6. `package.json` - Add `jsPDF` and `html2canvas` if using Option B

---

## Implementation Order

1. Create date utility functions (`dateRangeUtils.ts`)
2. Create AdvancedDateFilter component
3. Create export utility functions
4. Create ExportButtons component
5. Update Dashboard page (simplest use case)
6. Update Expenses page
7. Update Revenue page
8. Update Reports page (most complex)
9. Add print styles and test PDF export

---

## Dependencies to Install

```text
For programmatic PDF generation (Option B):
- html2canvas: ^1.4.1
- jspdf: ^2.5.1
```

