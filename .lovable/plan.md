

# Fix: Course Payments showing "Uncategorized / No Batch"

## Root Cause

In `FinancialBreakdown.tsx` line 186, each payment resolves its course/batch name via `batch_enrollment_id`:

```typescript
const enrollment = p.batch_enrollment_id ? data.enrollmentMap.get(p.batch_enrollment_id) : null;
```

For payments recorded before the `batch_enrollments` table existed, `batch_enrollment_id` is null, so enrollment resolves to null and the fallback strings "Uncategorized" / "No Batch" are shown.

## Fix

When `batch_enrollment_id` is null, fall back to the student's enrollments already fetched in `enrollmentMap`. Since these are all enrollments for this specific student, use the first available one as a reasonable default.

### Change in `coursePayments` useMemo (lines 183-200)

```typescript
const coursePayments: CoursePaymentRow[] = useMemo(() => {
  if (!data) return [];
  // Fallback: first enrollment for this student (for payments without batch_enrollment_id)
  const fallbackEnrollment = data.enrollmentMap.size > 0
    ? data.enrollmentMap.values().next().value
    : null;
  return data.payments.map((p) => {
    const enrollment = p.batch_enrollment_id
      ? data.enrollmentMap.get(p.batch_enrollment_id)
      : fallbackEnrollment;
    return {
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      due_date: p.due_date,
      payment_type: p.payment_type,
      user_id: p.user_id,
      courseName: enrollment?.courseName ?? "Uncategorized",
      batchName: enrollment?.batchName ?? "No Batch",
    };
  });
}, [data]);
```

## Files Changed

- `src/components/students/profile/FinancialBreakdown.tsx` -- add fallback enrollment lookup when `batch_enrollment_id` is null

