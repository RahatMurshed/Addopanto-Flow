
-- Drop and recreate companies_public view with exchange_rate and base_currency
DROP VIEW IF EXISTS public.companies_public;

CREATE VIEW public.companies_public AS
SELECT id, name, slug, description, logo_url, currency,
       exchange_rate, base_currency,
       fiscal_year_start_month, created_by, created_at, updated_at
FROM public.companies;

-- Add companies table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
