

# Plan: Add Pagination to All Listed Items

## Overview

This plan adds pagination controls to all tables and list views across the application, improving performance and user experience when dealing with large datasets.

---

## Pages and Components Requiring Pagination

| Location | List Type | Current State |
|----------|-----------|---------------|
| Dashboard | Recent Transactions | Shows 10 items (hardcoded limit) |
| Expenses Page | Expense History Table | Shows all filtered expenses |
| Revenue Page | Revenue History Table | Shows all filtered revenues |
| Reports Page - Transfers Tab | Transfer History | Uses TransferHistoryCard component |
| Expenses Page | Transfer History | Uses TransferHistoryCard component |

---

## Solution Approach

### 1. Create a Reusable Pagination Hook
A custom hook `usePagination` will handle:
- Current page state
- Items per page (configurable, default: 10)
- Total pages calculation
- Paginated data slicing
- Page navigation functions

### 2. Create a Reusable Pagination Component
A `TablePagination` component that combines with the existing shadcn/ui pagination primitives to provide:
- Page number display ("Page X of Y")
- Previous/Next buttons
- Items per page selector (10, 25, 50)
- Total items count

### 3. Integrate Pagination into Each Page

---

## Technical Implementation

### New Files to Create

**1. `src/hooks/usePagination.ts`**
```text
Custom hook providing:
- currentPage state
- itemsPerPage state  
- totalPages calculation
- paginatedData (sliced array)
- goToPage, nextPage, prevPage functions
- setItemsPerPage function
- resetPage function (for when filters change)
```

**2. `src/components/TablePagination.tsx`**
```text
Reusable component displaying:
- "Showing X-Y of Z entries" text
- Items per page dropdown (10, 25, 50)
- Previous/Next navigation buttons
- Current page indicator
```

### Files to Modify

**3. `src/pages/Dashboard.tsx`**
- Add pagination to Recent Transactions section
- Currently limited to 10 items; add "View More" or full pagination

**4. `src/pages/Expenses.tsx`**
- Import and use `usePagination` hook with `filteredExpenses`
- Add `TablePagination` component below expense table
- Reset page to 1 when date filter changes

**5. `src/pages/Revenue.tsx`**
- Import and use `usePagination` hook with `filteredRevenues`
- Add `TablePagination` component below revenue table
- Reset page to 1 when date filter changes

**6. `src/components/TransferHistoryCard.tsx`**
- Add internal pagination state
- Paginate `displayTransfers` array
- Add pagination controls at bottom of table

---

## Visual Design

```text
+----------------------------------------------------------+
|  Expense History - February 2026                         |
+----------------------------------------------------------+
| Date       | Amount    | Khata      | Description | Act. |
|------------|-----------|------------|-------------|------|
| Feb 7      | ৳5,000    | Food       | Groceries   | Edit |
| Feb 6      | ৳2,500    | Transport  | Fuel        | Edit |
| Feb 5      | ৳1,200    | Utilities  | Electric    | Edit |
| ...        | ...       | ...        | ...         | ...  |
+----------------------------------------------------------+
| Showing 1-10 of 47 entries  [10 ▾]  [< Prev] [Next >]    |
+----------------------------------------------------------+
```

---

## Implementation Details

### usePagination Hook Interface
```text
Input:
- items: T[] (the full array to paginate)
- defaultItemsPerPage: number (default: 10)

Output:
- currentPage: number
- itemsPerPage: number
- totalPages: number
- totalItems: number
- paginatedItems: T[]
- startIndex: number (for "Showing X-Y" display)
- endIndex: number
- goToPage: (page: number) => void
- nextPage: () => void
- prevPage: () => void
- setItemsPerPage: (count: number) => void
- resetPage: () => void
```

### TablePagination Component Props
```text
- currentPage: number
- totalPages: number
- totalItems: number
- startIndex: number
- endIndex: number
- itemsPerPage: number
- onPageChange: (page: number) => void
- onItemsPerPageChange: (count: number) => void
- itemsPerPageOptions?: number[] (default: [10, 25, 50])
```

---

## Page-Specific Changes

### Dashboard - Recent Transactions
- Keep the 10-item limit for the dashboard view
- Add a "View All Transactions" link to navigate to a detailed view (optional enhancement)
- Or add simple Previous/Next if more than 10 transactions exist

### Expenses Page
- Apply pagination to `filteredExpenses` array
- Show pagination only when entries exceed page size
- Reset to page 1 when date range changes

### Revenue Page
- Apply pagination to `filteredRevenues` array
- Show pagination only when entries exceed page size
- Reset to page 1 when date range changes

### TransferHistoryCard Component
- Add optional `enablePagination` prop (default: true)
- Internal state for page management
- Works independently for both Expenses and Reports pages

---

## Reset Behavior

When filters change (date range, year selector, etc.), pagination automatically resets to page 1 using a `useEffect`:
```text
useEffect(() => {
  resetPage();
}, [dateRange]);
```

---

## Expected Results

| Before | After |
|--------|-------|
| All items rendered at once | Items paginated (10/25/50 per page) |
| Slow rendering with many entries | Fast, responsive tables |
| No control over view size | User can choose items per page |
| Scrolling to find entries | Navigate with pagination controls |

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/usePagination.ts` | Create |
| `src/components/TablePagination.tsx` | Create |
| `src/pages/Dashboard.tsx` | Modify (add pagination to Recent Transactions) |
| `src/pages/Expenses.tsx` | Modify (add pagination to Expense History) |
| `src/pages/Revenue.tsx` | Modify (add pagination to Revenue History) |
| `src/components/TransferHistoryCard.tsx` | Modify (add internal pagination) |

---

## Accessibility Considerations

- Pagination controls include proper ARIA labels
- Keyboard navigation support (already in shadcn/ui components)
- Clear visual indication of current page
- Disabled states for Previous/Next at boundaries

