-- Fix existing on_hold rows based on batch end_date
UPDATE public.batch_enrollments be
SET status = CASE
  WHEN b.end_date IS NULL OR b.end_date >= CURRENT_DATE THEN 'active'
  ELSE 'completed'
END
FROM public.batches b
WHERE be.batch_id = b.id
AND be.status = 'on_hold';

-- Drop old constraint, add new one
ALTER TABLE public.batch_enrollments
  DROP CONSTRAINT IF EXISTS batch_enrollments_status_check;

ALTER TABLE public.batch_enrollments
  ADD CONSTRAINT batch_enrollments_status_check
  CHECK (status IN ('active', 'completed', 'dropped'));