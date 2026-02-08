-- Drop existing restrictive SELECT policies for all data tables
DROP POLICY IF EXISTS "Users can view own revenues" ON public.revenues;
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view own expense accounts" ON public.expense_accounts;
DROP POLICY IF EXISTS "Users can view own revenue sources" ON public.revenue_sources;
DROP POLICY IF EXISTS "Users can view own allocations" ON public.allocations;
DROP POLICY IF EXISTS "Users can view own transfers" ON public.khata_transfers;

-- Create new SELECT policies allowing all authenticated users to view all data
CREATE POLICY "Authenticated users can view all revenues"
ON public.revenues
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all expense accounts"
ON public.expense_accounts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all revenue sources"
ON public.revenue_sources
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all allocations"
ON public.allocations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all transfers"
ON public.khata_transfers
FOR SELECT
TO authenticated
USING (true);