

# Fix Student Details Dashboard - Monthly Fee Display

## Problem

The student details dashboard has a critical bug: **months that start in the future are completely invisible**. For this student, billing starts in March 2026 but today is February 2026, so the month generation logic produces zero months. This causes:

- Monthly Tuition card showing 0 instead of the expected 4,000
- "No billing months yet" in the month grid
- "No months to display yet" in the breakdown list
- Monthly pending not contributing to Total Pending (shows 2,500 instead of 6,500)

The root cause is in `computeStudentSummary` where `allMonths` is capped at `min(course_end_month, currentMonth)`. When `billingStart > currentMonth`, no months are generated.

## Fix

### 1. Update Month Generation Logic (`src/hooks/useStudentPayments.ts`)

Change `allMonths` to include ALL months from `billing_start_month` to `course_end_month` (or `currentMonth` if no end date set). The current month should only affect classification (overdue vs pending), not visibility.

**Current (broken):**
```
capEnd = min(course_end_month, currentMonth)
// if billingStart > currentMonth -> no months generated
```

**Fixed:**
```
capEnd = course_end_month || currentMonth
// whichever is later, so future months show as "pending"
```

Classification stays the same:
- `paid >= fee` -> paid
- `0 < paid < fee` -> partial
- `paid === 0 && month < currentMonth` -> overdue
- `paid === 0 && month >= currentMonth` -> pending

This also means `allMonths` and `allCourseMonths` become identical when `course_end_month` is set, which simplifies the code. We can merge them into one loop.

### 2. Monthly Tuition Card Total Fix (`src/pages/StudentDetail.tsx`)

The Monthly Tuition card currently shows `monthlyPaidTotal + monthlyPendingTotal` as the header amount. Once the month generation is fixed, this will correctly reflect the total expected monthly fees.

However, the card should show the total expected monthly amount (sum of all course month fees), not just paid+pending. This should use the course-duration-based total from `totalExpected - admissionTotal`.

**Change:** Replace `monthlyTotal = monthlyPaidTotal + monthlyPendingTotal` with `monthlyTotal = totalExpected - admissionTotal` so it always shows the full course cost.

### 3. Remove Redundant `allCourseMonths` Logic

Since `allMonths` will now cover the full course range, the separate `allCourseMonths` loop becomes redundant. Merge them into a single month generation that goes from `billingStart` to `max(course_end_month, currentMonth)`.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useStudentPayments.ts` | Fix month generation to include future months; remove redundant `allCourseMonths` |
| `src/pages/StudentDetail.tsx` | Fix Monthly Tuition card total to use course-based expected amount |

## Technical Details

### Updated Month Generation

```typescript
// Generate months from billing_start to the end of the course or current month (whichever is later)
const allMonths: string[] = [];
if (billingStart && student.monthly_fee_amount > 0) {
  let [year, month] = billingStart.split("-").map(Number);
  const courseEnd = student.course_end_month || currentMonth;
  // Use whichever is later: course_end_month or currentMonth
  const endBound = courseEnd > currentMonth ? courseEnd : currentMonth;
  let cursor = billingStart;
  while (cursor <= endBound) {
    allMonths.push(cursor);
    month++;
    if (month > 12) { month = 1; year++; }
    cursor = `${year}-${String(month).padStart(2, "0")}`;
  }
}
```

The `allCourseMonths` loop is removed since `allMonths` now covers the same range. `totalExpectedMonthly` is computed from `allMonths` directly.

### Monthly Tuition Card

```typescript
// Instead of: monthlyTotal = summary.monthlyPaidTotal + summary.monthlyPendingTotal
const monthlyExpectedTotal = summary.totalExpected - summary.admissionTotal;
```

This ensures the card header always shows the full course tuition cost regardless of payment status.

