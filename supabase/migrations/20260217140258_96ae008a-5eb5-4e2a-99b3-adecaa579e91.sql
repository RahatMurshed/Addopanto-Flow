-- Add INSERT policy for expense_accounts (admins and authorized moderators)
CREATE POLICY "Authorized members can insert expense accounts"
ON public.expense_accounts
FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
);