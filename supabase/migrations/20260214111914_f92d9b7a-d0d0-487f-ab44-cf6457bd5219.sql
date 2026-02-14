
-- Drop the recursive moderator policy
DROP POLICY IF EXISTS "Company moderators can view company memberships" ON public.company_memberships;

-- Drop the recursive moderator profile policy  
DROP POLICY IF EXISTS "Company moderators can view member profiles" ON public.user_profiles;

-- Create a SECURITY DEFINER function to check if user is a company moderator
CREATE OR REPLACE FUNCTION public.is_company_moderator(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND company_id = _company_id
    AND role = 'moderator'
    AND status = 'active'
  )
$$;

-- Re-create moderator SELECT policy using the safe function
CREATE POLICY "Company moderators can view company memberships"
ON public.company_memberships
FOR SELECT
USING (
  is_company_moderator(auth.uid(), company_id)
);

-- Re-create moderator profile viewing policy using the safe function
CREATE POLICY "Company moderators can view member profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.company_id IN (
      SELECT cm2.company_id FROM public.company_memberships cm2
      WHERE cm2.user_id = auth.uid()
        AND cm2.role = 'moderator'
        AND cm2.status = 'active'
    )
    AND cm.user_id = user_profiles.user_id
    AND cm.status = 'active'
  )
);
