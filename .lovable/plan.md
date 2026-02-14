
# Fix Pending Amount in Batches List Page

## Problem
The "Pending" column in the batches table and the "Total Pending" summary card both show 0 because the `batchAnalytics` computation on the Batches page does not apply batch default fee fallback. When students have `admission_fee_total` or `monthly_fee_amount` set to 0, the system should inherit from the batch's `default_admission_fee` and `default_monthly_fee` -- but this logic is only implemented on the Batch Detail page, not the Batches list page.

## Root Cause
In `src/pages/Batches.tsx` (line 61-64), `computeStudentSummary(s, payments)` is called with the raw student object. If `s.admission_fee_total = 0` and `s.monthly_fee_amount = 0`, the summary calculates no pending amount. The Batch Detail page fixes this by creating an `effectiveStudent` object that falls back to batch defaults.

## Fix

### File: `src/pages/Batches.tsx`

Update the `batchAnalytics` useMemo (around lines 53-70) to apply the same effective fee fallback:

```typescript
const batchAnalytics = useMemo(() => {
  const map = new Map<...>();
  for (const b of batches) {
    const students = allStudents.filter((s: any) => s.batch_id === b.id);
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;
    for (const s of students) {
      // Apply batch default fallback (same as BatchDetail page)
      const effectiveStudent = {
        ...s,
        admission_fee_total: Number(s.admission_fee_total) || Number(b.default_admission_fee) || 0,
        monthly_fee_amount: Number(s.monthly_fee_amount) || Number(b.default_monthly_fee) || 0,
      };
      const payments = allPayments.filter((p) => p.student_id === s.id);
      const sum = computeStudentSummary(effectiveStudent, payments);
      totalCollected += sum.totalPaid;
      totalPending += sum.totalPending;
      if (sum.monthlyOverdueMonths.length > 0) overdueCount++;
    }
    map.set(b.id, { studentCount: students.length, totalCollected, totalPending, overdueCount });
  }
  return map;
}, [batches, allStudents, allPayments]);
```

This single change fixes both the per-batch "Pending" column in the table and the "Total Pending" summary card, since both derive their values from `batchAnalytics`.
