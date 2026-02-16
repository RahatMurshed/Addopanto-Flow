
## Show Overall Pending (Admission + Monthly) in "Total Pending" Column

### What Changes
The "Total Pending" column in the Enrolled Students table currently only shows monthly fee pending amounts. It will be updated to include admission fee pending as well, showing the true overall pending amount per student.

### Technical Details

**File: `src/pages/BatchDetail.tsx`**

In the table row rendering (around line 702-705), replace the `filteredPending` value with `filteredPending + admissionPending`:

1. Calculate admission pending for each student row:
   ```
   const effAdm = Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
   const admPending = Math.max(0, effAdm - (sum?.admissionPaid || 0));
   ```

2. Update the Total Pending cell to use `filteredPending + admPending` instead of just `filteredPending`

3. Update the condition to show the value when either monthly or admission pending exists (not just when `worstStatus !== "na"`)

This is a single-line logic change in one file.
