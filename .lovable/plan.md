

## Add Expense Source Balances to the Expense Sources Page

### What will change

Each expense source card on the `/khatas` page will display its **balance** (allocated - spent +/- transfers), matching the balance information currently shown on the Expenses page.

### Implementation Details

**1. Import `useAccountBalances` in `src/pages/Khatas.tsx`**
- Import the `useAccountBalances` hook from `@/hooks/useExpenses`
- Call it alongside the existing `useExpenseAccounts` hook

**2. Merge balance data into each account card**
- Create a lookup map from the `useAccountBalances` data (keyed by account ID)
- For each card in the grid, look up the matching balance entry and display:
  - **Balance amount** (formatted with currency) -- color-coded green for positive, red for negative/deficit
  - **Total Allocated** and **Total Spent** as smaller detail lines beneath the allocation percentage

**3. Card layout update**
- Below the existing allocation percentage and expected monthly expense, add:
  - `Allocated: [amount]`
  - `Spent: [amount]`
  - `Balance: [amount]` (bold, color-coded)
- Deficit accounts will get a subtle red border or background tint (similar to the Expenses page style)

**4. Summary section update**
- Optionally add a total balance summary below the allocation bar showing aggregate: total allocated, total spent, and net balance across all active accounts

### Technical Notes

- `useAccountBalances` is already defined in `src/hooks/useExpenses.ts` and computes balance as: `totalAllocated + transfersIn - totalSpent - transfersOut`
- No database changes required -- all data is already available
- The `useCompanyCurrency` hook is already imported in Khatas for formatting
- Data Entry Operators and Company Viewers will see balances as read-only (no permission changes needed)

### Files to modify

- `src/pages/Khatas.tsx` -- import `useAccountBalances`, merge balance data into cards, add balance display UI

