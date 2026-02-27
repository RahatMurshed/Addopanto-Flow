
-- Create student_sales_notes table
CREATE TABLE public.student_sales_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_sales_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: company members can view, DEO only own notes
CREATE POLICY "Company members can view sales notes"
ON public.student_sales_notes
FOR SELECT
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND is_company_member(auth.uid(), company_id)
  AND (
    (NOT is_data_entry_moderator(company_id, auth.uid()))
    OR (created_by = auth.uid())
  )
);

-- INSERT: any company member can add notes
CREATE POLICY "Company members can insert sales notes"
ON public.student_sales_notes
FOR INSERT
WITH CHECK (
  (company_id = get_active_company_id(auth.uid()))
  AND is_company_member(auth.uid(), company_id)
  AND (created_by = auth.uid())
);

-- UPDATE: creator, admin, or cipher
CREATE POLICY "Users can update own or admin can update sales notes"
ON public.student_sales_notes
FOR UPDATE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (
    created_by = auth.uid()
    OR is_company_admin(auth.uid(), company_id)
    OR is_cipher(auth.uid())
  )
);

-- DELETE: creator, admin, or cipher
CREATE POLICY "Users can delete own or admin can delete sales notes"
ON public.student_sales_notes
FOR DELETE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (
    created_by = auth.uid()
    OR is_company_admin(auth.uid(), company_id)
    OR is_cipher(auth.uid())
  )
);

-- Index for performance
CREATE INDEX idx_student_sales_notes_student ON public.student_sales_notes(student_id);
CREATE INDEX idx_student_sales_notes_company ON public.student_sales_notes(company_id);
CREATE INDEX idx_student_sales_notes_category ON public.student_sales_notes(category);

-- Trigger for updated_at
CREATE TRIGGER update_student_sales_notes_updated_at
BEFORE UPDATE ON public.student_sales_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
