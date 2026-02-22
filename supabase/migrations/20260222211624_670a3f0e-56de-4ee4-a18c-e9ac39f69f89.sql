
-- Security definer function so any authenticated user can get cipher user IDs for filtering
CREATE OR REPLACE FUNCTION public.get_cipher_user_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(user_id), '{}'::uuid[])
  FROM public.user_roles
  WHERE role = 'cipher'
$$;
