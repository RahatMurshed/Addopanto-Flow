

# Three Targeted Fixes

## 1. Default filter mode set to "All Time"
In `src/components/BatchDateFilter.tsx`, change `getDefaultBatchFilter()` to return `mode: "alltime"` instead of `mode: "monthly"`. This applies to both the Batches list and Batch Detail pages since they both call this function.

## 2. Batch Detail page: Overdue card layout swap
In `src/pages/BatchDetail.tsx` (lines 405-415), swap the order so the overdue **amount** is the large number on top, and the student count is the smaller text below.

**Before:**
- Big: student count (e.g., "3")
- Small: "students overdue"
- Below: overdue amount

**After:**
- Big: overdue amount (e.g., "৳3,000")
- Small: "3 students overdue"

## 3. Batches page: Overdue summary card shows money
In `src/pages/Batches.tsx` (line 250), change the Overdue summary card from showing `totalOverdue` (student count) to showing the total overdue **amount** in currency format. Add student count as smaller secondary text.

**Before:** Shows "3" (number of students)
**After:** Shows "৳3,000" (overdue amount) with "3 students" below

### Technical Details

**Files modified:**
- `src/components/BatchDateFilter.tsx` — line 26: change `mode: "monthly"` to `mode: "alltime"`
- `src/pages/Batches.tsx` — lines 245-251: add `totalOverdueAmount` memo, update Overdue card to show currency amount as primary and student count as secondary
- `src/pages/BatchDetail.tsx` — lines 405-415: swap the overdue amount and student count display order
