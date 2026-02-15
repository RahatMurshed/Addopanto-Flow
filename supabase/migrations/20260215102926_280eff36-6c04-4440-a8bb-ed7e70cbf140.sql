
-- ============================================
-- 1. Add profile columns to user_profiles
-- ============================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS alt_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS bio text;

-- ============================================
-- 2. Create profile-avatars storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Profile avatar images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can upload their own profile avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 3. Add RLS for company members to view profiles
-- ============================================
CREATE POLICY "Company members can view fellow member profiles"
ON public.user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_memberships cm1
    JOIN company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = user_profiles.user_id
    AND cm1.status = 'active'
    AND cm2.status = 'active'
  )
);

-- ============================================
-- 4. Add 4 DEO category columns
-- ============================================
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS deo_students boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deo_payments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deo_batches boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deo_finance boolean NOT NULL DEFAULT false;

-- ============================================
-- 5. Migrate existing granular DEO data to categories
-- ============================================
UPDATE public.company_memberships SET
  deo_students = (can_add_student OR can_edit_student OR can_delete_student),
  deo_payments = (can_add_payment OR can_edit_payment OR can_delete_payment),
  deo_batches = (can_add_batch OR can_edit_batch OR can_delete_batch),
  deo_finance = (can_add_expense OR can_edit_expense OR can_delete_expense OR can_edit_revenue OR can_delete_revenue OR can_view_revenue OR can_view_expense)
WHERE role = 'data_entry_operator';

-- Clear moderator-level columns for DEOs
UPDATE public.company_memberships SET
  can_add_revenue = false,
  can_add_expense = false,
  can_add_expense_source = false,
  can_transfer = false,
  can_view_reports = false,
  can_manage_students = false
WHERE role = 'data_entry_operator';

-- ============================================
-- 6. Update RLS helper functions
-- ============================================
CREATE OR REPLACE FUNCTION public.company_can_add_student(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_students = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_edit_student(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_students = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_delete_student(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_students = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_add_payment(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_payments = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_edit_payment(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_payments = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_delete_payment(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_payments = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_add_batch(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_batches = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_edit_batch(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_batches = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_delete_batch(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_batches = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_add_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_add_revenue = true OR deo_finance = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_edit_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_finance = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_delete_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_finance = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_add_expense(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_add_expense = true OR deo_finance = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_edit_expense(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_finance = true)
  ) OR public.is_cipher(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.company_can_delete_expense(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR deo_finance = true)
  ) OR public.is_cipher(_user_id)
$function$;

-- ============================================
-- 7. Drop old granular DEO columns
-- ============================================
ALTER TABLE public.company_memberships
  DROP COLUMN IF EXISTS can_add_student,
  DROP COLUMN IF EXISTS can_edit_student,
  DROP COLUMN IF EXISTS can_delete_student,
  DROP COLUMN IF EXISTS can_add_payment,
  DROP COLUMN IF EXISTS can_edit_payment,
  DROP COLUMN IF EXISTS can_delete_payment,
  DROP COLUMN IF EXISTS can_add_batch,
  DROP COLUMN IF EXISTS can_edit_batch,
  DROP COLUMN IF EXISTS can_delete_batch,
  DROP COLUMN IF EXISTS can_edit_revenue,
  DROP COLUMN IF EXISTS can_delete_revenue,
  DROP COLUMN IF EXISTS can_edit_expense,
  DROP COLUMN IF EXISTS can_delete_expense,
  DROP COLUMN IF EXISTS can_view_revenue,
  DROP COLUMN IF EXISTS can_view_expense;
