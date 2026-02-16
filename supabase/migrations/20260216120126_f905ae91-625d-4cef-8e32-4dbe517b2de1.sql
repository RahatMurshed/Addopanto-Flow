
-- =============================================
-- Phase 1A: Add extended fields to students table
-- =============================================

-- Personal Information
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blood_group text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS religion_category text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS aadhar_id_number text;

-- Contact Information
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS alt_contact_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address_house text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address_area text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS address_pin_zip text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS permanent_address_same boolean DEFAULT true;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS perm_address_house text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS perm_address_street text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS perm_address_area text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS perm_address_city text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS perm_address_state text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS perm_address_pin_zip text;

-- Family Information
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_occupation text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_contact text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_annual_income numeric;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_occupation text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_contact text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_contact text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_relationship text;

-- Academic Information
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS previous_school text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_grade text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS roll_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS section_division text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS previous_qualification text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS previous_percentage text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS board_university text;

-- Additional Information
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS special_needs_medical text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS emergency_contact_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS transportation_mode text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS distance_from_institution text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS extracurricular_interests text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS language_proficiency text;

-- =============================================
-- Phase 1B: Create student_siblings table
-- =============================================

CREATE TABLE public.student_siblings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text,
  age integer,
  occupation_school text,
  contact text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_siblings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view student siblings"
  ON public.student_siblings FOR SELECT
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND is_company_member(auth.uid(), company_id)
  );

CREATE POLICY "Authorized users can insert student siblings"
  ON public.student_siblings FOR INSERT
  WITH CHECK (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_student(auth.uid(), company_id))
  );

CREATE POLICY "Authorized users can update student siblings"
  ON public.student_siblings FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_student(auth.uid(), company_id))
  );

CREATE POLICY "Authorized users can delete student siblings"
  ON public.student_siblings FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_student(auth.uid(), company_id))
  );

-- =============================================
-- Phase 1C: Performance indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_students_company_name ON public.students(company_id, name);
CREATE INDEX IF NOT EXISTS idx_students_company_father ON public.students(company_id, father_name);
CREATE INDEX IF NOT EXISTS idx_students_company_phone ON public.students(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_students_company_class ON public.students(company_id, class_grade);
CREATE INDEX IF NOT EXISTS idx_students_company_batch ON public.students(company_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_students_company_created ON public.students(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_students_company_status ON public.students(company_id, status);
CREATE INDEX IF NOT EXISTS idx_student_siblings_student ON public.student_siblings(student_id);
CREATE INDEX IF NOT EXISTS idx_student_siblings_company ON public.student_siblings(company_id);
