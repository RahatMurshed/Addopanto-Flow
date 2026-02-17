
-- Add INSERT policy for student_batch_history (needed for restore)
CREATE POLICY "Authorized users can insert batch history"
ON public.student_batch_history FOR INSERT
WITH CHECK (
  company_id = get_active_company_id(auth.uid())
  AND (
    is_company_member(auth.uid(), company_id)
    OR is_cipher(auth.uid())
  )
);
