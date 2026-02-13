

# Monthly Overdue Section for Students Dashboard

## Overview

Add a new "Monthly Overdue Report" section below the existing students table on the Students page. This section lets admins select a specific month and view all students with overdue fees for that month, complete with summary metrics, severity indicators, and export functionality.

---

## Layout

The new section appears below the existing students table and includes:

1. **Section Header** with month selector dropdown and filter toggle (specific month vs. all overdue)
2. **Three Summary Metric Cards** showing total overdue students, total overdue amount, and average days overdue
3. **Overdue Students Table** with severity indicators
4. **Export Button** (CSV/PDF) for the overdue report

---

## Implementation Details

### 1. New Component: `src/components/StudentOverdueSection.tsx`

A self-contained component that receives the students list, all payments, and student summaries as props.

**Props:**
- `students` - all student records
- `allPayments` - all student payments
- `studentSummaries` - pre-computed summary map
- `currency` - user currency string

**State:**
- `selectedMonth` - the month string (e.g., "2025-01") from a dropdown, defaults to previous month
- `filterMode` - "specific" (one month) or "all" (all overdue months)

**Month Dropdown:** Uses the existing `Select` component, populated with months from all students' billing ranges. Defaults to the month before the current month.

**Computed Data (per selected month or all):**
For each student, check if the selected month is in their `monthlyOverdueMonths` or `monthlyPartialMonths` arrays. Build a table row with:

- **Student Name** (clickable, navigates to detail)
- **Monthly Fee** - the expected fee for that month
- **Amount Paid** - from `monthlyPaymentsByMonth`
- **Amount Remaining** - fee minus paid
- **Overdue Month(s)** - the month label(s)
- **Days Overdue** - calculated as days from end of that month to today
- **Severity Badge** - based on days overdue:
  - 1-30 days: Yellow "Low"
  - 31-60 days: Orange "Medium"  
  - 61-90 days: Red "High"
  - 90+ days: Dark red "Critical"

**Summary Metrics (3 cards at top):**
- Total students with overdue payments for selected month
- Total overdue amount (sum of remaining across all overdue students)
- Average days overdue

**Export:**
- CSV: Headers = Student Name, Student ID, Monthly Fee, Amount Paid, Amount Remaining, Overdue Month, Days Overdue, Severity
- PDF: Uses existing `exportToPDF` utility with the section element ID

### 2. Integrate into `src/pages/Students.tsx`

- Import and render `StudentOverdueSection` below the students table card
- Pass `students`, `allPayments`, `studentSummaries`, and `currency` as props
- Only render when there are students

### 3. Days Overdue Calculation

```
daysOverdue = daysSince(lastDayOfOverdueMonth, today)
// e.g., for month "2025-01": lastDay = Jan 31, 2025
// If today is Feb 13, 2026: daysOverdue = 379
```

Using `differenceInDays` from `date-fns`.

### 4. Styling

- Summary cards use red/warning theme: red icons, red text for amounts
- Table rows have a left border colored by severity (yellow/orange/red/dark-red)
- Severity badges use matching color variants
- Section header has a red `AlertTriangle` icon

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/StudentOverdueSection.tsx` | **Create** - New overdue report component |
| `src/pages/Students.tsx` | **Modify** - Import and render the new section below the table |

## Edge Cases

- Students with no monthly fee (`monthly_fee_amount === 0`) are excluded
- Students whose billing hasn't started yet have no overdue months
- If no students are overdue for the selected month, show an empty state message
- Partial payments show remaining amount, not full fee
- "All overdue" mode aggregates across all months, showing one row per student-month combination
