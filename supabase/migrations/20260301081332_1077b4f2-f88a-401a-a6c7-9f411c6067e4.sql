
-- Drop the CHECK constraint on audit_logs.action to allow custom action values
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
