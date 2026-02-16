
-- Fix courses RLS policies: swap arguments to match function signatures (user_id, company_id)

DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_delete" ON public.courses;

CREATE POLICY "courses_insert" ON public.courses FOR INSERT
WITH CHECK (company_can_add_batch(auth.uid(), company_id));

CREATE POLICY "courses_update" ON public.courses FOR UPDATE
USING (company_can_edit_batch(auth.uid(), company_id));

CREATE POLICY "courses_delete" ON public.courses FOR DELETE
USING (company_can_delete_batch(auth.uid(), company_id));
