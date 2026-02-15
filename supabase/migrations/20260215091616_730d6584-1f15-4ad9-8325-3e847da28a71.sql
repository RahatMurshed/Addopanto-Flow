-- Fix: Recreate companies_public view with SECURITY INVOKER to use the querying user's permissions
CREATE OR REPLACE VIEW public.companies_public
WITH (security_invoker = true)
AS
SELECT id,
    name,
    slug,
    description,
    logo_url,
    currency,
    exchange_rate,
    base_currency,
    fiscal_year_start_month,
    created_by,
    created_at,
    updated_at
FROM companies;