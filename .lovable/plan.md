

# Fix: Enrollment should show "Inactive" instead of "Completed" when student is deactivated

## Problem
When a student is set to "Inactive", their batch enrollment is updated to "completed", which is misleading. "Completed" implies the student finished the course, but they were actually deactivated. The enrollment should reflect the reason it ended.

## Solution
Use "inactive" as the enrollment status when the student is set to inactive (and keep "completed" only for natural course completion or graduation).

### 1. QuickActionsPanel.tsx - Use correct enrollment status
- When student status is set to **"inactive"**, update enrollment status to **"inactive"** (not "completed")
- When student status is set to **"dropout"**, update enrollment status to **"inactive"** (or keep as-is based on preference)

### 2. EnrollmentTimeline.tsx - Support "inactive" enrollment status
- Add "inactive" to the `EnrollmentStatus` type
- Add styling for the "inactive" status badge (red/orange to match the student inactive styling)
- Add "Inactive" label to `STATUS_LABEL`

### 3. Fix Nusrat Jahan's existing data
- Run a SQL update to change her enrollment from "completed" to "inactive" since she was deactivated, not graduated

## Files to change
- `src/components/students/profile/QuickActionsPanel.tsx` (line 103: change "completed" to "inactive")
- `src/components/students/profile/EnrollmentTimeline.tsx` (lines 25-40: add "inactive" status config)
- SQL data fix for existing record
