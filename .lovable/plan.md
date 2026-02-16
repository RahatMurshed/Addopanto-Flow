

# Fix Monthly Column: Duration Cap and Partial Display

## Problem
1. **Wrong month count**: Monthly column shows 6 months instead of the actual 4-month course duration because the billing month generator extends beyond `course_end_month` to `currentMonth`.
2. **No partial detail**: When monthly status is partial, it just shows "X months pending" instead of showing paid/total like "250/1250 Partial".

## Changes

### File 1: `src/hooks/useStudentPayments.ts` (line 217)
**Fix**: When `course_end_month` is set, cap month generation at that boundary instead of extending to `currentMonth`.

Current logic:
```
const endBound = courseEnd > currentMonth ? courseEnd : currentMonth;
```
This takes the MAX, so months keep generating past the course end date.

Fixed logic:
```
const endBound = student.course_end_month ? courseEnd : currentMonth;
```
When the course has a defined end, stop there. Only use `currentMonth` as fallback when no end is set.

### File 2: `src/pages/Students.tsx` (lines 517-528)
**Fix**: Replace the generic "X months pending" badge with differentiated statuses:

- **Partial**: Show `paid/total Partial` in amber (e.g., "250/1,250 Partial") using `fc()` for currency formatting
- **Overdue**: Show `X/Y Overdue` in red (e.g., "2/4 Overdue")
- **Pending** (future only): Show `X months pending` in orange
- **Paid**: Green "Paid" badge (unchanged)

Priority order: Partial > Overdue > Pending > Paid

