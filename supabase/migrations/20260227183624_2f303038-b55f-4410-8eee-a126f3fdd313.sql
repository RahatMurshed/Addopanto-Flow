
-- Clean up existing 'dropped' rows FIRST
DELETE FROM batch_enrollments WHERE status = 'dropped';

-- Now drop any existing check constraint and add new one
ALTER TABLE batch_enrollments DROP CONSTRAINT IF EXISTS batch_enrollments_status_check;

ALTER TABLE batch_enrollments ADD CONSTRAINT batch_enrollments_status_check
  CHECK (status IN ('active', 'completed'));

-- Recreate the removal function (it was already created in the previous migration)
-- Just make sure it's correct
CREATE OR REPLACE FUNCTION public.remove_student_from_batch(
  p_student_id UUID,
  p_batch_id UUID,
  p_company_id UUID,
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE(deleted_payment_total NUMERIC, deleted_payment_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment_id UUID;
  v_total NUMERIC := 0;
  v_count INTEGER := 0;
  v_paid_ids UUID[];
BEGIN
  -- Find the active enrollment
  SELECT id INTO v_enrollment_id
  FROM batch_enrollments
  WHERE student_id = p_student_id
    AND batch_id = p_batch_id
    AND company_id = p_company_id
    AND status = 'active'
  LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'No active enrollment found for this student in this batch';
  END IF;

  -- Collect payment IDs and calculate totals BEFORE deleting
  SELECT COALESCE(SUM(amount), 0), COUNT(*), COALESCE(array_agg(id), '{}')
  INTO v_total, v_count, v_paid_ids
  FROM student_payments
  WHERE batch_enrollment_id = v_enrollment_id
    AND company_id = p_company_id;

  -- Delete linked revenue records first (FK reference)
  IF array_length(v_paid_ids, 1) > 0 THEN
    DELETE FROM revenues
    WHERE student_payment_id = ANY(v_paid_ids)
      AND company_id = p_company_id;
  END IF;

  -- Delete linked payments
  DELETE FROM student_payments
  WHERE batch_enrollment_id = v_enrollment_id
    AND company_id = p_company_id;

  -- Delete the enrollment record
  DELETE FROM batch_enrollments
  WHERE id = v_enrollment_id;

  -- Clear student's batch_id if it points to this batch
  UPDATE students
  SET batch_id = NULL
  WHERE id = p_student_id
    AND batch_id = p_batch_id;

  -- Create audit log
  INSERT INTO audit_logs (
    company_id, user_id, user_email, table_name, action, record_id,
    old_data, new_data
  ) VALUES (
    p_company_id, p_user_id, p_user_email,
    'batch_enrollments', 'remove_from_batch', v_enrollment_id,
    jsonb_build_object(
      'student_id', p_student_id,
      'batch_id', p_batch_id,
      'enrollment_id', v_enrollment_id
    ),
    jsonb_build_object(
      'deleted_payment_total', v_total,
      'deleted_payment_count', v_count
    )
  );

  RETURN QUERY SELECT v_total, v_count;
END;
$$;
