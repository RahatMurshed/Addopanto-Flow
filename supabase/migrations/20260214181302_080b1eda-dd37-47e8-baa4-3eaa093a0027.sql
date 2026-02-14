
-- Drop existing overly permissive storage policies for company-logos
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- Create restrictive policies: only company admins or cipher users can manage logos
-- Logo path must be: {company_id}/filename
CREATE POLICY "Company admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND (
    public.is_cipher(auth.uid())
    OR public.is_company_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Company admins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND (
    public.is_cipher(auth.uid())
    OR public.is_company_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Company admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND (
    public.is_cipher(auth.uid())
    OR public.is_company_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);
