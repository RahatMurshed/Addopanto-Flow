
-- RPC: get_dashboard_totals
-- Returns all-time aggregate totals for a company's revenues, expenses, and allocations
-- This replaces fetching all rows client-side which hits the 1000-row limit
CREATE OR REPLACE FUNCTION public.get_dashboard_totals(
  _company_id uuid
)
RETURNS TABLE (
  total_revenue numeric,
  total_expenses numeric,
  total_allocations numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(amount) FROM revenues WHERE company_id = _company_id), 0) AS total_revenue,
    COALESCE((SELECT SUM(amount) FROM expenses WHERE company_id = _company_id), 0) AS total_expenses,
    COALESCE((SELECT SUM(amount) FROM allocations WHERE company_id = _company_id), 0) AS total_allocations;
$$;
