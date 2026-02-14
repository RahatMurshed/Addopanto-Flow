
-- Allow company moderators to view memberships of their company
CREATE POLICY "Company moderators can view company memberships"
ON public.company_memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = company_memberships.company_id
      AND cm.role = 'moderator'
      AND cm.status = 'active'
  )
);

-- Allow company moderators to view profiles of members in their company
CREATE POLICY "Company moderators can view member profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid()
      AND cm1.role = 'moderator'
      AND cm1.status = 'active'
      AND cm2.user_id = user_profiles.user_id
      AND cm2.status = 'active'
  )
);
