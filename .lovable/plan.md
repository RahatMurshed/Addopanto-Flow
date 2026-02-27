
# Fix: Edit Button on Student Profile Page Opens Edit Dialog Instead of Redirecting

## Problem
When clicking the "Edit" button on the Student Profile Page, it navigates to `/students/{id}` (the payment/detail page) instead of opening an edit dialog. This is confusing -- especially for unenrolled students, since the payment page has no enrollment context.

## Solution
Add an inline `StudentDialog` to the Student Profile Page so the "Edit" button opens the edit form directly, without leaving the page.

## Changes

### `src/pages/StudentProfilePage.tsx`
1. Import `StudentDialog` from `@/components/dialogs/StudentDialog` and `useUpdateStudent` from `@/hooks/useStudents`
2. Add state: `const [editOpen, setEditOpen] = useState(false)`
3. Add mutation: `const updateStudent = useUpdateStudent()`
4. Add handler:
   ```
   handleUpdate(data) -> updateStudent.mutateAsync({ id, ...data }) -> toast success
   ```
5. Change both `onEdit` callbacks (in `ProfileStickyBar` and `ProfileHeader`) from `navigate(...)` to `setEditOpen(true)`
6. Render `StudentDialog` at the bottom of the component with `open={editOpen}`, passing the current student data and available batches for editing
