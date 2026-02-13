
-- UPDATE policy: admin can only update moderator-role users
DROP POLICY "Authorized users can update roles" ON public.user_roles;
CREATE POLICY "Authorized users can update roles" ON public.user_roles
FOR UPDATE USING (
  CASE
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin') AND role = 'moderator' THEN true
    ELSE false
  END
);

-- DELETE policy: admin can only delete moderator-role users
DROP POLICY "Authorized users can delete roles" ON public.user_roles;
CREATE POLICY "Authorized users can delete roles" ON public.user_roles
FOR DELETE USING (
  CASE
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin') AND role = 'moderator' THEN true
    ELSE false
  END
);

-- INSERT policy: admin can only insert moderator role
DROP POLICY "Authorized users can insert roles" ON public.user_roles;
CREATE POLICY "Authorized users can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (
  CASE
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin') AND role = 'moderator' THEN true
    ELSE false
  END
);
