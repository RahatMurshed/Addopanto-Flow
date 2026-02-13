
-- Add banned_until column
ALTER TABLE public.registration_requests 
  ADD COLUMN IF NOT EXISTS banned_until timestamptz DEFAULT NULL;

-- Update handle_new_user() to check for bans
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if email is banned
  IF EXISTS (
    SELECT 1 FROM registration_requests 
    WHERE email = NEW.email 
      AND banned_until > now()
  ) THEN
    RAISE EXCEPTION 'This email has been temporarily blocked. Please try again later.';
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (user_id, email) 
  VALUES (NEW.id, NEW.email);
  
  -- Clean up old rejected/deleted requests for this email
  DELETE FROM public.registration_requests WHERE email = NEW.email;
  
  -- Create new pending request
  INSERT INTO public.registration_requests (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'pending');
  
  RETURN NEW;
END;
$$;
