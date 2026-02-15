
-- =====================================================
-- ROLE RESTRUCTURE: Two-Level Architecture Migration
-- =====================================================

-- 1. Add 15 moderator granular permission columns
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS mod_students_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_students_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_students_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_payments_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_payments_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_payments_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_batches_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_batches_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_batches_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_revenue_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_revenue_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_revenue_delete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_expenses_add boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_expenses_edit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mod_expenses_delete boolean NOT NULL DEFAULT false;

-- 2. Migrate existing platform admin/moderator roles to 'user'
UPDATE public.user_roles SET role = 'user' WHERE role IN ('admin', 'moderator');

-- 3. Drop functions CASCADE (will drop dependent RLS policies too - we'll recreate them)
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
DROP FUNCTION IF EXISTS public.company_can_edit_delete(uuid, uuid) CASCADE;

-- 4. Recreate functions with updated logic
-- Parameter order: (_user_id uuid, _company_id uuid) matches existing RLS policy calls

CREATE FUNCTION public.company_can_add_student(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_students_add) OR (role = 'data_entry_operator' AND deo_students))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_edit_student(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_students_edit) OR (role = 'data_entry_operator' AND deo_students))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_delete_student(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_students_delete) OR (role = 'data_entry_operator' AND deo_students))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_add_payment(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_payments_add) OR (role = 'data_entry_operator' AND deo_payments))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_edit_payment(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_payments_edit) OR (role = 'data_entry_operator' AND deo_payments))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_delete_payment(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_payments_delete) OR (role = 'data_entry_operator' AND deo_payments))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_add_batch(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_batches_add) OR (role = 'data_entry_operator' AND deo_batches))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_edit_batch(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_batches_edit) OR (role = 'data_entry_operator' AND deo_batches))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_delete_batch(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_batches_delete) OR (role = 'data_entry_operator' AND deo_batches))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_add_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_revenue_add) OR (role = 'data_entry_operator' AND deo_finance))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_edit_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_revenue_edit) OR (role = 'data_entry_operator' AND deo_finance))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_delete_revenue(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_revenue_delete) OR (role = 'data_entry_operator' AND deo_finance))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_add_expense(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_expenses_add) OR (role = 'data_entry_operator' AND deo_finance))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_edit_expense(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_expenses_edit) OR (role = 'data_entry_operator' AND deo_finance))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_delete_expense(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_expenses_delete) OR (role = 'data_entry_operator' AND deo_finance))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_add_expense_source(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_expenses_add))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_transfer(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND can_transfer))
  ) OR is_cipher(_user_id);
$$;

CREATE FUNCTION public.company_can_edit_delete(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND role = 'admin'
  ) OR is_cipher(_user_id);
$$;

-- 5. Recreate the RLS policies that were dropped by CASCADE
-- NOTE: The RLS policy calls use auth.uid() as first arg and company_id as second, 
-- matching our (_user_id, _company_id) parameter order.

-- Students policies
CREATE POLICY "Authorized users can insert students" ON public.students FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_student(auth.uid(), company_id)));

CREATE POLICY "Authorized users can update students" ON public.students FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_student(auth.uid(), company_id)));

CREATE POLICY "Authorized users can delete students" ON public.students FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_student(auth.uid(), company_id)));

-- Student payments policies
CREATE POLICY "Authorized users can insert student payments" ON public.student_payments FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_payment(auth.uid(), company_id)));

CREATE POLICY "Authorized users can update student payments" ON public.student_payments FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_payment(auth.uid(), company_id)));

CREATE POLICY "Authorized users can delete student payments" ON public.student_payments FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_payment(auth.uid(), company_id)));

-- Batches policies
CREATE POLICY "Authorized users can insert batches" ON public.batches FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND (company_can_add_revenue(auth.uid(), company_id) OR company_can_add_batch(auth.uid(), company_id)));

CREATE POLICY "Authorized users can update batches" ON public.batches FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_batch(auth.uid(), company_id)));

CREATE POLICY "Authorized users can delete batches" ON public.batches FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_batch(auth.uid(), company_id)));

-- Revenues policies
CREATE POLICY "Authorized users can insert revenues" ON public.revenues FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Authorized users can update revenues" ON public.revenues FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_revenue(auth.uid(), company_id)));

CREATE POLICY "Authorized users can delete revenues" ON public.revenues FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_revenue(auth.uid(), company_id)));

-- Expenses policies
CREATE POLICY "Authorized users can insert expenses" ON public.expenses FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_expense(auth.uid(), company_id));

CREATE POLICY "Authorized users can update expenses" ON public.expenses FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_edit_expense(auth.uid(), company_id)));

CREATE POLICY "Authorized users can delete expenses" ON public.expenses FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND (company_can_edit_delete(auth.uid(), company_id) OR company_can_delete_expense(auth.uid(), company_id)));

-- Expense accounts policies (those that use company_can_add_expense_source / company_can_edit_delete)
CREATE POLICY "Authorized users can insert expense accounts" ON public.expense_accounts FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_expense_source(auth.uid(), company_id));

CREATE POLICY "Admins can update expense accounts" ON public.expense_accounts FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete expense accounts" ON public.expense_accounts FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

-- Revenue sources
CREATE POLICY "Authorized users can insert revenue sources" ON public.revenue_sources FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update revenue sources" ON public.revenue_sources FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete revenue sources" ON public.revenue_sources FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

-- Allocations
CREATE POLICY "Authorized users can insert allocations" ON public.allocations FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update allocations" ON public.allocations FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete allocations" ON public.allocations FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

-- Khata transfers
CREATE POLICY "Authorized users can insert transfers" ON public.khata_transfers FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_transfer(auth.uid(), company_id));

CREATE POLICY "Admins can update transfers" ON public.khata_transfers FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete transfers" ON public.khata_transfers FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

-- Monthly fee history
CREATE POLICY "Authorized users can insert fee history" ON public.monthly_fee_history FOR INSERT
  WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_revenue(auth.uid(), company_id));

CREATE POLICY "Admins can update fee history" ON public.monthly_fee_history FOR UPDATE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admins can delete fee history" ON public.monthly_fee_history FOR DELETE
  USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));
