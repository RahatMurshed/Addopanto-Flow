-- Fix 4: Restrict base companies table SELECT policy
-- Drop the overly permissive policy that lets all authenticated users read all columns
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;

-- Restricted: only cipher or company admin can read base table (which includes join_password, invite_code)
CREATE POLICY "Cipher and admins can view companies"
  ON companies FOR SELECT
  USING (
    is_cipher(auth.uid()) 
    OR is_company_admin(auth.uid(), id)
  );