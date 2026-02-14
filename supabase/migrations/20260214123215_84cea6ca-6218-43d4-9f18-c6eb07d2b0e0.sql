
-- Create a public view that hides sensitive columns
CREATE OR REPLACE VIEW public.companies_public AS
SELECT id, name, slug, description, logo_url, currency, fiscal_year_start_month, created_by, created_at, updated_at
FROM public.companies;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_public TO anon;
