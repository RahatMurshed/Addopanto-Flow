-- Drop the overly permissive audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a restrictive policy: only authenticated users can insert audit logs for their own company
-- The audit_log_trigger runs as SECURITY DEFINER so it bypasses RLS anyway,
-- but this prevents direct client-side insertion of fake audit logs
CREATE POLICY "Authenticated members can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_company_member(auth.uid(), company_id)
);