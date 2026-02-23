
# Employee Performance Dashboard

## Overview
Add a new "Performance" tab to the Employee Detail page that combines attendance and payroll data into a unified performance view with visual metrics, trend charts, and a performance score.

## Changes

### 1. New Hook: `useEmployeePerformance` (`src/hooks/useEmployeePerformance.ts`)
A dedicated hook that fetches and aggregates performance data for a single employee across a configurable date range (last 6 months by default):
- Fetches all attendance records and salary payments for the date range
- Computes monthly attendance percentage (present + half-day*0.5 / working days)
- Computes monthly salary payment status (paid/pending/partial)
- Calculates an overall "Performance Score" (weighted: 70% attendance, 30% salary regularity)
- Returns structured data for charts and summary cards

### 2. Updated Employee Detail Page (`src/pages/EmployeeDetail.tsx`)
Add a "Performance" tab (between Attendance and Leaves) with the following sections:

**Performance Score Card**
- Large circular/radial score (0-100) color-coded: green (80+), orange (50-79), red (below 50)
- Text label: "Excellent" / "Good" / "Needs Improvement"

**Summary KPI Row (4 cards)**
- Average Attendance % (last 6 months)
- Total Days Present (period)
- Salary Payments On Time (count of months paid)
- Total Leaves Taken (period)

**Attendance Trend Chart**
- Bar chart (recharts) showing monthly attendance percentage over last 6 months
- Color-coded bars matching attendance quality

**Payroll vs Attendance Correlation**
- Combined bar+line chart: bars for attendance %, line for salary amount paid each month
- Only visible when `salaryVisible` is true; otherwise shows attendance-only chart

**Monthly Breakdown Table**
- Columns: Month, Days Present, Days Absent, Half Days, Leaves, Attendance %, Salary Status (Paid/Pending)
- Salary Status column hidden when `salaryVisible` is false
- Rows sorted newest first

### 3. Access Control
- Performance tab visible to all who can view the employee (Admin, Cipher, permitted Moderators)
- Salary-related metrics within the tab respect the existing `salaryVisible` toggle
- Moderators see attendance-only performance metrics (no salary correlation)

## Technical Details

**Data flow:**
- `useEmployeePerformance(employeeId, months)` calls existing `employee_attendance` and `employee_salary_payments` tables
- Aggregates client-side using `useMemo` for efficiency
- No new database tables or migrations required

**Chart library:** Uses existing `recharts` (BarChart, LineChart, ResponsiveContainer, ComposedChart)

**Performance score formula:**
```
attendanceScore = avg monthly attendance % (0-100)
salaryScore = (months with salary paid / total months) * 100
overallScore = (attendanceScore * 0.7) + (salaryScore * 0.3)
// For moderators without salary visibility: overallScore = attendanceScore
```

**Tab grid update:**
- TabsList changes from `grid-cols-4` to `grid-cols-5` when Performance tab is shown

### Files Modified
- `src/hooks/useEmployeePerformance.ts` -- new file, performance data aggregation hook
- `src/pages/EmployeeDetail.tsx` -- add Performance tab with charts, KPIs, and table

### Files NOT Modified
- No database migrations needed
- No changes to hooks/useEmployees.ts
- No changes to Employees list page
