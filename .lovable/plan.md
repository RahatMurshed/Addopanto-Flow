

## Add Course Organizational Layer

This adds a new "Courses" hierarchy above Batches, creating the navigation flow: **Courses -> Course Details -> Batches -> Batch Details -> Student Details**.

### Database Changes

**New `courses` table:**

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | gen_random_uuid() |
| company_id | uuid (FK) | NOT NULL |
| course_name | text | NOT NULL |
| course_code | text | NOT NULL |
| description | text | nullable |
| duration_months | integer | nullable |
| category | text | nullable |
| cover_image_url | text | nullable |
| status | text | DEFAULT 'active' |
| created_by | uuid | NOT NULL |
| user_id | uuid | NOT NULL |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**Modify `batches` table:**
- Add `course_id uuid` (nullable FK -> courses.id) to allow gradual migration
- Index on `(company_id)` and `(course_id)` for courses table
- Index on `(course_id)` for batches table

**RLS policies on `courses`** (same pattern as `batches`):
- SELECT: company member with active company
- INSERT: can_add_revenue OR can_add_batch permission
- UPDATE: can_edit_delete OR can_edit_batch permission
- DELETE: can_edit_delete OR can_delete_batch permission (only if no batches exist -- enforced via trigger)

**Trigger: prevent course deletion if batches exist** -- raises exception if any batch references the course.

**Audit trigger** on courses table (same pattern as other tables).

### New Files

| File | Purpose |
|---|---|
| `src/hooks/useCourses.ts` | CRUD hooks: useCourses, useCourse, useCreateCourse, useUpdateCourse, useDeleteCourse, useCourseStudentCount |
| `src/pages/Courses.tsx` | Main courses list page with table, search, status filter, sorting, summary cards |
| `src/pages/CourseDetail.tsx` | Course details page with info card + batches table for this course |
| `src/components/CourseDialog.tsx` | Create/edit course dialog form |

### Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Add routes: `/courses`, `/courses/:id`. Redirect `/batches` to `/courses`. Add lazy imports for Courses and CourseDetail pages |
| `src/components/AppLayout.tsx` | Replace "Batches" nav item with "Courses" (icon: BookOpen). Update href from `/batches` to `/courses` |
| `src/hooks/useBatches.ts` | Add `course_id` to Batch and BatchInsert interfaces |
| `src/components/BatchDialog.tsx` | Add optional `courseId` prop. When provided, auto-set course_id and inherit duration. When not provided, show course dropdown selector |
| `src/pages/BatchDetail.tsx` | Update back button to navigate to `/courses/:courseId` if batch has course_id, else `/courses`. Add breadcrumb: Courses > Course Name > Batch Name |
| `src/pages/StudentDetail.tsx` | Update breadcrumb to include course level: Courses > Course Name > Batch Name > Student Name |
| `src/pages/Batches.tsx` | Keep as redirect to `/courses` or remove direct access |

### Navigation and Breadcrumbs

The breadcrumb pattern will be:
```text
Courses > [Course Name] > [Batch Name] > [Student Name]
```

Each level links to its parent. The sidebar "Batches" link becomes "Courses".

### Course Details Page Layout

1. **Header**: Course name, code, status badge, edit/delete buttons
2. **Info Card**: Description, duration, category, cover image, created date
3. **Summary Cards** (4 cards): Total Batches, Total Students, Total Revenue, Pending Amount
4. **Batches Table**: All batches under this course with columns: Batch Name, Code, Status, Start Date, Students, Revenue, Pending, Actions (View/Edit/Delete)
5. **"Add Batch" button**: Opens BatchDialog with course_id pre-set and duration inherited

### Courses List Page Layout

1. **Header**: "Courses" title + "Create Course" button
2. **Summary Cards**: Total Courses, Total Students, Total Revenue, Total Pending
3. **Filters**: Search input, status dropdown (All/Active/Inactive), sort selector
4. **Table Columns**: Course Name, Code, Category, Batches Count, Students Count, Revenue, Status, Actions

### Permissions

Courses reuse the same batch permissions (canAddBatch, canEditBatch, canDeleteBatch) since courses are the parent organizational unit. Data Entry Operators see only courses they created, same pattern as batches.

### Technical Details

**useCourses hook pattern:**
```typescript
export function useCourses(filters?: CourseFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["courses", activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });
      // apply filters...
      const { data, error } = await query;
      return data as Course[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}
```

**Course-level analytics** are computed client-side by aggregating batch data, same pattern used in the existing Batches page but one level up.

**Deletion safety trigger:**
```sql
CREATE FUNCTION prevent_course_deletion_with_batches()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM batches WHERE course_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete course with existing batches. Remove or reassign batches first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**BatchDialog course selector:** When opened from the Courses page, `courseId` is passed as a prop and the field is hidden/pre-filled. When opened from elsewhere, a dropdown of courses is shown. The batch inherits `duration_months` from the selected course (auto-fills but editable).

### Migration Strategy

- The `course_id` on batches is nullable, so existing batches continue to work without a course
- The old `/batches` route redirects to `/courses`
- Direct `/batches/:id` still works for existing bookmarks
