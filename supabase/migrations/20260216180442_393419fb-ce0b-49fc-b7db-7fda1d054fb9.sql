
-- Create dashboard_access_logs table
CREATE TABLE public.dashboard_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  company_id UUID,
  membership_role TEXT,
  is_cipher BOOLEAN NOT NULL DEFAULT false,
  view_path TEXT NOT NULL DEFAULT 'full',
  is_anomaly BOOLEAN NOT NULL DEFAULT false,
  anomaly_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_dashboard_access_logs_created_at ON public.dashboard_access_logs (created_at DESC);
CREATE INDEX idx_dashboard_access_logs_user_id ON public.dashboard_access_logs (user_id);
CREATE INDEX idx_dashboard_access_logs_is_anomaly ON public.dashboard_access_logs (is_anomaly) WHERE is_anomaly = true;

-- Enable RLS
ALTER TABLE public.dashboard_access_logs ENABLE ROW LEVEL SECURITY;

-- Cipher-only SELECT
CREATE POLICY "Ciphers can view all access logs"
ON public.dashboard_access_logs
FOR SELECT
USING (public.is_cipher(auth.uid()));

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own access logs"
ON public.dashboard_access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_access_logs;
