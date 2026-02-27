
-- Create batch_enrollments table for tracking enrollment history
CREATE TABLE public.batch_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'on_hold')),
  total_fee NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE (student_id, batch_id)
);

-- Add batch_enrollment_id to student_payments
ALTER TABLE public.student_payments
ADD COLUMN batch_enrollment_id UUID REFERENCES public.batch_enrollments(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view batch enrollments"
ON public.batch_enrollments FOR SELECT
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND is_company_member(auth.uid(), company_id)
  AND ((NOT is_data_entry_moderator(company_id, auth.uid())) OR (created_by = auth.uid()))
);

CREATE POLICY "Authorized users can insert batch enrollments"
ON public.batch_enrollments FOR INSERT
WITH CHECK (
  (company_id = get_active_company_id(auth.uid()))
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

CREATE POLICY "Authorized users can update batch enrollments"
ON public.batch_enrollments FOR UPDATE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

CREATE POLICY "Authorized users can delete batch enrollments"
ON public.batch_enrollments FOR DELETE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

-- Indexes
CREATE INDEX idx_batch_enrollments_student ON public.batch_enrollments(student_id, company_id);
CREATE INDEX idx_batch_enrollments_batch ON public.batch_enrollments(batch_id);
CREATE INDEX idx_student_payments_enrollment ON public.student_payments(batch_enrollment_id);

-- Seed existing enrollments from current student.batch_id
-- Map student_status enum to batch_enrollment status text
INSERT INTO public.batch_enrollments (student_id, batch_id, company_id, enrollment_date, status, total_fee, created_by)
SELECT 
  s.id,
  s.batch_id,
  s.company_id,
  s.enrollment_date,
  CASE s.status::text
    WHEN 'active' THEN 'active'
    WHEN 'graduated' THEN 'completed'
    WHEN 'dropout' THEN 'dropped'
    WHEN 'inactive' THEN 'on_hold'
    WHEN 'transferred' THEN 'dropped'
    ELSE 'active'
  END,
  COALESCE(s.admission_fee_total, 0) + (COALESCE(s.monthly_fee_amount, 0) * COALESCE(b.course_duration_months, 12)),
  s.user_id
FROM public.students s
JOIN public.batches b ON s.batch_id = b.id
WHERE s.batch_id IS NOT NULL;
