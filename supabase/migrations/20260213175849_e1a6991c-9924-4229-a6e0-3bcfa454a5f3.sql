
-- Add banned_until column to company_join_requests for 1-day ban on rejection
ALTER TABLE public.company_join_requests
ADD COLUMN banned_until timestamp with time zone DEFAULT NULL;
