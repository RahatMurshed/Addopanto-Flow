
-- Helper function: check if a student should be graduated
-- Called after batch completion or after payment insertion
CREATE OR REPLACE FUNCTION public.check_and_graduate_student(
  p_student_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active INTEGER;
  v_has_unpaid_completed INTEGER;
  v_expected NUMERIC;
  v_paid NUMERIC;
  rec RECORD;
BEGIN
  -- Count remaining active enrollments
  SELECT COUNT(*) INTO v_has_active
  FROM batch_enrollments
  WHERE student_id = p_student_id
    AND company_id = p_company_id
    AND status = 'active';

  -- If student still has active enrollments, don't graduate
  IF v_has_active > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check all completed enrollments: are they all fully paid?
  v_has_unpaid_completed := 0;

  FOR rec IN
    SELECT be.id AS enrollment_id,
           COALESCE(NULLIF(s.admission_fee_total, 0), b.default_admission_fee, 0) AS eff_admission,
           COALESCE(NULLIF(s.monthly_fee_amount, 0), b.default_monthly_fee, 0) AS eff_monthly,
           COALESCE(b.course_duration_months, 0) AS duration
    FROM batch_enrollments be
    JOIN students s ON s.id = be.student_id
    JOIN batches b ON b.id = be.batch_id
    WHERE be.student_id = p_student_id
      AND be.company_id = p_company_id
      AND be.status = 'completed'
  LOOP
    v_expected := rec.eff_admission + (rec.eff_monthly * rec.duration);
    
    SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM student_payments
    WHERE batch_enrollment_id = rec.enrollment_id
      AND company_id = p_company_id;

    IF v_paid < v_expected AND v_expected > 0 THEN
      v_has_unpaid_completed := v_has_unpaid_completed + 1;
    END IF;
  END LOOP;

  -- Graduate only if all completed enrollments are fully paid
  IF v_has_unpaid_completed = 0 THEN
    UPDATE students
    SET status = 'graduated'
    WHERE id = p_student_id
      AND company_id = p_company_id
      AND status != 'graduated';
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Update the batch completion trigger to also check graduation
CREATE OR REPLACE FUNCTION public.sync_enrollments_on_batch_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Mark all active enrollments as completed
    UPDATE public.batch_enrollments
    SET status = 'completed', updated_at = now()
    WHERE batch_id = NEW.id
      AND status = 'active';

    -- Check each student in this batch for graduation
    FOR v_student IN
      SELECT DISTINCT student_id
      FROM public.batch_enrollments
      WHERE batch_id = NEW.id
        AND company_id = NEW.company_id
    LOOP
      PERFORM check_and_graduate_student(v_student.student_id, NEW.company_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on student_payments: after insert, check if student qualifies for graduation
CREATE OR REPLACE FUNCTION public.check_graduation_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment_status TEXT;
  v_batch_status TEXT;
BEGIN
  -- Only check on INSERT (new payment)
  IF NEW.batch_enrollment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the enrollment's batch is completed
  SELECT be.status, b.status INTO v_enrollment_status, v_batch_status
  FROM batch_enrollments be
  JOIN batches b ON b.id = be.batch_id
  WHERE be.id = NEW.batch_enrollment_id;

  -- Only proceed if the batch/enrollment is completed
  IF v_batch_status = 'completed' OR v_enrollment_status = 'completed' THEN
    PERFORM check_and_graduate_student(NEW.student_id, NEW.company_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_check_graduation_on_payment ON public.student_payments;
CREATE TRIGGER trg_check_graduation_on_payment
  AFTER INSERT ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_graduation_on_payment();
