

# Fix: "Days Since Enrollment" Using Incorrect Date

## Problem
The "Since First Enrollment" stat uses the `enrollment_date` field, which is manually entered and can be set to any date -- even before the student record was actually created. For this student, `enrollment_date` is Feb 13 but the record was created Feb 17, causing the "14 days" count to be inaccurate (should be 10 days).

## Solution
Use `created_at` as the source for "days since joining" instead of `enrollment_date`, since it reflects when the student was actually added to the system. This matches the "Added on" date shown in the profile header.

## Changes

### 1. `src/utils/studentMetrics.ts`
- Change the `student` parameter type to include `created_at: string`
- Use `created_at` instead of `enrollment_date` for the `daysSinceJoining` calculation
- Keep using `enrollment_date` for `studentSinceDate` display (the "Student Since" badge) since that represents the conceptual enrollment period

### 2. `src/components/students/profile/LifetimeValueBanner.tsx`
- Update the `student` prop interface to include `created_at: string`
- Pass `created_at` through to the metrics computation

### 3. `src/pages/StudentProfilePage.tsx`
- Ensure `created_at` is included when passing the student object to the banner component (it likely already is from the query, just needs to flow through)

## Technical Detail
```text
Before: daysSinceJoining = now - enrollment_date  (manually entered, can be inaccurate)
After:  daysSinceJoining = now - created_at        (system-generated, always accurate)
```
