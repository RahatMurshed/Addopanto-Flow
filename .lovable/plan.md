

# Hide Batch-Inherited Fields in Edit Form and Enhance Batch Details Table

## Problem

1. The **Edit Student** form still shows Course Start/End Month, Admission Fee, and Monthly Fee fields when a batch is selected (screenshot confirms this). These should be hidden since they're inherited from the batch.
2. The **Batch Details enrolled students table** shows "N/A" for Admission and Monthly columns instead of showing the batch's actual fee values and format.
3. The `computeStudentSummary` in BatchDetail doesn't use batch defaults as fallback (same bug fixed in StudentDetail but not here).

## Changes

### 1. StudentDialog.tsx - Hide inherited fields in edit mode too

Currently the condition `hasBatchInCreate = !isEdit && !!selectedBatch` only hides fields for new students. Change the hiding logic to apply whenever a batch is selected, regardless of create/edit mode:

- Replace `hasBatchInCreate` with `hasBatchSelected = !!selectedBatch`
- Use `hasBatchSelected` for hiding course start/end and fee fields
- Show the "Inherited from batch" info panel in edit mode too when batch is selected
- Keep the auto-sync of fees only in create mode (edit mode just hides the fields visually)

### 2. BatchDetail.tsx - Use effective fees from batch for student summaries

Apply the same fallback logic from StudentDetail: when computing `studentSummaries` and `allSummaries`, create an effective student object using batch defaults when student fees are 0:

```typescript
const effectiveStudent = {
  ...s,
  admission_fee_total: Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0,
  monthly_fee_amount: Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0,
  course_start_month: s.course_start_month || batchCourseStartMonth || null,
  course_end_month: s.course_end_month || batchCourseEndMonth || null,
};
```

### 3. BatchDetail.tsx - Enhance enrolled students table columns

Update the table to show:

- **Admission Fee** column: Show the batch's `default_admission_fee` value with paid/pending badge
- **Monthly Fees** column: Show format "fee/total_months" (e.g., "1,250/4") with status badge
- **Total Pending** column: Show each student's combined admission + monthly pending amount
- Update the Admission column to use effective fee instead of checking `sum.admissionTotal === 0`
- Update the Monthly column to use effective fee instead of checking `s.monthly_fee_amount === 0`

### 4. BatchDetail.tsx - Compute batch course months

Add `batchCourseStartMonth` and `batchCourseEndMonth` memos (same as StudentDetail) for use in effective student calculations.

## Files to Modify

- **`src/components/StudentDialog.tsx`** - Change field hiding condition from `hasBatchInCreate` to `hasBatchSelected` (applies to both create and edit)
- **`src/pages/BatchDetail.tsx`** - Add batch course month calculations, use effective fees in summaries, enhance table columns

## Technical Details

### StudentDialog.tsx changes (lines 96, 268, 342, 358)

Replace:
```typescript
const hasBatchInCreate = !isEdit && !!selectedBatch;
```
With:
```typescript
const hasBatchSelected = !!selectedBatch;
```

Update all references from `hasBatchInCreate` to `hasBatchSelected`. Keep the auto-sync useEffect gated on `!isEdit` so editing doesn't overwrite student data.

### BatchDetail.tsx changes

Add after line 59:
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
```

Update both `studentSummaries` and `allSummaries` to use effective student objects with batch fee fallbacks.

Update table columns:
- Admission: Show batch fee value, badge for paid/partial/pending status
- Monthly: Show "fee/months" format (e.g., "1,250/4"), badge for overdue/pending/current
- Total Pending: Always visible, show combined pending amount

