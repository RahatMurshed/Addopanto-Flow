
-- NEW: Employee permission columns
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_employees_add boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_employees_edit boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_employees_delete boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_employees_salary boolean DEFAULT false;

-- NEW: View permission columns
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_view_courses boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_view_batches boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_view_revenue boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_view_expenses boolean DEFAULT false;
ALTER TABLE public.company_memberships ADD COLUMN IF NOT EXISTS mod_view_employees boolean DEFAULT false;

-- Employee permission functions
CREATE OR REPLACE FUNCTION public.company_can_add_employee(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_add = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_employee(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_edit = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_employee(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_delete = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_manage_salary(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_salary = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

-- Update company_can_view_employees to use new mod_view_employees column
CREATE OR REPLACE FUNCTION public.company_can_view_employees(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.company_can_manage_employees(_company_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = _company_id
        AND user_id = _user_id
        AND status = 'active'
        AND role = 'moderator'
        AND (can_view_employees = true OR mod_view_employees = true)
    )
$$;

-- Update employees RLS policies for granular permissions
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT
  WITH CHECK (public.company_can_add_employee(company_id, auth.uid()));

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE
  USING (public.company_can_edit_employee(company_id, auth.uid()));

DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees FOR DELETE
  USING (public.company_can_delete_employee(company_id, auth.uid()));

-- Update employee salary RLS policies
DROP POLICY IF EXISTS "salary_insert" ON public.employee_salary_payments;
CREATE POLICY "salary_insert" ON public.employee_salary_payments FOR INSERT
  WITH CHECK (public.company_can_manage_salary(company_id, auth.uid()));

DROP POLICY IF EXISTS "salary_update" ON public.employee_salary_payments;
CREATE POLICY "salary_update" ON public.employee_salary_payments FOR UPDATE
  USING (public.company_can_manage_salary(company_id, auth.uid()));

DROP POLICY IF EXISTS "salary_delete" ON public.employee_salary_payments;
CREATE POLICY "salary_delete" ON public.employee_salary_payments FOR DELETE
  USING (public.company_can_manage_salary(company_id, auth.uid()));
