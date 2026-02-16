
-- 1. Add 'dropout' and 'transferred' to student_status enum
ALTER TYPE public.student_status ADD VALUE IF NOT EXISTS 'dropout';
ALTER TYPE public.student_status ADD VALUE IF NOT EXISTS 'transferred';

-- 2. Create composite indexes for performance with 20k+ records
CREATE INDEX IF NOT EXISTS idx_students_company_name ON public.students (company_id, name);
CREATE INDEX IF NOT EXISTS idx_students_company_status ON public.students (company_id, status);
CREATE INDEX IF NOT EXISTS idx_students_company_batch ON public.students (company_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_students_company_phone ON public.students (company_id, phone);
CREATE INDEX IF NOT EXISTS idx_students_company_class ON public.students (company_id, class_grade);
CREATE INDEX IF NOT EXISTS idx_students_company_created ON public.students (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_company_enrollment ON public.students (company_id, enrollment_date DESC);

-- 3. Create student_batch_history table for transfer tracking
CREATE TABLE public.student_batch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  from_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  to_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  reason TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transferred_by UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.student_batch_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company members can view batch history"
ON public.student_batch_history
FOR SELECT
USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert batch history"
ON public.student_batch_history
FOR INSERT
WITH CHECK (company_id = get_active_company_id(auth.uid()) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_student(auth.uid(), company_id)));

CREATE POLICY "Admins can delete batch history"
ON public.student_batch_history
FOR DELETE
USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

-- Index for batch history lookups
CREATE INDEX idx_batch_history_student ON public.student_batch_history (student_id, transferred_at DESC);
CREATE INDEX idx_batch_history_company ON public.student_batch_history (company_id);
