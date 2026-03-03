
-- Step 1: Add 'viewer' to company_role enum
ALTER TYPE public.company_role ADD VALUE IF NOT EXISTS 'viewer';

-- Step 2: Helper function to check if user is a viewer in a company
CREATE OR REPLACE FUNCTION public.is_company_viewer(_company_id uuid, _user_id uuid)
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
      AND role = 'viewer'
      AND status = 'active'
  );
$$;

-- Step 3: Allow viewers to SELECT on cipher-only tables

-- investments
CREATE POLICY "Viewers can select investments"
  ON public.investments FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()) AND company_id = get_active_company_id(auth.uid()));

-- loans
CREATE POLICY "Viewers can select loans"
  ON public.loans FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()) AND company_id = get_active_company_id(auth.uid()));

-- loan_repayments
CREATE POLICY "Viewers can select loan_repayments"
  ON public.loan_repayments FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()) AND company_id = get_active_company_id(auth.uid()));

-- stakeholders
CREATE POLICY "Viewers can select stakeholders"
  ON public.stakeholders FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()) AND company_id = get_active_company_id(auth.uid()));

-- profit_distributions
CREATE POLICY "Viewers can select profit_distributions"
  ON public.profit_distributions FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()) AND company_id = get_active_company_id(auth.uid()));

-- audit_logs (allow viewers to see audit trail)
CREATE POLICY "Viewers can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (company_id = get_active_company_id(auth.uid()) AND is_company_viewer(company_id, auth.uid()));

-- currency_change_logs
CREATE POLICY "Viewers can view currency logs"
  ON public.currency_change_logs FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()));

-- dashboard_access_logs (allow viewers to insert their own)
CREATE POLICY "Viewers can insert access logs"
  ON public.dashboard_access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_company_viewer(company_id, auth.uid()));

-- employee_salary_payments (read-only for viewers)
CREATE POLICY "Viewers can view salary payments"
  ON public.employee_salary_payments FOR SELECT
  USING (is_company_viewer(company_id, auth.uid()) AND company_id = get_active_company_id(auth.uid()));
