
-- 1. Create company_creation_requests table
CREATE TABLE public.company_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  company_slug text NOT NULL,
  description text,
  logo_url text,
  industry text,
  estimated_students integer,
  contact_email text,
  contact_phone text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_creation_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can insert own creation requests"
ON public.company_creation_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own creation requests"
ON public.company_creation_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Cipher can view all requests
CREATE POLICY "Cipher can view all creation requests"
ON public.company_creation_requests
FOR SELECT
USING (is_cipher(auth.uid()));

-- Cipher can update requests (approve/reject)
CREATE POLICY "Cipher can update creation requests"
ON public.company_creation_requests
FOR UPDATE
USING (is_cipher(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_creation_requests;

-- 2. Modify the signup trigger to assign user role immediately instead of creating registration_requests
-- First, drop the existing trigger that creates registration_requests on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create new trigger function that assigns 'user' role and creates profile immediately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign 'user' role immediately (no platform approval needed)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Migrate existing pending users: give them 'user' role so they can log in
INSERT INTO public.user_roles (user_id, role)
SELECT rr.user_id, 'user'
FROM public.registration_requests rr
WHERE rr.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = rr.user_id
  );
