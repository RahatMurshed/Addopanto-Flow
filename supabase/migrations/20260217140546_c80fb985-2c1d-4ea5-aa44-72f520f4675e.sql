
-- Drop the broken expense_accounts INSERT policy
DROP POLICY IF EXISTS "Authorized members can insert expense accounts" ON public.expense_accounts;

-- 1. expense_accounts: member or cipher
CREATE POLICY "Authorized users can insert expense accounts"
ON public.expense_accounts FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

-- 2. revenue_sources: admin or cipher
CREATE POLICY "Authorized users can insert revenue sources"
ON public.revenue_sources FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

-- 3. courses: admin or cipher
CREATE POLICY "Authorized users can insert courses"
ON public.courses FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

-- 4. allocations: member or cipher
CREATE POLICY "Authorized users can insert allocations"
ON public.allocations FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

-- 5. khata_transfers: company_can_transfer or cipher
CREATE POLICY "Authorized users can insert khata transfers"
ON public.khata_transfers FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (company_can_transfer(company_id, auth.uid()) OR is_cipher(auth.uid()))
);

-- 6. monthly_fee_history: member or cipher
CREATE POLICY "Authorized users can insert fee history"
ON public.monthly_fee_history FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
);

-- 7. student_siblings: member or cipher
CREATE POLICY "Authorized users can insert student siblings"
ON public.student_siblings FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
);
