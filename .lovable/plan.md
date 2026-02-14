

# Fix Student Detail Page: Use Batch Defaults as Fallback

## Problem

When a student is linked to a batch, their `admission_fee_total` and `monthly_fee_amount` in the database may be 0 (either from creation before the auto-fill feature, or a race condition during creation). The Student Detail page relies solely on these student-level fields, causing:

1. **"No admission fee set"** -- even though the batch has a 2,500 default
2. **"No monthly fee set"** -- even though the batch has a 1,250 default
3. **Overall Total shows 0** -- because expected total is calculated from 0 fees
4. **0% complete** -- despite having a 2,500 admission payment recorded
5. **Monthly Fee Breakdown section hidden** -- because `student.monthly_fee_amount` is 0

## Solution

### 1. StudentDetail.tsx -- Use batch defaults as fallback

When computing the summary and rendering cards, create "effective" fee values that fall back to batch defaults when the student's own values are 0:

```text
effectiveAdmissionFee = student.admission_fee_total > 0 
  ? student.admission_fee_total 
  : batch?.default_admission_fee ?? 0

effectiveMonthlyFee = student.monthly_fee_amount > 0 
  ? student.monthly_fee_amount 
  : batch?.default_monthly_fee ?? 0
```

Pass these effective values to `computeStudentSummary` instead of the raw student object. Also use effective values for the Monthly Tuition card check and the Monthly Fee Breakdown visibility.

### 2. Fix computeStudentSummary call

Replace the direct `student` object with a modified version that uses effective fees:

```typescript
const effectiveStudent = {
  ...student,
  admission_fee_total: effectiveAdmissionFee,
  monthly_fee_amount: effectiveMonthlyFee,
  course_start_month: student.course_start_month || batchCourseStartMonth,
  course_end_month: student.course_end_month || batchCourseEndMonth,
};
```

Also derive `batchCourseStartMonth` and `batchCourseEndMonth` (same logic as StudentDialog) so the monthly breakdown correctly spans the batch's duration.

### 3. Update all UI references

- Admission Fee card: use `effectiveAdmissionFee` instead of `summary.admissionTotal` check
- Monthly Tuition card: use `effectiveMonthlyFee` instead of `student.monthly_fee_amount`
- Monthly Fee Breakdown section: use `effectiveMonthlyFee` for visibility and display
- Overall Total: automatically correct since summary uses effective values

### Files to Modify

- **`src/pages/StudentDetail.tsx`** -- Add effective fee computation, derive batch course months, pass effective student to summary, update card rendering conditions

### Technical Details

Add before the `summary` useMemo:

```typescript
const batchCourseStartMonth = useMemo(() => {
  if (!batch?.start_date) return "";
  const d = new Date(batch.start_date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}, [batch]);

const batchCourseEndMonth = useMemo(() => {
  if (!batch?.start_date || !batch?.course_duration_months) return "";
  const d = new Date(batch.start_date);
  d.setMonth(d.getMonth() + batch.course_duration_months - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}, [batch]);

const effectiveAdmissionFee = Number(student?.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
const effectiveMonthlyFee = Number(student?.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;
```

Then in the summary useMemo, pass a modified student object with these effective values and the batch-derived course months as fallback.
