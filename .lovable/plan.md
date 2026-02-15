
## Make Revenue and Achievements Green Across the App

### Summary

Change all revenue-related and achievement/positive indicators from the current orange (`text-primary`) color to green (`text-success` / green variants), consistently across all pages. Expenses stay red (`text-destructive`).

### Color Mapping

| Element | Current Color | New Color |
|---|---|---|
| Revenue amounts, icons, badges | `text-primary` (orange) | `text-success` / `text-green-600` |
| Revenue gradient backgrounds | `from-primary/5 to-primary/10 border-primary/20` | `from-green-500/5 to-green-500/10 border-green-500/20` |
| Revenue chart lines/fills | `hsl(var(--primary))` | `hsl(var(--success))` / `hsl(142, 76%, 36%)` |
| Revenue badges in transactions | `text-primary border-primary/30` | `text-green-600 dark:text-green-400 border-green-500/30` |
| Positive achievements (profit, paid status) | Already green -- no change needed |
| Expenses | `text-destructive` (red) -- no change |

### Files to Modify

**1. `src/pages/Dashboard.tsx`**
- Metrics array: Change "Total Revenue" color from `text-primary` to `text-success`
- Period Overview revenue card: Change gradient from `from-primary/...` to `from-green-500/...`
- Revenue text: `text-primary` to `text-success`
- Revenue chart gradient and stroke: `hsl(var(--primary))` to `hsl(142, 76%, 36%)`
- Recent transactions: Revenue amounts from `text-primary` to `text-success`
- Revenue category badge: from `text-primary border-primary/30` to `text-green-600 dark:text-green-400 border-green-500/30`

**2. `src/pages/Revenue.tsx`**
- Summary card gradient: `from-primary/...` to `from-green-500/...`
- Revenue total text and icons: `text-primary` to `text-success`

**3. `src/pages/Reports.tsx`**
- Revenue summary card icon and value: `text-primary` to `text-success`
- Average Revenue card: `text-primary` to `text-success`
- YoY revenue value: `text-primary` to `text-success`
- Revenue by Source header icon: `text-primary` to `text-success`
- Revenue bar chart fill: `hsl(var(--primary))` to `hsl(142, 76%, 36%)`
- Monthly breakdown table revenue column: `text-primary` to `text-success`
- Allocation table allocated column: `text-primary` to `text-success`

**4. `src/pages/Expenses.tsx`** (if any revenue references exist)
- Check for any revenue-colored elements and update

### Technical Notes

- Using `text-success` (which maps to `hsl(142, 76%, 36%)`) for text elements -- this is already defined in the design system
- For chart colors, using the raw HSL `hsl(142, 76%, 36%)` since recharts needs direct color values
- Dark mode variants: `text-green-600 dark:text-green-400` for elements not using the `success` CSS variable
- No database changes required
- No new dependencies needed
