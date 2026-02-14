
-- Phase 1.1: Add data_entry_operator to company_role enum
ALTER TYPE public.company_role ADD VALUE IF NOT EXISTS 'data_entry_operator';

-- Phase 1.2: Add granular permission columns to company_memberships
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS can_add_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_add_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_add_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_revenue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_revenue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_expense boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_expense boolean NOT NULL DEFAULT false;

-- Phase 1.3: Create RLS helper functions for new granular permissions

-- Student permissions
CREATE OR REPLACE FUNCTION public.company_can_add_student(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_add_student = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_student(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_edit_student = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_student(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_delete_student = true)
  ) OR public.is_cipher(_user_id)
$$;

-- Payment permissions
CREATE OR REPLACE FUNCTION public.company_can_add_payment(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_add_payment = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_payment(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_edit_payment = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_payment(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_delete_payment = true)
  ) OR public.is_cipher(_user_id)
$$;

-- Batch permissions
CREATE OR REPLACE FUNCTION public.company_can_add_batch(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_add_batch = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_batch(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_edit_batch = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_batch(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_delete_batch = true)
  ) OR public.is_cipher(_user_id)
$$;

-- Revenue edit/delete permissions
CREATE OR REPLACE FUNCTION public.company_can_edit_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_edit_revenue = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_delete_revenue = true)
  ) OR public.is_cipher(_user_id)
$$;

-- Expense edit/delete permissions
CREATE OR REPLACE FUNCTION public.company_can_edit_expense(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_edit_expense = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_expense(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
    AND (role = 'admin' OR can_delete_expense = true)
  ) OR public.is_cipher(_user_id)
$$;

-- Phase 1.4: Update RLS policies for students table
DROP POLICY IF EXISTS "Authorized users can insert students" ON public.students;
CREATE POLICY "Authorized users can insert students"
  ON public.students FOR INSERT
  WITH CHECK (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_student(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can update students" ON public.students;
CREATE POLICY "Authorized users can update students"
  ON public.students FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_student(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Authorized users can delete students"
  ON public.students FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_student(auth.uid(), company_id))
  );

-- Update RLS for student_payments
DROP POLICY IF EXISTS "Authorized users can insert student payments" ON public.student_payments;
CREATE POLICY "Authorized users can insert student payments"
  ON public.student_payments FOR INSERT
  WITH CHECK (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_payment(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can update student payments" ON public.student_payments;
CREATE POLICY "Authorized users can update student payments"
  ON public.student_payments FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_payment(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can delete student payments" ON public.student_payments;
CREATE POLICY "Authorized users can delete student payments"
  ON public.student_payments FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_payment(auth.uid(), company_id))
  );

-- Update RLS for batches
DROP POLICY IF EXISTS "Authorized users can insert batches" ON public.batches;
CREATE POLICY "Authorized users can insert batches"
  ON public.batches FOR INSERT
  WITH CHECK (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_batch(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can update batches" ON public.batches;
CREATE POLICY "Authorized users can update batches"
  ON public.batches FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_batch(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can delete batches" ON public.batches;
CREATE POLICY "Authorized users can delete batches"
  ON public.batches FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_batch(auth.uid(), company_id))
  );

-- Update RLS for revenues (edit/delete)
DROP POLICY IF EXISTS "Admins can update revenues" ON public.revenues;
CREATE POLICY "Authorized users can update revenues"
  ON public.revenues FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_revenue(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can delete revenues" ON public.revenues;
CREATE POLICY "Authorized users can delete revenues"
  ON public.revenues FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_revenue(auth.uid(), company_id))
  );

-- Update RLS for expenses (edit/delete)
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
CREATE POLICY "Authorized users can update expenses"
  ON public.expenses FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_expense(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
CREATE POLICY "Authorized users can delete expenses"
  ON public.expenses FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_expense(auth.uid(), company_id))
  );

-- Also allow DEOs to view data (minimal) - they're already company members so SELECT policies work
-- The SELECT policies use is_company_member which will work for data_entry_operator role too
