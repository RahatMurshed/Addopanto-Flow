-- rate_limits table has RLS enabled but no policies.
-- This table is only accessed by edge functions using the service_role key.
-- Add a deny-all policy for anon/authenticated to make intent explicit.

CREATE POLICY "No direct access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false);
