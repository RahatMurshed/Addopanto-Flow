
-- Server-side function to get company members, filtering out cipher users for non-cipher callers
CREATE OR REPLACE FUNCTION public.get_company_members_filtered(_company_id uuid)
RETURNS SETOF public.company_memberships
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.*
  FROM public.company_memberships cm
  WHERE cm.company_id = _company_id
    AND cm.status = 'active'
    AND (
      -- If caller is cipher, show all members
      public.is_cipher(auth.uid())
      OR
      -- Otherwise, exclude cipher members
      NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = cm.user_id AND ur.role = 'cipher'
      )
    )
  ORDER BY cm.joined_at ASC;
$$;
