
-- Create batch_status enum-like check
-- Using text with validation trigger as per project conventions

-- Create batches table
CREATE TABLE public.batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_name text NOT NULL,
  batch_code text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  course_duration_months integer,
  default_admission_fee numeric NOT NULL DEFAULT 0,
  default_monthly_fee numeric NOT NULL DEFAULT 0,
  max_capacity integer,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, batch_code)
);

-- Add batch_id to students table
ALTER TABLE public.students ADD COLUMN batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL;

-- Create index for faster batch lookups
CREATE INDEX idx_students_batch_id ON public.students(batch_id);
CREATE INDEX idx_batches_company_id ON public.batches(company_id);
CREATE INDEX idx_batches_status ON public.batches(status);

-- Enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as other company-scoped tables)
CREATE POLICY "Company members can view batches"
ON public.batches FOR SELECT
USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert batches"
ON public.batches FOR INSERT
WITH CHECK (company_id = get_active_company_id(auth.uid()) AND company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update batches"
ON public.batches FOR UPDATE
USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete batches"
ON public.batches FOR DELETE
USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

-- Validation trigger: end_date must be after start_date
CREATE OR REPLACE FUNCTION public.validate_batch_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_batch_dates_trigger
BEFORE INSERT OR UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.validate_batch_dates();

-- Updated_at trigger
CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
