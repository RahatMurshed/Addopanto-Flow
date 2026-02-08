-- Create registration_requests table
CREATE TABLE public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT,
  can_add_revenue BOOLEAN NOT NULL DEFAULT true,
  can_add_expense BOOLEAN NOT NULL DEFAULT true,
  can_view_reports BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for registration_requests
-- Users can view their own request
CREATE POLICY "Users can view own registration request"
ON public.registration_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Ciphers can view all requests (using security definer functions)
CREATE POLICY "Admins can view all registration requests"
ON public.registration_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cipher'));

-- Admins/Ciphers can update requests
CREATE POLICY "Admins can update registration requests"
ON public.registration_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cipher'));

-- System can insert (via trigger)
CREATE POLICY "System can insert registration requests"
ON public.registration_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Drop the old trigger that auto-assigns user role
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Drop the old function
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Update handle_new_user to also create registration request
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (user_id, email) 
  VALUES (NEW.id, NEW.email);
  
  -- Create pending registration request
  INSERT INTO public.registration_requests (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'pending');
  
  -- No longer auto-assign role - role is assigned upon approval
  RETURN NEW;
END;
$$;