
-- 1. Drop overly permissive INSERT/UPDATE/DELETE policies on user_roles
-- These allowed any Cipher to directly manipulate roles without audit trail
DROP POLICY IF EXISTS "Authorized users can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authorized users can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authorized users can delete roles" ON public.user_roles;

-- 2. Re-create tighter policies: only service_role (edge function) can mutate cipher roles
-- Non-cipher role mutations still allowed for admins managing moderators
CREATE POLICY "Service role manages roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserting non-cipher roles via direct client
  -- Cipher role assignments MUST go through edge function (service_role)
  CASE
    WHEN role = 'cipher'::app_role THEN false  -- Block direct cipher promotion
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin'::app_role) AND role = 'moderator'::app_role THEN true
    ELSE false
  END
);

CREATE POLICY "Service role updates roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  CASE
    WHEN role = 'cipher'::app_role THEN false  -- Block direct cipher role changes
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin'::app_role) AND role = 'moderator'::app_role THEN true
    ELSE false
  END
);

CREATE POLICY "Service role deletes roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  CASE
    WHEN role = 'cipher'::app_role THEN false  -- Block direct cipher role removal
    WHEN is_cipher(auth.uid()) THEN true
    WHEN has_role(auth.uid(), 'admin'::app_role) AND role = 'moderator'::app_role THEN true
    ELSE false
  END
);

-- 3. Create audit trigger for role changes
-- Logs all INSERT/UPDATE/DELETE on user_roles to audit_logs
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_record_id uuid;
  v_user_email text;
  v_company_id uuid;
BEGIN
  -- Determine the affected user
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_record_id := OLD.id;
  ELSE
    v_user_id := NEW.user_id;
    v_record_id := NEW.id;
  END IF;

  -- Get email for display
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;
  
  -- Get active company of the acting user for context
  SELECT active_company_id INTO v_company_id FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.audit_logs (
    company_id, user_id, user_email, table_name, record_id, action, old_data, new_data
  ) VALUES (
    COALESCE(v_company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    v_user_email,
    'user_roles',
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_change();
