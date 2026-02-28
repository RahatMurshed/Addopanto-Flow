
-- The trigger name is prevent_course_delete_with_batches (not deletion)
DROP TRIGGER IF EXISTS prevent_course_delete_with_batches ON public.courses;
DROP FUNCTION IF EXISTS public.prevent_course_deletion_with_batches() CASCADE;

-- IMPORTANT FIX 5: Partial unique index for active enrollments
ALTER TABLE public.batch_enrollments DROP CONSTRAINT IF EXISTS batch_enrollments_student_id_batch_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_enrollments_active_unique
  ON public.batch_enrollments (student_id, batch_id)
  WHERE status = 'active';

-- IMPORTANT FIX 6: Batch capacity validation
CREATE OR REPLACE FUNCTION public.validate_batch_capacity()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.max_capacity IS NOT NULL AND NEW.max_capacity < 0 THEN
    RAISE EXCEPTION 'Batch max_capacity cannot be negative. Got: %', NEW.max_capacity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_batch_capacity ON public.batches;
CREATE TRIGGER trg_validate_batch_capacity
  BEFORE INSERT OR UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.validate_batch_capacity();

-- IMPORTANT FIXES 7-10: Missing indexes
CREATE INDEX IF NOT EXISTS idx_students_company_user
  ON public.students (company_id, user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id
  ON public.audit_logs (record_id, company_id);

CREATE INDEX IF NOT EXISTS idx_student_sales_notes_created_by
  ON public.student_sales_notes (created_by);

CREATE INDEX IF NOT EXISTS idx_batch_enrollments_batch_status
  ON public.batch_enrollments (batch_id, status);
