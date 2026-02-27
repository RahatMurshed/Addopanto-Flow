
-- Add status and due_date columns to student_payments
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS due_date date;

-- Backfill: existing payments are all 'paid', set due_date = payment_date
UPDATE public.student_payments SET due_date = payment_date WHERE due_date IS NULL;

-- Make due_date NOT NULL after backfill
ALTER TABLE public.student_payments ALTER COLUMN due_date SET NOT NULL;
ALTER TABLE public.student_payments ALTER COLUMN due_date SET DEFAULT CURRENT_DATE;

-- Add index for the projection query
CREATE INDEX IF NOT EXISTS idx_student_payments_status_due ON public.student_payments (student_id, company_id, status, due_date);
