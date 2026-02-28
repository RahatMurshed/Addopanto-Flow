
ALTER TABLE public.batches
  ADD COLUMN course_duration_days integer DEFAULT 0,
  ADD COLUMN payment_mode text NOT NULL DEFAULT 'monthly';
