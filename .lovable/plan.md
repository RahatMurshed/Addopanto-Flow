

## Fix: Monthly Fee Breakdown Only Shows Current Month Instead of Full Duration

### Root Cause

In `computeStudentSummary` (line 382 of `src/hooks/useStudentPayments.ts`):

```javascript
const endBound = courseEnd < currentMonth ? courseEnd : currentMonth;
```

This caps `allMonths` at the current month (2026-03), so future months (2026-04, 2026-05, 2026-06) are never added to the array. The student has a 4-month course, but only March is generated.

The cap is unnecessary because the month classification loop (lines 422-436) already correctly categorizes future months as "pending" (`else` branch at line 434).

### Fix

**File: `src/hooks/useStudentPayments.ts`** -- Line 382

Change:
```javascript
const endBound = courseEnd < currentMonth ? courseEnd : currentMonth;
```

To:
```javascript
const endBound = courseEnd;
```

This allows all months from `billingStart` through `courseEnd` (or `currentMonth` if no end date) to be generated. The existing classification logic will correctly mark:
- Past unpaid months as "overdue"
- Current month as "pending" 
- Future months as "pending"

### Impact

- Monthly Fee Breakdown grid will show all 4 months
- Monthly Tuition card will show "Pending (4 mo)" instead of "Pending (1 mo)"
- Overall Total will reflect the full pending amount
- No database changes needed

