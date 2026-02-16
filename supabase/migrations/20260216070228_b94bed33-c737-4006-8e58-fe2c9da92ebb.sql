
-- Fix: Skip audit logging for auto-generated revenue entries linked to student payments
-- These are already captured by the student_payments audit entry
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_user_email text;
  v_record_id uuid;
BEGIN
  -- Skip audit for auto-generated revenues linked to student payments
  IF TG_TABLE_NAME = 'revenues' THEN
    IF TG_OP = 'DELETE' AND OLD.student_payment_id IS NOT NULL THEN
      RETURN OLD;
    ELSIF TG_OP IN ('INSERT', 'UPDATE') AND NEW.student_payment_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Skip audit for auto-generated allocations (they are always system-managed)
  IF TG_TABLE_NAME = 'allocations' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- Determine company_id and user_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
    v_user_id := OLD.user_id;
    v_record_id := OLD.id;
  ELSE
    v_company_id := NEW.company_id;
    v_user_id := NEW.user_id;
    v_record_id := NEW.id;
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;

  -- Insert audit log
  INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
  VALUES (
    v_company_id,
    v_user_id,
    v_user_email,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Add performance indexes on audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON public.audit_logs (table_name, action);
