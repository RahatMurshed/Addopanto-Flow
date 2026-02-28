-- Rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  CONSTRAINT rate_limits_key_window_unique UNIQUE (key, window_start)
);

-- Index for fast lookups and cleanup
CREATE INDEX idx_rate_limits_key_window ON public.rate_limits (key, window_start);

-- Enable RLS (only service role should access this)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role can access (edge functions use service role key)

-- Auto-cleanup function: delete entries older than 10 minutes
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '10 minutes';
$$;

-- Rate check function: returns true if request is allowed
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max_requests integer,
  _window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz;
  _count integer;
BEGIN
  -- Calculate window start (truncate to window boundary)
  _window_start := date_trunc('minute', now());
  
  -- Upsert the counter
  INSERT INTO public.rate_limits (key, window_start, request_count)
  VALUES (_key, _window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO _count;
  
  -- Cleanup old entries periodically (1 in 100 chance)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_rate_limits();
  END IF;
  
  RETURN _count <= _max_requests;
END;
$$;