
CREATE POLICY "Authorized users can update courses"
  ON public.courses FOR UPDATE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
  );

CREATE POLICY "Authorized users can delete courses"
  ON public.courses FOR DELETE
  USING (
    (company_id = get_active_company_id(auth.uid()))
    AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()))
  );
