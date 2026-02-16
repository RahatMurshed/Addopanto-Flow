
-- Fix audit_role_change: skip insert if no valid company_id, and wrap in exception handler
CREATE OR REPLACE FUNCTION public.audit_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_record_id uuid;
  v_user_email text;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_record_id := OLD.id;
  ELSE
    v_user_id := NEW.user_id;
    v_record_id := NEW.id;
  END IF;

  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT active_company_id INTO v_company_id FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;

  -- Skip audit if no valid company context
  IF v_company_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (
      company_id, user_id, user_email, table_name, record_id, action, old_data, new_data
    ) VALUES (
      v_company_id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      v_user_email,
      'user_roles',
      v_record_id,
      TG_OP,
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_role_change failed: %', SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Fix audit_moderator_permissions_trigger similarly
CREATE OR REPLACE FUNCTION public.audit_moderator_permissions_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_record_id uuid;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_record_id := OLD.id;
  ELSE
    v_user_id := NEW.user_id;
    v_record_id := NEW.id;
  END IF;

  SELECT active_company_id INTO v_company_id
    FROM public.user_profiles WHERE user_id = COALESCE(auth.uid(), v_user_id) LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
      FROM public.company_memberships WHERE user_id = v_user_id AND status = 'active' LIMIT 1;
  END IF;

  -- Skip audit if no valid company context
  IF v_company_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT email INTO v_user_email
    FROM public.user_profiles WHERE user_id = COALESCE(auth.uid(), v_user_id) LIMIT 1;

  BEGIN
    INSERT INTO public.audit_logs
      (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
    VALUES (
      v_company_id,
      COALESCE(auth.uid(), v_user_id),
      v_user_email,
      'moderator_permissions', v_record_id, TG_OP,
      CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_moderator_permissions_trigger failed: %', SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
