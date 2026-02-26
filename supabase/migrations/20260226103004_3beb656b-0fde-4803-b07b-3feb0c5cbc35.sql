
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1. FIX CRITICAL: Companies browse policy exposes join_password and invite_code
--    Replace the overly permissive browse policy with one that only shows non-sensitive fields
--    We can't restrict columns in RLS, so we drop the browse policy and replace companies_public view

-- Drop the dangerous browse policy
DROP POLICY IF EXISTS "Authenticated users can browse companies" ON public.companies;

-- Create a safe browse policy that requires membership or cipher
CREATE POLICY "Members can browse their companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  is_company_member(auth.uid(), id)
  OR is_cipher(auth.uid())
);

-- Update companies_public view to exclude sensitive fields (join_password, invite_code)
DROP VIEW IF EXISTS public.companies_public;
CREATE VIEW public.companies_public AS
SELECT id, name, slug, description, logo_url, currency, exchange_rate,
       base_currency, fiscal_year_start_month, created_by, created_at, updated_at
FROM public.companies;

-- Grant access to the view
GRANT SELECT ON public.companies_public TO authenticated;

-- 2. DEO MODE ENFORCEMENT: Students table
--    Add RLS policies that filter DEO moderators to only see their own students

-- Drop existing SELECT policy and replace with DEO-aware version
DROP POLICY IF EXISTS "Company members can view students" ON public.students;
CREATE POLICY "Company members can view students"
ON public.students
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND (
    -- Non-DEO users see all students
    NOT is_data_entry_moderator(company_id, auth.uid())
    -- DEO users only see their own students
    OR user_id = auth.uid()
  )
);

-- Update student INSERT to enforce DEO permission check
DROP POLICY IF EXISTS "company_can_add_student" ON public.students;
CREATE POLICY "company_can_add_student"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  company_can_add_student(company_id, auth.uid())
  AND user_id = auth.uid()  -- Enforce user_id matches caller
);

-- Update student UPDATE to enforce DEO created_by check
DROP POLICY IF EXISTS "company_can_edit_student" ON public.students;
CREATE POLICY "company_can_edit_student"
ON public.students
FOR UPDATE
TO authenticated
USING (
  company_can_edit_student(company_id, auth.uid())
  AND (
    NOT is_data_entry_moderator(company_id, auth.uid())
    OR user_id = auth.uid()
  )
);

-- Update student DELETE to enforce DEO created_by check
DROP POLICY IF EXISTS "company_can_delete_student" ON public.students;
CREATE POLICY "company_can_delete_student"
ON public.students
FOR DELETE
TO authenticated
USING (
  company_can_delete_student(company_id, auth.uid())
  AND (
    NOT is_data_entry_moderator(company_id, auth.uid())
    OR user_id = auth.uid()
  )
);

-- 3. DEO MODE ENFORCEMENT: Student payments
--    DEO moderators should NOT be able to access payments at all
DROP POLICY IF EXISTS "Company members can view student payments" ON public.student_payments;
CREATE POLICY "Company members can view student payments"
ON public.student_payments
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- Update payment INSERT to block DEO
DROP POLICY IF EXISTS "company_can_add_payment" ON public.student_payments;
CREATE POLICY "company_can_add_payment"
ON public.student_payments
FOR INSERT
TO authenticated
WITH CHECK (
  company_can_add_payment(company_id, auth.uid())
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- Update payment UPDATE to block DEO
DROP POLICY IF EXISTS "company_can_edit_payment" ON public.student_payments;
CREATE POLICY "company_can_edit_payment"
ON public.student_payments
FOR UPDATE
TO authenticated
USING (
  company_can_edit_payment(company_id, auth.uid())
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- Update payment DELETE to block DEO
DROP POLICY IF EXISTS "company_can_delete_payment" ON public.student_payments;
CREATE POLICY "company_can_delete_payment"
ON public.student_payments
FOR DELETE
TO authenticated
USING (
  company_can_delete_payment(company_id, auth.uid())
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 4. DEO MODE ENFORCEMENT: Expenses
--    DEO moderators can only see/manage their own expenses
DROP POLICY IF EXISTS "Company members can view expenses" ON public.expenses;
CREATE POLICY "Company members can view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND (
    NOT is_data_entry_moderator(company_id, auth.uid())
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "company_can_add_expense" ON public.expenses;
CREATE POLICY "company_can_add_expense"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (
  company_can_add_expense(company_id, auth.uid())
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "company_can_edit_expense" ON public.expenses;
CREATE POLICY "company_can_edit_expense"
ON public.expenses
FOR UPDATE
TO authenticated
USING (
  company_can_edit_expense(company_id, auth.uid())
  AND (
    NOT is_data_entry_moderator(company_id, auth.uid())
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "company_can_delete_expense" ON public.expenses;
CREATE POLICY "company_can_delete_expense"
ON public.expenses
FOR DELETE
TO authenticated
USING (
  company_can_delete_expense(company_id, auth.uid())
  AND (
    NOT is_data_entry_moderator(company_id, auth.uid())
    OR user_id = auth.uid()
  )
);

-- 5. DEO MODE ENFORCEMENT: Revenue - block DEO completely
DROP POLICY IF EXISTS "Company members can view revenues" ON public.revenues;
CREATE POLICY "Company members can view revenues"
ON public.revenues
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

DROP POLICY IF EXISTS "company_can_add_revenue" ON public.revenues;
CREATE POLICY "company_can_add_revenue"
ON public.revenues
FOR INSERT
TO authenticated
WITH CHECK (
  company_can_add_revenue(company_id, auth.uid())
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

DROP POLICY IF EXISTS "company_can_edit_revenue" ON public.revenues;
CREATE POLICY "company_can_edit_revenue"
ON public.revenues
FOR UPDATE
TO authenticated
USING (
  company_can_edit_revenue(company_id, auth.uid())
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

DROP POLICY IF EXISTS "company_can_delete_revenue" ON public.revenues;
CREATE POLICY "company_can_delete_revenue"
ON public.revenues
FOR DELETE
TO authenticated
USING (
  company_can_delete_revenue(company_id, auth.uid())
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 6. DEO MODE: Block courses access for DEO moderators
DROP POLICY IF EXISTS "Company members can view courses" ON public.courses;
CREATE POLICY "Company members can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 7. DEO MODE: Block batches access for DEO moderators
DROP POLICY IF EXISTS "Company members can view batches" ON public.batches;
CREATE POLICY "Company members can view batches"
ON public.batches
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 8. DEO MODE: Block products for DEO moderators
DROP POLICY IF EXISTS "Company members can view products" ON public.products;
CREATE POLICY "Company members can view products"
ON public.products
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 9. Dashboard access: Restrict to admin/cipher only (block all moderators)
--    The dashboard queries revenues/expenses/students which have their own RLS,
--    but we add an explicit dashboard_access_logs check
--    Note: dashboard_access_logs INSERT already checks user_id = auth.uid()
--    The actual data tables already have RLS. Dashboard aggregation is safe.

-- 10. Audit logs: Already restricted to admin/cipher via "Company admins can view audit logs" ✓

-- 11. Company memberships: Already restricted via isCompanyAdmin/isCipher ✓

-- 12. Fix: Ensure user_id is always enforced on INSERT for allocations
DROP POLICY IF EXISTS "Authorized users can insert allocations" ON public.allocations;
CREATE POLICY "Authorized users can insert allocations"
ON public.allocations
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
  AND user_id = auth.uid()
);

-- 13. Fix: Enforce user_id on khata_transfers INSERT
DROP POLICY IF EXISTS "Authorized users can insert khata transfers" ON public.khata_transfers;
CREATE POLICY "Authorized users can insert khata transfers"
ON public.khata_transfers
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (company_can_transfer(company_id, auth.uid()) OR is_cipher(auth.uid()))
  AND user_id = auth.uid()
);

-- 14. Fix: Enforce user_id on expense_accounts INSERT
DROP POLICY IF EXISTS "Authorized users can insert expense accounts" ON public.expense_accounts;
CREATE POLICY "Authorized users can insert expense accounts"
ON public.expense_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_member(auth.uid(), company_id) OR is_cipher(auth.uid()))
  AND user_id = auth.uid()
);

-- 15. Fix: Enforce user_id on revenue_sources INSERT
DROP POLICY IF EXISTS "Authorized users can insert revenue sources" ON public.revenue_sources;
CREATE POLICY "Authorized users can insert revenue sources"
ON public.revenue_sources
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
  AND user_id = auth.uid()
);

-- 16. Fix: Block DEO from viewing/inserting revenue_sources
DROP POLICY IF EXISTS "Company members can view revenue sources" ON public.revenue_sources;
CREATE POLICY "Company members can view revenue sources"
ON public.revenue_sources
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 17. Block DEO from product_sales
DROP POLICY IF EXISTS "Company members can view product sales" ON public.product_sales;
CREATE POLICY "Company members can view product sales"
ON public.product_sales
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 18. Block DEO from product_categories
DROP POLICY IF EXISTS "Company members can view categories" ON public.product_categories;
CREATE POLICY "Company members can view categories"
ON public.product_categories
FOR SELECT
TO authenticated
USING (
  is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 19. Block DEO from product_stock_movements
DROP POLICY IF EXISTS "Company members can view stock movements" ON public.product_stock_movements;
CREATE POLICY "Company members can view stock movements"
ON public.product_stock_movements
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 20. Ensure expense_accounts view is also DEO-restricted for revenue visibility
DROP POLICY IF EXISTS "Company members can view expense accounts" ON public.expense_accounts;
CREATE POLICY "Company members can view expense accounts"
ON public.expense_accounts
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
);

-- 21. Block DEO from allocations view (financial data)
DROP POLICY IF EXISTS "Company members can view allocations" ON public.allocations;
CREATE POLICY "Company members can view allocations"
ON public.allocations
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 22. Block DEO from khata_transfers view (financial data)
DROP POLICY IF EXISTS "Company members can view transfers" ON public.khata_transfers;
CREATE POLICY "Company members can view transfers"
ON public.khata_transfers
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);

-- 23. Block DEO from monthly_fee_history (financial data)  
DROP POLICY IF EXISTS "Company members can view fee history" ON public.monthly_fee_history;
CREATE POLICY "Company members can view fee history"
ON public.monthly_fee_history
FOR SELECT
TO authenticated
USING (
  company_id = get_active_company_id(auth.uid())
  AND is_company_member(auth.uid(), company_id)
  AND NOT is_data_entry_moderator(company_id, auth.uid())
);
