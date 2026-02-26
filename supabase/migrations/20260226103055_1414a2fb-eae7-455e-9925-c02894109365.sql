
-- Fix: Allow all authenticated users to browse companies via companies_public view
-- The companies_public view intentionally excludes join_password and invite_code
-- so it's safe for all authenticated users to see
-- We need this for the join company flow

-- Add a permissive policy for the base companies table SELECT
-- but only for the fields exposed through companies_public view
-- Since RLS can't restrict columns, we add a policy on the base table
-- for browsing. The sensitive columns (join_password, invite_code)
-- are only accessible to admins/ciphers via the existing restrictive policy.
-- BUT users can still query the base table and see those columns.

-- Better approach: Create a security-definer function for company browsing
CREATE OR REPLACE FUNCTION public.browse_companies_safe()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, description, logo_url
  FROM public.companies
  ORDER BY name;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.browse_companies_safe() TO authenticated;
