
# Plan: Improve Recent Transactions Layout in Dashboard

## Current Issues Identified

### Issue 1: Khata Tags Displayed Inline
Currently, the Khata/category badge is shown inline with the date in the description area:
```
[Icon] Description
       Feb 8, 2026 • [Category Badge]    +৳5,000
```

### Issue 2: Pagination Only Shows When >10 Items
The pagination controls are conditionally rendered only when `data.recentTransactions.length > 10`, making it invisible for users with fewer transactions.

---

## Solution

### Change 1: Convert to Table Layout with Separate Khata Column
Transform the Recent Transactions from a list/card layout to a proper table with columns:
- **Date** - Transaction date
- **Description** - Transaction description  
- **Khata/Category** - Separate column for the Khata badge (only for expenses)
- **Amount** - Transaction amount with +/- indicator

### Change 2: Always Show Pagination Controls
Remove the condition that hides pagination when items ≤ 10. This provides consistent UI and allows users to change items per page even with fewer entries.

---

## Visual Layout After Changes

```text
+----------------------------------------------------------------+
| Recent Transactions                                            |
| Latest income and expenses                                     |
+----------------------------------------------------------------+
| Date         | Description      | Khata        | Amount        |
|--------------|------------------|--------------|---------------|
| Feb 8, 2026  | Monthly Salary   | —            | +৳50,000      |
| Feb 7, 2026  | Groceries        | [Food]       | -৳5,000       |
| Feb 6, 2026  | Fuel             | [Transport]  | -৳2,500       |
| Feb 5, 2026  | Freelance Work   | —            | +৳15,000      |
+----------------------------------------------------------------+
| Showing 1-10 of 45 entries  [10 ▾]  [< Prev] Page 1 of 5 [Next>]|
+----------------------------------------------------------------+
```

---

## Technical Implementation

### File to Modify: `src/pages/Dashboard.tsx`

**Changes:**

1. **Import Table components** (add to imports around line 6):
   - Import `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from `@/components/ui/table`

2. **Replace list layout with table** (lines 624-669):
   - Convert the current `div` with `space-y-3` to a proper `Table` component
   - Create table header with columns: Date, Description, Khata, Amount
   - Move the icon inline with description
   - Move Khata badge to its own column (show "—" for revenues which don't have Khata)

3. **Always show pagination** (line 671):
   - Remove the condition `data.recentTransactions.length > 10 &&`
   - Pagination will always be visible when there are transactions

---

## Expected Results

| Before | After |
|--------|-------|
| List/card layout | Proper table with columns |
| Khata inline with date | Khata in separate column |
| Pagination hidden when ≤10 items | Pagination always visible |
| Harder to scan data | Easy column-based scanning |

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replace list layout with table, add Khata column, always show pagination |
