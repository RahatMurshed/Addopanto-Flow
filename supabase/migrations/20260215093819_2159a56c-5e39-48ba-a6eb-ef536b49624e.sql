CREATE POLICY "Authenticated users can browse companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);