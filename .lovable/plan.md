
## Auto-Set Revenue Source Based on Payment Type

### What Changes
When recording a student payment, the Revenue Source will automatically update based on the selected Payment Type and include short course/batch context:

- **Admission Fee** selected --> Revenue Source auto-set to: `Admission - [CourseName] [BatchName]`  
- **Monthly Fee** selected --> Revenue Source auto-set to: `Monthly Fees - [CourseName] [BatchName]`

The source will be auto-created if it doesn't already exist, and the user can still manually override it.

### Technical Details

**File: `src/components/StudentPaymentDialog.tsx`**

1. Add new props to receive course and batch names:
   - `courseName?: string`
   - `batchName?: string`

2. Build dynamic source names based on payment type:
   - `"Admission - English Mastery Batch-1"` (when admission)
   - `"Monthly Fees - English Mastery Batch-1"` (when monthly)

3. When payment type changes or dialog opens, auto-find or auto-create the matching revenue source:
   - Search existing `revenueSources` for a match by name
   - If found, set `selectedSourceId` to that source
   - If not found, auto-create it via `createSourceMutation` and set the ID

4. Remove the old hardcoded "Student Fees" default logic (line 144)

5. Update the Select dropdown default label from `"Auto (Student Fees)"` to reflect the dynamic source name

**Files: `src/pages/BatchDetail.tsx`, `src/pages/StudentDetail.tsx`, `src/pages/Students.tsx`**

Pass the new `courseName` and `batchName` props to `StudentPaymentDialog` from each caller:
- **BatchDetail**: has `batch.batch_name` and `course?.course_name` available
- **StudentDetail**: has student's batch/course info from joined data
- **Students**: may need to look up batch/course from student record; if unavailable, will fall back to generic names
