
-- Gap 1: Tighten expense_accounts INSERT policy
DROP POLICY "Authorized users can insert expense accounts" ON expense_accounts;
CREATE POLICY "Admin/Cipher can insert expense accounts" ON expense_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_active_company_id(auth.uid())
    AND company_can_add_expense_source(company_id, auth.uid())
    AND user_id = auth.uid()
  );

-- Gap 2: Tighten allocations INSERT policy
DROP POLICY "Authorized users can insert allocations" ON allocations;
CREATE POLICY "Admin/Cipher can insert allocations" ON allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_active_company_id(auth.uid())
    AND company_can_edit_delete(auth.uid(), company_id)
    AND user_id = auth.uid()
  );

-- Gap 3: Add missing UPDATE/DELETE policies for student_siblings
CREATE POLICY "Admin/Cipher can update student siblings" ON student_siblings
  FOR UPDATE TO authenticated
  USING (
    company_id = get_active_company_id(auth.uid())
    AND company_can_edit_delete(auth.uid(), company_id)
  );

CREATE POLICY "Admin/Cipher can delete student siblings" ON student_siblings
  FOR DELETE TO authenticated
  USING (
    company_id = get_active_company_id(auth.uid())
    AND company_can_edit_delete(auth.uid(), company_id)
  );
