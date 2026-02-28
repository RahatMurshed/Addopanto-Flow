
-- 1. Change batches -> courses FK from SET NULL to CASCADE
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_course_id_fkey;
ALTER TABLE public.batches ADD CONSTRAINT batches_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- 2. Change student_payments.batch_enrollment_id FK from SET NULL to RESTRICT
ALTER TABLE public.student_payments DROP CONSTRAINT IF EXISTS student_payments_batch_enrollment_id_fkey;
ALTER TABLE public.student_payments ADD CONSTRAINT student_payments_batch_enrollment_id_fkey
  FOREIGN KEY (batch_enrollment_id) REFERENCES public.batch_enrollments(id) ON DELETE RESTRICT;

-- 3. Create student_tags table
CREATE TABLE public.student_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  color_class text NOT NULL DEFAULT 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view tags"
  ON public.student_tags FOR SELECT
  USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert tags"
  ON public.student_tags FOR INSERT
  WITH CHECK (company_id = get_active_company_id(auth.uid()) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "Admin/Cipher can update tags"
  ON public.student_tags FOR UPDATE
  USING (company_id = get_active_company_id(auth.uid()) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));

CREATE POLICY "Admin/Cipher can delete tags"
  ON public.student_tags FOR DELETE
  USING (company_id = get_active_company_id(auth.uid()) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));

-- 4. Create student_tag_assignments table
CREATE TABLE public.student_tag_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.student_tags(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, tag_id)
);

ALTER TABLE public.student_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view tag assignments"
  ON public.student_tag_assignments FOR SELECT
  USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert tag assignments"
  ON public.student_tag_assignments FOR INSERT
  WITH CHECK (company_id = get_active_company_id(auth.uid()) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())) AND assigned_by = auth.uid());

CREATE POLICY "Admin/Cipher can delete tag assignments"
  ON public.student_tag_assignments FOR DELETE
  USING (company_id = get_active_company_id(auth.uid()) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));
