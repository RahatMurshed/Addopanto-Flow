

## Fix: Include Admission Fees in "Total Collected" Card

### Problem
In `src/pages/BatchDetail.tsx`, the "Total Collected" card displays `batchStats.monthCollected` and compares it against `batchStats.monthDue`. Both values are computed in the loop at lines 252-259, which only iterates over monthly fee months -- admission payments are never included.

This means:
- **Collected** shows only monthly payments (e.g., 1,250) but ignores any admission payments already made
- **Due** shows only monthly fee totals but ignores admission fee totals
- The progress bar and percentage are therefore inaccurate

### Root Cause (lines 252-259)
```
for (const m of includedMonths) {
  monthDue += effMonthly;          // only monthly fees
  monthCollected += payments for month;  // only monthly payments
}
```

Admission paid/due amounts are tracked separately (`admissionCollected`, `admissionPending`) but never added to the card's displayed values.

### Solution
In `src/pages/BatchDetail.tsx`, add admission fees to the filtered stats inside the `batchStats` useMemo:

1. After the per-student monthly loop (around line 259), add the student's admission due and paid amounts:
   - `monthDue += effAdm` (admission fee total for that student)
   - `monthCollected += sum.admissionPaid` (admission amount already paid)

2. This makes the "Total Collected" card show the true total (admission + monthly) collected vs. the true total due.

### Technical Details

**File**: `src/pages/BatchDetail.tsx`

**Change location**: Inside the `batchStats` useMemo, in the `for (const [sid, sum])` loop, after the monthly `includedMonths` loop (after line 259), add:

```typescript
// Include admission fees in total collected/due
monthDue += effAdm;
monthCollected += sum.admissionPaid;
```

**Impact**:
- The "Total Collected" card will now show combined admission + monthly collections
- The progress bar percentage will reflect true overall collection rate
- The "due" subtitle will show the correct total obligation
- No other cards are affected -- "Total Pending" and "Admission pending" already work correctly

This is a one-line-area change in a single file with no side effects.
