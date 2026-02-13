
-- ============================================================
-- PHASE 1: Multi-Company System - Schema & Data Migration
-- ============================================================

-- 1. New enum for company roles
CREATE TYPE public.company_role AS ENUM ('admin', 'moderator', 'viewer');

-- 2. Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  join_password text, -- bcrypt hashed
  invite_code text UNIQUE,
  logo_url text,
  description text,
  currency text NOT NULL DEFAULT 'BDT',
  fiscal_year_start_month integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Company memberships table
CREATE TABLE public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role company_role NOT NULL DEFAULT 'viewer',
  can_add_revenue boolean NOT NULL DEFAULT false,
  can_add_expense boolean NOT NULL DEFAULT false,
  can_add_expense_source boolean NOT NULL DEFAULT false,
  can_transfer boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_manage_students boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- 4. Company join requests table
CREATE TABLE public.company_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  rejection_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.company_join_requests ENABLE ROW LEVEL SECURITY;

-- 5. Add company_id to all data tables (nullable first for migration)
ALTER TABLE public.students ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.student_payments ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.monthly_fee_history ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.revenues ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.revenue_sources ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.expenses ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.expense_accounts ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.allocations ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.khata_transfers ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- 6. Add active_company_id to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN active_company_id uuid REFERENCES public.companies(id);

-- 7. Create Default Company and migrate data
DO $$
DECLARE
  default_company_id uuid;
  cipher_user_id uuid;
BEGIN
  -- Find a cipher user to be the creator
  SELECT user_id INTO cipher_user_id FROM public.user_roles WHERE role = 'cipher' LIMIT 1;
  
  -- If no cipher user, use any admin
  IF cipher_user_id IS NULL THEN
    SELECT user_id INTO cipher_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;
  
  -- If still no user, use any user
  IF cipher_user_id IS NULL THEN
    SELECT user_id INTO cipher_user_id FROM public.user_roles LIMIT 1;
  END IF;

  -- Create default company (use a fixed UUID if no users exist)
  INSERT INTO public.companies (id, name, slug, currency, created_by)
  VALUES (
    gen_random_uuid(),
    'Default Company',
    'default',
    'BDT',
    COALESCE(cipher_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  RETURNING id INTO default_company_id;

  -- Migrate all existing data to default company
  UPDATE public.students SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.student_payments SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.monthly_fee_history SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.revenues SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.revenue_sources SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.expenses SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.expense_accounts SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.allocations SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.khata_transfers SET company_id = default_company_id WHERE company_id IS NULL;

  -- Migrate user_roles to company_memberships
  -- Admin -> company admin with all permissions
  INSERT INTO public.company_memberships (user_id, company_id, role, can_add_revenue, can_add_expense, can_add_expense_source, can_transfer, can_view_reports, can_manage_students, status)
  SELECT ur.user_id, default_company_id, 'admin'::company_role, true, true, true, true, true, true, 'active'
  FROM public.user_roles ur WHERE ur.role = 'admin'
  ON CONFLICT (user_id, company_id) DO NOTHING;

  -- Cipher -> also company admin of default
  INSERT INTO public.company_memberships (user_id, company_id, role, can_add_revenue, can_add_expense, can_add_expense_source, can_transfer, can_view_reports, can_manage_students, status)
  SELECT ur.user_id, default_company_id, 'admin'::company_role, true, true, true, true, true, true, 'active'
  FROM public.user_roles ur WHERE ur.role = 'cipher'
  ON CONFLICT (user_id, company_id) DO NOTHING;

  -- Moderator -> company moderator with migrated permissions
  INSERT INTO public.company_memberships (user_id, company_id, role, can_add_revenue, can_add_expense, can_add_expense_source, can_transfer, can_view_reports, can_manage_students, status)
  SELECT ur.user_id, default_company_id, 'moderator'::company_role,
    COALESCE(mp.can_add_revenue, false),
    COALESCE(mp.can_add_expense, false),
    COALESCE(mp.can_add_expense_source, false),
    COALESCE(mp.can_transfer, false),
    COALESCE(mp.can_view_reports, false),
    false, -- can_manage_students
    'active'
  FROM public.user_roles ur
  LEFT JOIN public.moderator_permissions mp ON mp.user_id = ur.user_id
  WHERE ur.role = 'moderator'
  ON CONFLICT (user_id, company_id) DO NOTHING;

  -- Regular users -> viewers
  INSERT INTO public.company_memberships (user_id, company_id, role, status)
  SELECT ur.user_id, default_company_id, 'viewer'::company_role, 'active'
  FROM public.user_roles ur WHERE ur.role = 'user'
  ON CONFLICT (user_id, company_id) DO NOTHING;

  -- Set active_company_id for all users with memberships
  UPDATE public.user_profiles up
  SET active_company_id = default_company_id
  WHERE EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.user_id = up.user_id AND cm.company_id = default_company_id
  );
END $$;

-- 8. Now make company_id NOT NULL on all data tables
ALTER TABLE public.students ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.student_payments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.monthly_fee_history ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.revenues ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.revenue_sources ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.expense_accounts ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.allocations ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.khata_transfers ALTER COLUMN company_id SET NOT NULL;

-- 9. Add indexes for performance
CREATE INDEX idx_company_memberships_user ON public.company_memberships(user_id);
CREATE INDEX idx_company_memberships_company ON public.company_memberships(company_id);
CREATE INDEX idx_company_join_requests_company ON public.company_join_requests(company_id);
CREATE INDEX idx_company_join_requests_user ON public.company_join_requests(user_id);
CREATE INDEX idx_students_company ON public.students(company_id);
CREATE INDEX idx_student_payments_company ON public.student_payments(company_id);
CREATE INDEX idx_revenues_company ON public.revenues(company_id);
CREATE INDEX idx_expenses_company ON public.expenses(company_id);
CREATE INDEX idx_expense_accounts_company ON public.expense_accounts(company_id);
CREATE INDEX idx_allocations_company ON public.allocations(company_id);
CREATE INDEX idx_khata_transfers_company ON public.khata_transfers(company_id);
CREATE INDEX idx_revenue_sources_company ON public.revenue_sources(company_id);

-- 10. Helper functions (SECURITY DEFINER to avoid RLS recursion)

CREATE OR REPLACE FUNCTION public.get_active_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_company_id FROM public.user_profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND role = 'admin'
    AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
    AND (role = 'admin' OR can_add_revenue = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_expense(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
    AND (role = 'admin' OR can_add_expense = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_expense_source(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
    AND (role = 'admin' OR can_add_expense_source = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_transfer(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
    AND (role = 'admin' OR can_transfer = true)
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_delete(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND status = 'active'
    AND role = 'admin'
  ) OR public.is_cipher(_user_id)
$$;

-- 11. Update trigger for companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 12. DROP ALL OLD RLS POLICIES and create new company-scoped ones
-- ============================================================

-- === COMPANIES ===
CREATE POLICY "Authenticated users can view companies"
ON public.companies FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Cipher can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_cipher(auth.uid()));

CREATE POLICY "Cipher or company admin can update company"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_cipher(auth.uid()) OR public.is_company_admin(auth.uid(), id));

CREATE POLICY "Cipher can delete companies"
ON public.companies FOR DELETE TO authenticated
USING (public.is_cipher(auth.uid()));

-- === COMPANY MEMBERSHIPS ===
CREATE POLICY "Users can view own memberships"
ON public.company_memberships FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Company admins can view company memberships"
ON public.company_memberships FOR SELECT TO authenticated
USING (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()));

CREATE POLICY "Company admins can insert memberships"
ON public.company_memberships FOR INSERT TO authenticated
WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()));

CREATE POLICY "Company admins can update memberships"
ON public.company_memberships FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()));

CREATE POLICY "Company admins can delete memberships"
ON public.company_memberships FOR DELETE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()));

-- === COMPANY JOIN REQUESTS ===
CREATE POLICY "Users can view own join requests"
ON public.company_join_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Company admins can view join requests"
ON public.company_join_requests FOR SELECT TO authenticated
USING (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()));

CREATE POLICY "Authenticated users can create join requests"
ON public.company_join_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Company admins can update join requests"
ON public.company_join_requests FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()));

-- === STUDENTS (drop old, create new) ===
DROP POLICY IF EXISTS "Authenticated users can view all students" ON public.students;
DROP POLICY IF EXISTS "Authorized users can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;

CREATE POLICY "Company members can view students"
ON public.students FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert students"
ON public.students FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update students"
ON public.students FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete students"
ON public.students FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === STUDENT PAYMENTS ===
DROP POLICY IF EXISTS "Authenticated users can view all student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Authorized users can insert student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Admins can update student payments" ON public.student_payments;
DROP POLICY IF EXISTS "Admins can delete student payments" ON public.student_payments;

CREATE POLICY "Company members can view student payments"
ON public.student_payments FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert student payments"
ON public.student_payments FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update student payments"
ON public.student_payments FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete student payments"
ON public.student_payments FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === MONTHLY FEE HISTORY ===
DROP POLICY IF EXISTS "Authenticated users can view all fee history" ON public.monthly_fee_history;
DROP POLICY IF EXISTS "Authorized users can insert fee history" ON public.monthly_fee_history;
DROP POLICY IF EXISTS "Admins can update fee history" ON public.monthly_fee_history;
DROP POLICY IF EXISTS "Admins can delete fee history" ON public.monthly_fee_history;

CREATE POLICY "Company members can view fee history"
ON public.monthly_fee_history FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert fee history"
ON public.monthly_fee_history FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update fee history"
ON public.monthly_fee_history FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete fee history"
ON public.monthly_fee_history FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === REVENUES ===
DROP POLICY IF EXISTS "Authenticated users can view all revenues" ON public.revenues;
DROP POLICY IF EXISTS "Authorized users can insert revenues" ON public.revenues;
DROP POLICY IF EXISTS "Admins can update revenues" ON public.revenues;
DROP POLICY IF EXISTS "Admins can delete revenues" ON public.revenues;

CREATE POLICY "Company members can view revenues"
ON public.revenues FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert revenues"
ON public.revenues FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update revenues"
ON public.revenues FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete revenues"
ON public.revenues FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === REVENUE SOURCES ===
DROP POLICY IF EXISTS "Authenticated users can view all revenue sources" ON public.revenue_sources;
DROP POLICY IF EXISTS "Authorized users can insert revenue sources" ON public.revenue_sources;
DROP POLICY IF EXISTS "Admins can update revenue sources" ON public.revenue_sources;
DROP POLICY IF EXISTS "Admins can delete revenue sources" ON public.revenue_sources;

CREATE POLICY "Company members can view revenue sources"
ON public.revenue_sources FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert revenue sources"
ON public.revenue_sources FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update revenue sources"
ON public.revenue_sources FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete revenue sources"
ON public.revenue_sources FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === EXPENSES ===
DROP POLICY IF EXISTS "Authenticated users can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authorized users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "Company members can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_expense(auth.uid(), company_id));

CREATE POLICY "Admins can update expenses"
ON public.expenses FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete expenses"
ON public.expenses FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === EXPENSE ACCOUNTS ===
DROP POLICY IF EXISTS "Authenticated users can view all expense accounts" ON public.expense_accounts;
DROP POLICY IF EXISTS "Authorized users can insert expense accounts" ON public.expense_accounts;
DROP POLICY IF EXISTS "Admins can update expense accounts" ON public.expense_accounts;
DROP POLICY IF EXISTS "Admins can delete expense accounts" ON public.expense_accounts;

CREATE POLICY "Company members can view expense accounts"
ON public.expense_accounts FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert expense accounts"
ON public.expense_accounts FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_expense_source(auth.uid(), company_id));

CREATE POLICY "Admins can update expense accounts"
ON public.expense_accounts FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete expense accounts"
ON public.expense_accounts FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === ALLOCATIONS ===
DROP POLICY IF EXISTS "Authenticated users can view all allocations" ON public.allocations;
DROP POLICY IF EXISTS "Authorized users can insert allocations" ON public.allocations;
DROP POLICY IF EXISTS "Admins can update allocations" ON public.allocations;
DROP POLICY IF EXISTS "Admins can delete allocations" ON public.allocations;

CREATE POLICY "Company members can view allocations"
ON public.allocations FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert allocations"
ON public.allocations FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update allocations"
ON public.allocations FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete allocations"
ON public.allocations FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === KHATA TRANSFERS ===
DROP POLICY IF EXISTS "Authenticated users can view all transfers" ON public.khata_transfers;
DROP POLICY IF EXISTS "Authorized users can insert transfers" ON public.khata_transfers;
DROP POLICY IF EXISTS "Admins can update transfers" ON public.khata_transfers;
DROP POLICY IF EXISTS "Admins can delete transfers" ON public.khata_transfers;

CREATE POLICY "Company members can view transfers"
ON public.khata_transfers FOR SELECT TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can insert transfers"
ON public.khata_transfers FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_transfer(auth.uid(), company_id));

CREATE POLICY "Admins can update transfers"
ON public.khata_transfers FOR UPDATE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete transfers"
ON public.khata_transfers FOR DELETE TO authenticated
USING (company_id = public.get_active_company_id(auth.uid()) AND public.company_can_edit_delete(auth.uid(), company_id));

-- === USER PROFILES (keep existing + add active_company update policy) ===
-- Existing policies are fine, just need to ensure users can update their own active_company_id

-- === Enable realtime for company_join_requests ===
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_memberships;
