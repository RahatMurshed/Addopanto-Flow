

# Add Course Duration Fields and Redesign Student Detail Dashboard

## Overview

Add `course_start_month` and `course_end_month` columns to the students table to define the full enrollment period. Redesign the student detail page with a modern three-card dashboard layout, a visual monthly breakdown bounded by course dates, and an overall progress bar.

---

## 1. Database Migration

Add two new nullable text columns to `students`:

| Column | Type | Notes |
|--------|------|-------|
| course_start_month | text | "YYYY-MM" format, defaults to billing_start_month value |
| course_end_month | text | "YYYY-MM" format, nullable (open-ended if not set) |

The existing `billing_start_month` remains as-is (it controls when billing begins, which may differ from course start). The new fields define the course duration window.

## 2. Student Dialog Changes (`StudentDialog.tsx`)

Replace the plain text input for "First Billing Month" with a proper month/year picker approach, and add two new date-picker-style month selectors:

- **Course Start Month**: Month picker (popover with month/year grid or simple YYYY-MM input with calendar guidance)
- **Course End Month**: Month picker (same style, must be >= course start month)
- **First Billing Month**: Stays as-is but auto-fills from Course Start Month when left blank

Since React Day Picker doesn't have a native month-only picker, these will use simple YYYY-MM inputs with validation. The enrollment date field already has a proper date picker.

## 3. Redesigned Student Detail Page (`StudentDetail.tsx`)

### Layout: Three summary cards at top, then monthly visual, then payment history

**Card 1 -- Admission Fee:**
- Icon with colored background circle
- Total admission fee (large number)
- Paid amount in green
- Pending amount in red/orange
- Mini progress bar

**Card 2 -- Monthly Tuition:**
- Total expected tuition (months in range x rate)
- Paid amount and month count in green
- Pending/overdue amount and month count in red/orange
- Mini progress bar

**Card 3 -- Overall Total:**
- Grand total (admission + monthly combined)
- Total paid in green
- Total pending in red
- Overall completion percentage with progress bar

**Below cards:**
- Full-width monthly fee visual grid (existing `StudentMonthGrid`) showing months from course_start_month to course_end_month (or current month if no end set)
- Overall payment completion progress bar with percentage label
- Monthly breakdown list (existing `MonthlyBreakdownList`) with paid/overdue/pending sections

### Changes to computation logic

Update `computeStudentSummary` to accept optional `course_end_month`. When set, the month range is bounded by it instead of always extending to current month. This affects which months are "pending" vs just not yet in range.

## 4. Hook and Type Updates

### `useStudents.ts`
- Add `course_start_month` and `course_end_month` to `Student` interface and `StudentInsert` interface

### `useStudentPayments.ts`
- Update `computeStudentSummary` to accept `course_end_month` parameter
- When `course_end_month` is set, cap the month generation at that month instead of current month
- Add `totalExpected` field to summary (admission total + all monthly fees for the course duration)

### `StudentDialog.tsx`
- Add `course_start_month` and `course_end_month` to form schema with YYYY-MM validation
- Add two new input fields in the form grid
- Auto-populate `billing_start_month` from `course_start_month` if not manually set

## 5. Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useStudents.ts` | Add `course_start_month`, `course_end_month` to Student and StudentInsert interfaces |
| `src/hooks/useStudentPayments.ts` | Update `computeStudentSummary` to respect course_end_month; add `totalExpected` to summary |
| `src/components/StudentDialog.tsx` | Add course_start_month and course_end_month fields with YYYY-MM inputs |
| `src/pages/StudentDetail.tsx` | Redesign with 3 summary cards, progress bar, cleaner layout |

## Technical Details

### Database Migration SQL

```sql
ALTER TABLE students
  ADD COLUMN course_start_month text,
  ADD COLUMN course_end_month text;

-- Backfill course_start_month from billing_start_month for existing rows
UPDATE students SET course_start_month = billing_start_month WHERE course_start_month IS NULL;
```

### Updated StudentSummary Fields

```typescript
interface StudentSummary {
  // existing fields...
  totalExpected: number;        // admissionTotal + sum of all monthly fees across course duration
  overallPercent: number;       // (totalPaid / totalExpected) * 100
}
```

### Month Range Logic

```typescript
// If course_end_month is set, use min(course_end_month, currentMonth) as the end
// If not set, use currentMonth (existing behavior)
const endMonth = student.course_end_month
  ? (student.course_end_month < currentMonth ? student.course_end_month : currentMonth)
  : currentMonth;
```

### Student Detail Card Layout

Three cards in a responsive grid (`grid-cols-1 md:grid-cols-3`), each with:
- Header with icon and title
- Large primary number (total)
- Two sub-lines: paid (green text) and pending (red/orange text)
- Thin progress bar at bottom of card

Below: full-width card containing the month grid and breakdown list, plus an overall progress bar with percentage.

### Validation

- `course_start_month`: optional, YYYY-MM format
- `course_end_month`: optional, YYYY-MM format, must be >= course_start_month if both set
- If course_start_month is set and billing_start_month is empty, auto-fill billing_start_month

