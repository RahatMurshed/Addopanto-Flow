

# Add Investment & Loan Amount Summary Cards

## What will change

Add two prominent summary cards at the top of the Investors & Loans page, placed before the existing 3 summary cards:

1. **Total Investment Card** (green accent) -- Shows the total invested amount across all investors, with a `TrendingUp` icon
2. **Total Loan Card** (orange accent) -- Shows the total loan amount across all lenders, with a `Landmark` icon

Both cards will use the company currency formatter (`fc`) for proper currency display.

## Layout

The two new cards will be in a 2-column grid row above the existing 3-card row:

```text
+---------------------------+---------------------------+
|   Total Investment        |   Total Loan Amount       |
|   [green icon]            |   [orange icon]           |
|   ৳ 5,00,000              |   ৳ 3,00,000              |
+---------------------------+---------------------------+
|  Investors  |  Lenders   |  Total Obligations         |
|  (existing) |  (existing)|  (existing)                |
+-------------+------------+----------------------------+
```

## Technical details

**File: `src/pages/Stakeholders.tsx`**

- Insert a new `div` with `grid grid-cols-1 md:grid-cols-2 gap-4` between the header and the existing summary cards (around line 163)
- Card 1: "Total Investment" with `totalInvested` value, emerald-themed
- Card 2: "Total Loan Amount" with `totalLoaned` value, orange-themed
- Both use large font sizes for the amount to make them prominent
- No new dependencies or data fetches needed -- `totalInvested` and `totalLoaned` are already computed on lines 52-54
