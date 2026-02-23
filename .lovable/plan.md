

# Remove Extra DEO Permission Options from Accept Dialog

## Problem
When accepting a user as a Moderator with Data Entry Mode enabled, the dialog shows 6 permission checkboxes: Students, Payments, Revenue, Expenses, Batches, and Courses. Per the established role policy, DEO mode is strictly limited to **Add Students** and **Add Expenses** only. The extra options (Payments, Revenue, Batches, Courses) must be removed.

## Changes

### File: `src/components/auth/CompanyJoinRequests.tsx`

**1. Remove extra DEO checkbox options (lines 391-397)**
Reduce the DEO permission list from 6 items to 2:
- Keep: `deoStudents` ("Can Add Students")
- Keep: `deoExpenses` ("Can Add Expenses")
- Remove: `deoPayments`, `deoRevenue`, `deoBatches`, `deoCourses`

**2. Update `buildPermissionsPayload` (lines 140-148)**
Remove the extra DEO fields from the payload:
- Remove `deo_payments`, `deo_batches`, `deo_courses`
- Change `deo_finance` to map directly from `deoExpenses` only (not `deoRevenue || deoExpenses`)

**3. Update `buildPermissionsSummary` (lines 183-189)**
Remove summary entries for Payments, Revenue, Batches, Courses in DEO mode -- keep only Students and Expenses.

**4. Clean up `defaultApproveData` (lines 278-284)**
The unused fields (`deoPayments`, `deoRevenue`, `deoBatches`, `deoCourses`) can remain in the interface for backward compatibility but will no longer be rendered or sent.

