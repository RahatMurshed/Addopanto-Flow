

## Fix Data Entry Operator (DEO) Role Issues

### Summary
After thorough code review of the DEO role implementation, I found several issues that need fixing for proper permission enforcement.

---

### Issues Found

#### 1. Dashboard Quick Action Cards Are Non-Functional (Critical)
The DEO dashboard shows quick action cards (Add Student, Record Payment, etc.) with `cursor-pointer` styling, but **none of them have `onClick` handlers**. Clicking them does nothing.

**Fix**: Wire each card to open the corresponding dialog or navigate to the appropriate page with the add dialog pre-opened.

**File**: `src/pages/Dashboard.tsx` (lines 464-476)

---

#### 2. No Route Protection for Revenue, Expenses, Khatas Pages (Critical)
DEOs without the relevant permissions can navigate directly to `/revenue`, `/expenses`, `/khatas` via URL and see full financial data. Reports and Settings have redirect guards, but these pages do not.

**Fix**: Add `useEffect` redirect guards on Revenue, Expenses, and Khatas pages that redirect DEOs without the corresponding permissions back to the dashboard.

**Files**: 
- `src/pages/Revenue.tsx` -- redirect if DEO and no revenue permissions
- `src/pages/Expenses.tsx` -- redirect if DEO and no expense permissions  
- `src/pages/Khatas.tsx` -- redirect if DEO and no expense source permissions

---

#### 3. Revenue/Expenses Pages Show Full Financial Summaries to DEOs (Medium)
Even when a DEO has "Add Revenue" permission, they can see financial totals, trend data, period comparisons, and export buttons. According to the role hierarchy, DEOs should not see financial analytics.

**Fix**: Hide summary cards, period overview, charts, and export buttons for DEOs. Show only the add button and history table on Revenue/Expenses pages.

**Files**: `src/pages/Revenue.tsx`, `src/pages/Expenses.tsx`

---

#### 4. Batches/Students Pages Missing DEO Guards for Detail Navigation (Low)
DEOs without edit/view permissions can click the "Eye" view button on Students/Batches pages. The detail pages redirect them, but the button shouldn't appear at all if they can't access it.

**Status**: Already partially handled -- the Eye button on Students is hidden for DEOs (line 326-329), and BatchDetail redirects DEOs without `canEditBatch`. This is working correctly.

---

### Technical Details

**Dashboard Quick Actions (src/pages/Dashboard.tsx)**:
- Import missing dialog components (StudentDialog, StudentPaymentDialog, BatchDialog)
- Add dialog state variables for each action type
- Wire `onClick` on each quick action card to open the corresponding dialog
- Render dialog components conditionally

**Route Protection Pattern** (same as Reports.tsx):
```
useEffect(() => {
  if (!companyLoading && isDataEntryOperator && !hasRelevantPermission) {
    navigate("/dashboard", { replace: true });
  }
}, [companyLoading, isDataEntryOperator, ...]);
```

**Financial Data Hiding Pattern**:
- Wrap summary cards, charts, and export buttons in `{!isDataEntryOperator && (...)}` blocks
- Keep the add button and history table visible for DEOs with appropriate permissions

### Files to Modify
- `src/pages/Dashboard.tsx` -- wire quick action card onClick handlers and dialogs
- `src/pages/Revenue.tsx` -- add DEO redirect guard and hide financial summaries
- `src/pages/Expenses.tsx` -- add DEO redirect guard and hide financial summaries
- `src/pages/Khatas.tsx` -- add DEO redirect guard

