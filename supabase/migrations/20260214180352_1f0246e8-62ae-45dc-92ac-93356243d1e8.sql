-- Validate that a user is a member of the company before allowing active_company_id update
-- This prevents unauthorized data access by switching to a company the user doesn't belong to
CREATE OR REPLACE FUNCTION public.validate_active_company_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow NULL (no active company)
  IF NEW.active_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip validation if active_company_id didn't change
  IF OLD.active_company_id IS NOT DISTINCT FROM NEW.active_company_id THEN
    RETURN NEW;
  END IF;

  -- Allow cipher users to switch to any company
  IF public.is_cipher(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Check if user is an active member of the target company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = NEW.user_id
      AND company_id = NEW.active_company_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot set active company: user is not a member of this company';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on user_profiles
CREATE TRIGGER trg_validate_active_company
  BEFORE UPDATE OF active_company_id
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_active_company_membership();