
-- Phase 1: Add data_entry_mode and course permission columns to company_memberships

-- Add data_entry_mode flag for moderators
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS data_entry_mode boolean NOT NULL DEFAULT false;

-- Add course permission columns (matching existing mod_* pattern)
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS mod_courses_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_courses_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_courses_delete boolean NOT NULL DEFAULT false;

-- Add deo_courses flag (matching existing deo_* pattern)
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS deo_courses boolean NOT NULL DEFAULT false;

-- Create a security definer function to check if user is a data entry moderator in a company
CREATE OR REPLACE FUNCTION public.is_data_entry_moderator(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND role = 'moderator'
      AND data_entry_mode = true
      AND status = 'active'
  )
$$;

-- Create index for efficient created_by/user_id filtering for data entry moderators
CREATE INDEX IF NOT EXISTS idx_student_payments_user_id ON public.student_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_revenues_user_id ON public.revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_created_by ON public.batches(created_by);
