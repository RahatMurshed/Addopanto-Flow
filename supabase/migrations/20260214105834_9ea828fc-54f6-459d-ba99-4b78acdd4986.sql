
-- Allow company admins to view profiles of users who are members of their company
CREATE POLICY "Company admins can view member profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
      AND cm1.role = 'admin'
      AND cm1.status = 'active'
      AND cm2.user_id = user_profiles.user_id
      AND cm2.status = 'active'
  )
);
