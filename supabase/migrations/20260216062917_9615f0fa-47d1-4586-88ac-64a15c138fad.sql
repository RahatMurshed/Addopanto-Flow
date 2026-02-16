
-- Create courses table
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  course_code text NOT NULL,
  description text,
  duration_months integer,
  category text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add course_id to batches
ALTER TABLE public.batches ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_courses_company_id ON public.courses(company_id);
CREATE INDEX idx_courses_course_id ON public.courses(id);
CREATE INDEX idx_batches_course_id ON public.batches(course_id);

-- Updated_at trigger
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_courses
  AFTER INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Prevent course deletion if batches exist
CREATE OR REPLACE FUNCTION public.prevent_course_deletion_with_batches()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.batches WHERE course_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete course with existing batches. Remove or reassign batches first.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER prevent_course_delete_with_batches
  BEFORE DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_course_deletion_with_batches();

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT - company members
CREATE POLICY "Company members can view courses"
  ON public.courses FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

-- RLS: INSERT - users with batch add permission
CREATE POLICY "Users with batch add permission can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (public.company_can_add_batch(company_id, auth.uid()));

-- RLS: UPDATE - users with batch edit permission
CREATE POLICY "Users with batch edit permission can update courses"
  ON public.courses FOR UPDATE
  USING (public.company_can_edit_batch(company_id, auth.uid()));

-- RLS: DELETE - users with batch delete permission
CREATE POLICY "Users with batch delete permission can delete courses"
  ON public.courses FOR DELETE
  USING (public.company_can_delete_batch(company_id, auth.uid()));

-- Enable realtime for courses
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
