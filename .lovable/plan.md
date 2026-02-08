

# Plan: Make Settings Functional (Business Name, Currency, Fiscal Year)

## Overview
Currently, when you change business name, currency, or fiscal year start month in Settings, the values are saved to the database but **nothing changes in the app**. This plan will make all three settings actually affect how your data is displayed.

---

## What Will Change

### 1. Currency Symbol
**Current**: All amounts show `৳` (BDT) regardless of your currency setting  
**After**: Amounts will display the correct symbol based on your selection:
- BDT → ৳
- USD → $
- EUR → €
- GBP → £

**Affected pages**: Dashboard, Revenue, Expenses, Khatas, Reports

### 2. Business Name
**Current**: Not used anywhere  
**After**: Your business name will appear in:
- PDF exports (header/title)
- Page headers (when set)
- App navigation/sidebar (optional branding)

### 3. Fiscal Year Start Month
**Current**: Half-yearly filter uses calendar year (H1 = Jan-Jun, H2 = Jul-Dec)  
**After**: Half-yearly filter will respect your fiscal year:
- Example: If fiscal year starts in July, H1 = Jul-Dec, H2 = Jan-Jun
- Yearly filter will also use your fiscal year boundaries

---

## Technical Implementation

### Step 1: Create User Profile Hook
Create a new hook `useUserProfile` to fetch and cache user settings (business name, currency, fiscal year start month) using React Query.

**New file**: `src/hooks/useUserProfile.ts`

### Step 2: Create Currency Formatter Utility
Create a utility function that formats amounts with the correct currency symbol based on user settings.

**New file**: `src/utils/currencyUtils.ts`
```text
+---------------------------+
| getCurrencySymbol(code)   |
| formatCurrency(amount)    |
+---------------------------+
```

### Step 3: Update All Pages to Use Dynamic Currency

**Files to modify**:
- `src/pages/Dashboard.tsx` - Replace hardcoded `৳` with dynamic formatter
- `src/pages/Revenue.tsx` - Replace hardcoded `৳` with dynamic formatter  
- `src/pages/Expenses.tsx` - Replace hardcoded `৳` with dynamic formatter
- `src/pages/Khatas.tsx` - Replace hardcoded `৳` with dynamic formatter
- `src/pages/Reports.tsx` - Replace hardcoded `৳` with dynamic formatter

### Step 4: Update Date Range Utils for Fiscal Year

**File to modify**: `src/utils/dateRangeUtils.ts`

Add functions that calculate fiscal year boundaries:
- `getFiscalYearRange(fiscalStartMonth, year)` 
- `getFiscalHalfRange(fiscalStartMonth, half, year)`

### Step 5: Update Advanced Date Filter Component

**File to modify**: `src/components/AdvancedDateFilter.tsx`

- Fetch user's fiscal year start month
- Apply fiscal year logic to "Yearly" and "Half-Yearly" filter options
- Update labels to reflect fiscal periods (e.g., "FY 2025-26" instead of "Year 2025")

### Step 6: Update PDF Exports with Business Name

**File to modify**: `src/utils/exportUtils.ts`

- Accept business name parameter in `exportToPDF`
- Display business name prominently in PDF header

---

## Summary of Changes

| Setting | Where It Will Be Used |
|---------|----------------------|
| Currency | All amount displays across Dashboard, Revenue, Expenses, Khatas, Reports, Dialogs |
| Business Name | PDF exports header, optionally in page headers |
| Fiscal Year Start | Yearly filter, Half-yearly filter (H1/H2 based on fiscal calendar) |

---

## Files to Create
1. `src/hooks/useUserProfile.ts`
2. `src/utils/currencyUtils.ts`

## Files to Modify
1. `src/pages/Dashboard.tsx`
2. `src/pages/Revenue.tsx`
3. `src/pages/Expenses.tsx`
4. `src/pages/Khatas.tsx`
5. `src/pages/Reports.tsx`
6. `src/utils/dateRangeUtils.ts`
7. `src/components/AdvancedDateFilter.tsx`
8. `src/utils/exportUtils.ts`
9. Dialog components (RevenueDialog, ExpenseDialog, etc.)

