
-- Role Simplification: Consolidate to Admin + Moderator only

-- 1. Migrate data_entry_operator to moderator
UPDATE public.company_memberships SET role = 'moderator' WHERE role = 'data_entry_operator';

-- 2. Map old moderator mod_* to deo_*
UPDATE public.company_memberships
SET deo_students = (mod_students_add OR mod_students_edit OR mod_students_delete),
    deo_payments = (mod_payments_add OR mod_payments_edit OR mod_payments_delete),
    deo_batches = (mod_batches_add OR mod_batches_edit OR mod_batches_delete),
    deo_finance = (mod_revenue_add OR mod_revenue_edit OR mod_revenue_delete OR mod_expenses_add OR mod_expenses_edit OR mod_expenses_delete),
    mod_students_add = false, mod_students_edit = false, mod_students_delete = false,
    mod_payments_add = false, mod_payments_edit = false, mod_payments_delete = false,
    mod_batches_add = false, mod_batches_edit = false, mod_batches_delete = false,
    mod_revenue_add = false, mod_revenue_edit = false, mod_revenue_delete = false,
    mod_expenses_add = false, mod_expenses_edit = false, mod_expenses_delete = false
WHERE role = 'moderator' AND (mod_students_add OR mod_students_edit OR mod_students_delete OR
    mod_payments_add OR mod_payments_edit OR mod_payments_delete OR
    mod_batches_add OR mod_batches_edit OR mod_batches_delete OR
    mod_revenue_add OR mod_revenue_edit OR mod_revenue_delete OR
    mod_expenses_add OR mod_expenses_edit OR mod_expenses_delete);

-- 3. Migrate viewer to moderator
UPDATE public.company_memberships SET role = 'moderator' WHERE role = 'viewer';

-- 4. Update default
ALTER TABLE public.company_memberships ALTER COLUMN role SET DEFAULT 'moderator';

-- 5. Drop ALL functions we need to recreate (CASCADE for those with dependent policies)
DROP FUNCTION IF EXISTS public.is_company_moderator(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_add_student(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_edit_student(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_delete_student(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_add_payment(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_edit_payment(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_delete_payment(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_add_batch(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_edit_batch(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_delete_batch(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_add_revenue(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_edit_revenue(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_delete_revenue(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_add_expense(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_edit_expense(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_delete_expense(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_add_expense_source(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.company_can_transfer(uuid, uuid) CASCADE;

-- 6. Recreate all functions
CREATE FUNCTION public.is_company_moderator(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND role = 'moderator' AND status = 'active') $$;

CREATE FUNCTION public.company_can_add_student(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_students))) $$;

CREATE FUNCTION public.company_can_edit_student(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_students))) $$;

CREATE FUNCTION public.company_can_delete_student(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_students))) $$;

CREATE FUNCTION public.company_can_add_payment(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_payments))) $$;

CREATE FUNCTION public.company_can_edit_payment(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_payments))) $$;

CREATE FUNCTION public.company_can_delete_payment(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_payments))) $$;

CREATE FUNCTION public.company_can_add_batch(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_batches))) $$;

CREATE FUNCTION public.company_can_edit_batch(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_batches))) $$;

CREATE FUNCTION public.company_can_delete_batch(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_batches))) $$;

CREATE FUNCTION public.company_can_add_revenue(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance))) $$;

CREATE FUNCTION public.company_can_edit_revenue(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance))) $$;

CREATE FUNCTION public.company_can_delete_revenue(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance))) $$;

CREATE FUNCTION public.company_can_add_expense(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance))) $$;

CREATE FUNCTION public.company_can_edit_expense(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance))) $$;

CREATE FUNCTION public.company_can_delete_expense(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance))) $$;

CREATE FUNCTION public.company_can_add_expense_source(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND role = 'admin') $$;

CREATE FUNCTION public.company_can_transfer(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND can_transfer))) $$;

-- 7. Recreate any RLS policies that were dropped by CASCADE
-- Moderator view policy
CREATE POLICY "Company moderators can view company memberships"
ON public.company_memberships FOR SELECT TO authenticated
USING (public.is_company_moderator(company_id, auth.uid()));

-- Recreate any RLS policies on other tables that used the dropped functions
-- Students
DO $do$
BEGIN
  -- Drop policies if they exist then recreate
  DROP POLICY IF EXISTS "company_can_add_student" ON public.students;
  DROP POLICY IF EXISTS "company_can_edit_student" ON public.students;
  DROP POLICY IF EXISTS "company_can_delete_student" ON public.students;

  CREATE POLICY "company_can_add_student" ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.company_can_add_student(company_id, auth.uid()));

  CREATE POLICY "company_can_edit_student" ON public.students FOR UPDATE TO authenticated
  USING (public.company_can_edit_student(company_id, auth.uid()));

  CREATE POLICY "company_can_delete_student" ON public.students FOR DELETE TO authenticated
  USING (public.company_can_delete_student(company_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- Student payments
DO $do$
BEGIN
  DROP POLICY IF EXISTS "company_can_add_payment" ON public.student_payments;
  DROP POLICY IF EXISTS "company_can_edit_payment" ON public.student_payments;
  DROP POLICY IF EXISTS "company_can_delete_payment" ON public.student_payments;

  CREATE POLICY "company_can_add_payment" ON public.student_payments FOR INSERT TO authenticated
  WITH CHECK (public.company_can_add_payment(company_id, auth.uid()));

  CREATE POLICY "company_can_edit_payment" ON public.student_payments FOR UPDATE TO authenticated
  USING (public.company_can_edit_payment(company_id, auth.uid()));

  CREATE POLICY "company_can_delete_payment" ON public.student_payments FOR DELETE TO authenticated
  USING (public.company_can_delete_payment(company_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- Batches
DO $do$
BEGIN
  DROP POLICY IF EXISTS "company_can_add_batch" ON public.batches;
  DROP POLICY IF EXISTS "company_can_edit_batch" ON public.batches;
  DROP POLICY IF EXISTS "company_can_delete_batch" ON public.batches;

  CREATE POLICY "company_can_add_batch" ON public.batches FOR INSERT TO authenticated
  WITH CHECK (public.company_can_add_batch(company_id, auth.uid()));

  CREATE POLICY "company_can_edit_batch" ON public.batches FOR UPDATE TO authenticated
  USING (public.company_can_edit_batch(company_id, auth.uid()));

  CREATE POLICY "company_can_delete_batch" ON public.batches FOR DELETE TO authenticated
  USING (public.company_can_delete_batch(company_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- Revenues
DO $do$
BEGIN
  DROP POLICY IF EXISTS "company_can_add_revenue" ON public.revenues;
  DROP POLICY IF EXISTS "company_can_edit_revenue" ON public.revenues;
  DROP POLICY IF EXISTS "company_can_delete_revenue" ON public.revenues;

  CREATE POLICY "company_can_add_revenue" ON public.revenues FOR INSERT TO authenticated
  WITH CHECK (public.company_can_add_revenue(company_id, auth.uid()));

  CREATE POLICY "company_can_edit_revenue" ON public.revenues FOR UPDATE TO authenticated
  USING (public.company_can_edit_revenue(company_id, auth.uid()));

  CREATE POLICY "company_can_delete_revenue" ON public.revenues FOR DELETE TO authenticated
  USING (public.company_can_delete_revenue(company_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

-- Expenses
DO $do$
BEGIN
  DROP POLICY IF EXISTS "company_can_add_expense" ON public.expenses;
  DROP POLICY IF EXISTS "company_can_edit_expense" ON public.expenses;
  DROP POLICY IF EXISTS "company_can_delete_expense" ON public.expenses;

  CREATE POLICY "company_can_add_expense" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.company_can_add_expense(company_id, auth.uid()));

  CREATE POLICY "company_can_edit_expense" ON public.expenses FOR UPDATE TO authenticated
  USING (public.company_can_edit_expense(company_id, auth.uid()));

  CREATE POLICY "company_can_delete_expense" ON public.expenses FOR DELETE TO authenticated
  USING (public.company_can_delete_expense(company_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;
