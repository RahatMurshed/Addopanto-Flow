-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('cipher', 'admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, role)
);

-- Create moderator_permissions table
CREATE TABLE public.moderator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  can_add_revenue BOOLEAN NOT NULL DEFAULT false,
  can_add_expense BOOLEAN NOT NULL DEFAULT false,
  can_view_reports BOOLEAN NOT NULL DEFAULT false,
  controlled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function: Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function: Check if user is cipher (for hiding cipher users)
CREATE OR REPLACE FUNCTION public.is_cipher(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'cipher')
$$;

-- Security definer function: Get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY 
      CASE role 
        WHEN 'cipher' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'moderator' THEN 3 
        WHEN 'user' THEN 4 
      END
    LIMIT 1),
    'user'::app_role
  )
$$;

-- Security definer function: Check if current user can see target user (cipher hidden from non-cipher)
CREATE OR REPLACE FUNCTION public.can_view_user(_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Cipher users can see everyone
      WHEN public.is_cipher(auth.uid()) THEN true
      -- Non-cipher users cannot see cipher users
      WHEN public.is_cipher(_target_user_id) THEN false
      -- Otherwise can see
      ELSE true
    END
$$;

-- RLS Policies for user_roles

-- Users can view their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and Ciphers can view non-cipher roles
CREATE POLICY "Admins can view visible roles"
ON public.user_roles
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cipher'))
  AND public.can_view_user(user_id)
);

-- Only Cipher can insert cipher roles, Admin can insert admin/moderator/user
CREATE POLICY "Authorized users can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  CASE 
    -- Cipher can assign any role
    WHEN public.is_cipher(auth.uid()) THEN true
    -- Admin can assign non-cipher roles
    WHEN public.has_role(auth.uid(), 'admin') AND role != 'cipher' THEN true
    ELSE false
  END
);

-- Only Cipher can update cipher roles, Admin can update non-cipher roles
CREATE POLICY "Authorized users can update roles"
ON public.user_roles
FOR UPDATE
USING (
  CASE 
    WHEN public.is_cipher(auth.uid()) THEN true
    WHEN public.has_role(auth.uid(), 'admin') AND NOT public.is_cipher(user_id) THEN true
    ELSE false
  END
);

-- Only Cipher can delete cipher roles, Admin can delete non-cipher roles
CREATE POLICY "Authorized users can delete roles"
ON public.user_roles
FOR DELETE
USING (
  CASE 
    WHEN public.is_cipher(auth.uid()) THEN true
    WHEN public.has_role(auth.uid(), 'admin') AND NOT public.is_cipher(user_id) THEN true
    ELSE false
  END
);

-- RLS Policies for moderator_permissions

-- Moderators can view their own permissions
CREATE POLICY "Moderators can view own permissions"
ON public.moderator_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Ciphers can view all moderator permissions (except cipher's if they're not cipher)
CREATE POLICY "Admins can view moderator permissions"
ON public.moderator_permissions
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cipher'))
  AND public.can_view_user(user_id)
);

-- Admins/Ciphers can insert moderator permissions
CREATE POLICY "Admins can insert moderator permissions"
ON public.moderator_permissions
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cipher')
);

-- Admins/Ciphers can update moderator permissions (Admin can't touch cipher's permissions)
CREATE POLICY "Admins can update moderator permissions"
ON public.moderator_permissions
FOR UPDATE
USING (
  CASE 
    WHEN public.is_cipher(auth.uid()) THEN true
    WHEN public.has_role(auth.uid(), 'admin') AND NOT public.is_cipher(user_id) THEN true
    ELSE false
  END
);

-- Admins/Ciphers can delete moderator permissions
CREATE POLICY "Admins can delete moderator permissions"
ON public.moderator_permissions
FOR DELETE
USING (
  CASE 
    WHEN public.is_cipher(auth.uid()) THEN true
    WHEN public.has_role(auth.uid(), 'admin') AND NOT public.is_cipher(user_id) THEN true
    ELSE false
  END
);

-- Trigger to update updated_at on moderator_permissions
CREATE TRIGGER update_moderator_permissions_updated_at
BEFORE UPDATE ON public.moderator_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign 'user' role on new user signup
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();