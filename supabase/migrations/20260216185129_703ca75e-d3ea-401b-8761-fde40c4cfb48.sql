
-- =====================================================
-- Comprehensive Audit Triggers for All Business Tables
-- =====================================================

-- 1. Direct triggers (tables compatible with existing audit_log_trigger)

CREATE TRIGGER audit_company_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.company_memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_revenue_sources
  AFTER INSERT OR UPDATE OR DELETE ON public.revenue_sources
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_company_join_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.company_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- 2. Custom trigger for student_batch_history (transferred_by instead of user_id)

CREATE OR REPLACE FUNCTION public.audit_student_batch_history_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_record_id uuid;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.transferred_by;
    v_record_id := OLD.id;
    v_company_id := OLD.company_id;
  ELSE
    v_user_id := NEW.transferred_by;
    v_record_id := NEW.id;
    v_company_id := NEW.company_id;
  END IF;

  SELECT email INTO v_user_email
    FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;

  INSERT INTO public.audit_logs
    (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
  VALUES (
    v_company_id, v_user_id, v_user_email,
    'student_batch_history', v_record_id, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_student_batch_history
  AFTER INSERT OR UPDATE OR DELETE ON public.student_batch_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_student_batch_history_trigger();

-- 3. Custom trigger for moderator_permissions (no company_id column)

CREATE OR REPLACE FUNCTION public.audit_moderator_permissions_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
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

  -- Resolve company_id from the acting user's active company
  SELECT active_company_id INTO v_company_id
    FROM public.user_profiles WHERE user_id = COALESCE(auth.uid(), v_user_id) LIMIT 1;

  -- Fallback: look up from the target user's membership
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
      FROM public.company_memberships WHERE user_id = v_user_id AND status = 'active' LIMIT 1;
  END IF;

  -- Get email of the acting user
  SELECT email INTO v_user_email
    FROM public.user_profiles WHERE user_id = COALESCE(auth.uid(), v_user_id) LIMIT 1;

  INSERT INTO public.audit_logs
    (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
  VALUES (
    COALESCE(v_company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(auth.uid(), v_user_id),
    v_user_email,
    'moderator_permissions', v_record_id, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_moderator_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.moderator_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_moderator_permissions_trigger();

-- 4. Custom trigger for companies (id IS the company_id, created_by is the user)

CREATE OR REPLACE FUNCTION public.audit_companies_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_record_id uuid;
  v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.id;
    v_record_id := OLD.id;
    v_user_id := COALESCE(auth.uid(), OLD.created_by);
  ELSE
    v_company_id := NEW.id;
    v_record_id := NEW.id;
    v_user_id := COALESCE(auth.uid(), NEW.created_by);
  END IF;

  SELECT email INTO v_user_email
    FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;

  INSERT INTO public.audit_logs
    (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
  VALUES (
    v_company_id, v_user_id, v_user_email,
    'companies', v_record_id, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_companies_trigger();
