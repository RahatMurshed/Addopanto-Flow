
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only company admins/cipher can view audit logs
CREATE POLICY "Company admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  (company_id = public.get_active_company_id(auth.uid()))
  AND (public.is_company_admin(auth.uid(), company_id) OR public.is_cipher(auth.uid()))
);

-- System inserts via trigger (SECURITY DEFINER), no direct user insert needed
-- But add policy for the trigger function context
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_user_email text;
  v_record_id uuid;
BEGIN
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
$$;

-- Attach triggers to core tables
CREATE TRIGGER audit_students
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_student_payments
AFTER INSERT OR UPDATE OR DELETE ON public.student_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_batches
AFTER INSERT OR UPDATE OR DELETE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_revenues
AFTER INSERT OR UPDATE OR DELETE ON public.revenues
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_expense_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.expense_accounts
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_khata_transfers
AFTER INSERT OR UPDATE OR DELETE ON public.khata_transfers
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
