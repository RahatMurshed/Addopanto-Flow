

# Fix Remaining Important Database Issues

## What's already done (from previous migration)
- Partial unique index on batch_enrollments (student_id, batch_id) WHERE status = 'active' -- DONE
- Indexes: students(company_id, user_id), audit_logs(record_id, company_id), student_sales_notes(created_by), batch_enrollments(batch_id, status) -- DONE

## What still needs to be fixed (single migration)

### 1. Change batches -> courses FK from SET NULL to CASCADE
- Drop existing `batches_course_id_fkey`
- Re-create with ON DELETE CASCADE
- Effect: deleting a course will now cascade-delete all its batches (and their enrollments, payments, etc.)

### 2. Change student_payments.batch_enrollment_id FK from SET NULL to RESTRICT
- Drop existing `student_payments_batch_enrollment_id_fkey`
- Re-create with ON DELETE RESTRICT
- Effect: attempting to delete a batch enrollment that has linked payments will raise an error, forcing the admin to handle payments first

### 3. Create student_tags and student_tag_assignments tables

**student_tags** -- company-scoped tag definitions
- id (uuid PK)
- company_id (uuid NOT NULL, FK to companies ON DELETE CASCADE)
- label (text NOT NULL)
- color_class (text NOT NULL, default)
- created_by (uuid NOT NULL)
- created_at (timestamptz)

**student_tag_assignments** -- many-to-many link between students and tags
- id (uuid PK)
- company_id (uuid NOT NULL, FK to companies ON DELETE CASCADE)
- student_id (uuid NOT NULL, FK to students ON DELETE CASCADE)
- tag_id (uuid NOT NULL, FK to student_tags ON DELETE CASCADE)
- assigned_by (uuid NOT NULL)
- created_at (timestamptz)
- Unique constraint on (student_id, tag_id) to prevent duplicate assignments

**RLS policies** for both tables:
- SELECT: company members can view (scoped to company_id)
- INSERT: admin/cipher can create
- DELETE: admin/cipher can delete
- UPDATE (student_tags only): admin/cipher can update

### Technical details
- Single SQL migration with all three changes
- No application code changes needed immediately (tags UI can be built later)
- TypeScript types will auto-regenerate after migration

