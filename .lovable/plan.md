

# Change Duplicate Detection: Name + Phone Only (Remove Email)

## What Changes

The duplicate detection currently requires all three fields (Name + Phone + Email) to match. This update changes it to match on **Name + Phone only**, removing the email requirement entirely. This is safer for your use case since students often lack email addresses but always have a name and parent's phone number.

## Technical Details

### 1. Database Migration -- Replace both RPC functions

**`find_duplicate_students`**: Change the matching logic to group by `(norm_name, norm_phone)` instead of `(norm_name, norm_phone, norm_email)`. Remove the filter requiring email to be non-empty.

**`check_student_duplicates_single`**: Match when name + phone both match. Remove the email requirement from the guard condition. Change `match_criteria` return value from `'name_phone_email'` to `'name_phone'`.

### 2. `src/hooks/useDuplicateDetection.ts`

- Update `useCheckSingleDuplicate` trigger condition from `phone.trim() && name.trim() && email.trim()` to just `phone.trim() && name.trim()`
- Remove `email` from the `useEffect` dependency check (still pass it to the RPC for backward compat, but it won't be used)

### 3. `src/pages/StudentDuplicates.tsx`

- Update `CRITERIA_LABELS` from `{ name_phone_email: "Name + Phone + Email" }` to `{ name_phone: "Name + Phone" }`
- Update scan description text from "Name, Phone, and Email" to "Name and Phone"

### 4. `src/pages/AddStudent.tsx`

- Update the duplicate warning message from "matches by Name + Phone + Email" to "matches by Name + Phone"

### Files Modified
- New SQL migration (replace both RPC functions)
- `src/hooks/useDuplicateDetection.ts` (line 140)
- `src/pages/StudentDuplicates.tsx` (lines 25-27, 148)
- `src/pages/AddStudent.tsx` (line 332)

