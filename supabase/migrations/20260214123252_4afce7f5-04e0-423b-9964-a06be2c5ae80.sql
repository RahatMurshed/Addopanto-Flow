
-- Recreate the view with SECURITY INVOKER (default, safe) to use the querying user's permissions
DROP VIEW IF EXISTS public.companies_public;
CREATE VIEW public.companies_public 
WITH (security_invoker = true) AS
SELECT id, name, slug, description, logo_url, currency, fiscal_year_start_month, created_by, created_at, updated_at
FROM public.companies;

GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_public TO anon;
