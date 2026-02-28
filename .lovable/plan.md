

## Batch Duration in Months+Days and Payment Mode Selection

### What Changes

**Currently:** Batch duration is a single "months" integer. All batches assume monthly recurring payments.

**After this change:**
- Duration can be set as "X months Y days" (e.g., 1 month 15 days, or just 15 days, or 3 months 0 days)
- Each batch has a **Payment Mode**: either "One-Time Payment" (single lump sum for the entire course) or "Monthly Payment" (recurring monthly fees as today)

---

### 1. Database Migration

Add two new columns to the `batches` table:

- `course_duration_days` (integer, nullable, default 0) -- the "days" part of the duration
- `payment_mode` (text, not null, default `'monthly'`) -- values: `'one_time'` or `'monthly'`

Existing batches will default to `payment_mode = 'monthly'` and `course_duration_days = 0`, preserving current behavior.

---

### 2. BatchDialog Form Updates

**Duration section** -- Replace the single "Duration (months)" input with two side-by-side inputs:
- "Duration Months" (number, min 0)
- "Duration Days" (number, min 0, max 30)
- Validation: at least one must be > 0

**Payment Mode section** -- Add a toggle/radio group below the duration:
- "Monthly Payment" (default) -- shows "Default Monthly Fee" and "Default Admission Fee" fields as today
- "One-Time Payment" -- hides "Default Monthly Fee", renames "Default Admission Fee" to "Course Fee (One-Time)"

**Fee fields adapt based on payment mode:**
- Monthly mode: Admission Fee + Monthly Fee (current behavior)
- One-time mode: Single "Course Fee" field (stored in `default_admission_fee` column)

---

### 3. TypeScript Types Update

Update `Batch` and `BatchInsert` interfaces in `useBatches.ts`:
- Add `course_duration_days: number | null`
- Add `payment_mode: 'one_time' | 'monthly'`

---

### 4. Payment Schedule Generation

**`enrollmentSync.ts` and `BatchEnrollDialog.tsx`** -- both have `generatePaymentSchedule` / `generateEnrollmentPaymentSchedule`:

- If `payment_mode = 'one_time'`: generate only ONE schedule row with `payment_type = 'admission'` using `default_admission_fee` as the total course fee. No monthly rows.
- If `payment_mode = 'monthly'`: current behavior (admission row + monthly rows based on `course_duration_months`)

---

### 5. Display Updates Across the App

All locations that display "Duration: X months" need updating to show the combined format:

| File | Change |
|---|---|
| `BatchDialog.tsx` | Form inputs (covered above) |
| `StudentDialog.tsx` | Badge display "Duration: X months Y days" |
| `AcademicStep.tsx` | Badge display |
| `StudentDetail.tsx` | Duration display |
| `StudentProfilePage.tsx` | Duration display |
| `EnrollmentTimeline.tsx` | Duration display |
| `BatchDetail.tsx` | Batch info cards |
| `Batches.tsx` | Table column |
| `CourseDetail.tsx` | Table column |

A shared helper function `formatDuration(months: number | null, days: number | null): string` will be created in a utils file to standardize display (e.g., "1 month 15 days", "15 days", "3 months").

---

### 6. Computation Adjustments

**`computeStudentSummary`** and **`computeLifetimeMetrics`**: These use `course_duration_months` to calculate billing ranges and total expected fees.

- For **one-time payment** batches: the total expected = `default_admission_fee` only. No monthly billing range needed.
- For **monthly payment** batches: behavior unchanged; `course_duration_days` is informational only (billing still operates on full-month boundaries).

**End date auto-calculation**: When `course_duration_months` and `course_duration_days` are both set, `end_date` can be auto-suggested as `start_date + months + days`.

---

### 7. StudentPaymentDialog Adjustment

When recording payments for a student in a **one-time payment** batch:
- The "Payment Type" selector should default to and only show "Admission" (which represents the one-time course fee)
- Hide the monthly payment option and month selector

---

### Technical Details

**Files to modify:**
1. New migration SQL -- add `course_duration_days` and `payment_mode` columns to `batches`
2. `src/hooks/useBatches.ts` -- update interfaces
3. `src/components/dialogs/BatchDialog.tsx` -- form redesign with duration fields and payment mode toggle
4. `src/utils/enrollmentSync.ts` -- adapt schedule generation for one-time mode
5. `src/components/dialogs/BatchEnrollDialog.tsx` -- adapt schedule generation for one-time mode
6. `src/components/dialogs/StudentDialog.tsx` -- display updates
7. `src/components/StudentWizardSteps/AcademicStep.tsx` -- display updates
8. `src/pages/StudentDetail.tsx` -- display updates
9. `src/pages/StudentProfilePage.tsx` -- display updates
10. `src/components/students/profile/EnrollmentTimeline.tsx` -- display updates
11. `src/pages/BatchDetail.tsx` -- display updates
12. `src/pages/Batches.tsx` -- display updates
13. `src/pages/CourseDetail.tsx` -- display updates
14. `src/components/dialogs/StudentPaymentDialog.tsx` -- restrict options for one-time batches
15. `src/utils/studentMetrics.ts` -- adjust `computeLifetimeMetrics` for one-time mode
16. `src/hooks/useStudentPayments.ts` -- adjust `computeStudentSummary` for one-time mode
17. New `src/utils/durationFormat.ts` -- shared `formatDuration` helper

