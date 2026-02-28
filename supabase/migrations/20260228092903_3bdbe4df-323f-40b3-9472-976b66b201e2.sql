
-- Fix 2: Update batch_enrollments INSERT RLS to allow moderators with batch permissions
DROP POLICY IF EXISTS "Authorized users can insert batch enrollments" ON public.batch_enrollments;
CREATE POLICY "Authorized users can insert batch enrollments"
ON public.batch_enrollments
FOR INSERT
WITH CHECK (
  (company_id = get_active_company_id(auth.uid()))
  AND (
    is_company_admin(auth.uid(), company_id)
    OR is_cipher(auth.uid())
    OR company_can_add_batch(company_id, auth.uid())
  )
);

-- Also update UPDATE and DELETE to allow moderators with batch permissions
DROP POLICY IF EXISTS "Authorized users can update batch enrollments" ON public.batch_enrollments;
CREATE POLICY "Authorized users can update batch enrollments"
ON public.batch_enrollments
FOR UPDATE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (
    is_company_admin(auth.uid(), company_id)
    OR is_cipher(auth.uid())
    OR company_can_edit_batch(company_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Authorized users can delete batch enrollments" ON public.batch_enrollments;
CREATE POLICY "Authorized users can delete batch enrollments"
ON public.batch_enrollments
FOR DELETE
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND (
    is_company_admin(auth.uid(), company_id)
    OR is_cipher(auth.uid())
    OR company_can_delete_batch(company_id, auth.uid())
  )
);

-- Fix 3: Add unique index on (company_id, course_name) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_company_name_unique
ON public.courses (company_id, course_name);

-- Fix 10: Fix courses SELECT RLS to filter by active_company_id
DROP POLICY IF EXISTS "Company members can view courses" ON public.courses;
CREATE POLICY "Company members can view courses"
ON public.courses
FOR SELECT
USING (
  (company_id = get_active_company_id(auth.uid()))
  AND is_company_member(auth.uid(), company_id)
  AND (NOT is_data_entry_moderator(company_id, auth.uid()))
);

-- Fix 5 & 6: Trigger to update enrollment statuses when batch status changes to completed
CREATE OR REPLACE FUNCTION public.sync_enrollments_on_batch_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.batch_enrollments
    SET status = 'completed', updated_at = now()
    WHERE batch_id = NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_enrollments_on_batch_completion ON public.batches;
CREATE TRIGGER sync_enrollments_on_batch_completion
  AFTER UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_enrollments_on_batch_completion();
