
-- ============================================================
-- Investor & Debt Tracking System — Cipher-only module
-- ============================================================

-- 1. Stakeholders
CREATE TABLE public.stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stakeholder_type text NOT NULL CHECK (stakeholder_type IN ('investor', 'lender')),
  category text NOT NULL DEFAULT 'individual' CHECK (category IN ('individual', 'organization', 'bank', 'family', 'partner')),
  name text NOT NULL,
  contact_number text,
  email text,
  address text,
  id_number text,
  relationship_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exited', 'inactive')),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stakeholders_company ON public.stakeholders(company_id);
CREATE INDEX idx_stakeholders_type ON public.stakeholders(company_id, stakeholder_type);
CREATE INDEX idx_stakeholders_status ON public.stakeholders(company_id, status);

ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cipher can select stakeholders" ON public.stakeholders FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can insert stakeholders" ON public.stakeholders FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Cipher can update stakeholders" ON public.stakeholders FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can delete stakeholders" ON public.stakeholders FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));

CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Investments
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  investment_amount numeric NOT NULL CHECK (investment_amount > 0),
  investment_date date NOT NULL,
  ownership_percentage numeric NOT NULL DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  profit_share_percentage numeric NOT NULL DEFAULT 0 CHECK (profit_share_percentage >= 0 AND profit_share_percentage <= 100),
  investment_type text NOT NULL DEFAULT 'equity' CHECK (investment_type IN ('equity', 'profit_sharing', 'convertible')),
  company_valuation_at_investment numeric,
  terms_and_conditions text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exited', 'bought_out')),
  exit_date date,
  exit_amount numeric,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investments_company ON public.investments(company_id);
CREATE INDEX idx_investments_stakeholder ON public.investments(stakeholder_id);
CREATE INDEX idx_investments_status ON public.investments(company_id, status);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cipher can select investments" ON public.investments FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can insert investments" ON public.investments FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Cipher can update investments" ON public.investments FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can delete investments" ON public.investments FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Profit Distributions
CREATE TABLE public.profit_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  distribution_date date NOT NULL,
  profit_period_start date NOT NULL,
  profit_period_end date NOT NULL,
  total_company_profit numeric NOT NULL,
  investor_share_percentage numeric NOT NULL,
  calculated_amount numeric NOT NULL,
  amount_paid numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
  payment_reference text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'deferred', 'partial')),
  notes text,
  distributed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profit_dist_company ON public.profit_distributions(company_id);
CREATE INDEX idx_profit_dist_investment ON public.profit_distributions(investment_id);

ALTER TABLE public.profit_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cipher can select profit_distributions" ON public.profit_distributions FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can insert profit_distributions" ON public.profit_distributions FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()) AND distributed_by = auth.uid());
CREATE POLICY "Cipher can update profit_distributions" ON public.profit_distributions FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can delete profit_distributions" ON public.profit_distributions FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));

-- 4. Loans
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loan_amount numeric NOT NULL CHECK (loan_amount > 0),
  interest_rate numeric NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  interest_amount numeric NOT NULL DEFAULT 0,
  total_repayable numeric NOT NULL,
  loan_date date NOT NULL,
  loan_purpose text,
  repayment_type text NOT NULL DEFAULT 'flexible' CHECK (repayment_type IN ('one_time', 'monthly', 'quarterly', 'flexible')),
  repayment_start_date date,
  repayment_due_date date NOT NULL,
  monthly_installment numeric,
  collateral_description text,
  loan_agreement_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'overdue', 'restructured', 'defaulted')),
  remaining_balance numeric NOT NULL,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loans_company ON public.loans(company_id);
CREATE INDEX idx_loans_stakeholder ON public.loans(stakeholder_id);
CREATE INDEX idx_loans_status ON public.loans(company_id, status);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cipher can select loans" ON public.loans FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can insert loans" ON public.loans FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Cipher can update loans" ON public.loans FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can delete loans" ON public.loans FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Loan Repayments
CREATE TABLE public.loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repayment_date date NOT NULL,
  amount_paid numeric NOT NULL CHECK (amount_paid > 0),
  principal_portion numeric NOT NULL DEFAULT 0,
  interest_portion numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
  receipt_number text,
  payment_status text NOT NULL DEFAULT 'on_time' CHECK (payment_status IN ('on_time', 'late', 'partial', 'ahead')),
  days_overdue integer DEFAULT 0,
  notes text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loan_repayments_company ON public.loan_repayments(company_id);
CREATE INDEX idx_loan_repayments_loan ON public.loan_repayments(loan_id);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cipher can select loan_repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can insert loan_repayments" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()) AND recorded_by = auth.uid());
CREATE POLICY "Cipher can update loan_repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
CREATE POLICY "Cipher can delete loan_repayments" ON public.loan_repayments FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND company_id = get_active_company_id(auth.uid()));
