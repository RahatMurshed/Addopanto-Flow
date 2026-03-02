
CREATE OR REPLACE FUNCTION public.validate_student_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_total_paid NUMERIC;
  v_max_allowed NUMERIC;
  v_month TEXT;
  v_month_paid NUMERIC;
  v_batch_admission_fee NUMERIC := 0;
  v_batch_monthly_fee NUMERIC := 0;
  v_effective_fee NUMERIC;
BEGIN
  SELECT admission_fee_total, monthly_fee_amount, batch_id
    INTO v_student FROM public.students WHERE id = NEW.student_id;

  IF v_student.batch_id IS NOT NULL THEN
    SELECT COALESCE(default_admission_fee, 0), COALESCE(default_monthly_fee, 0)
      INTO v_batch_admission_fee, v_batch_monthly_fee
      FROM public.batches WHERE id = v_student.batch_id;
  END IF;

  IF NEW.payment_type = 'admission' THEN
    v_max_allowed := GREATEST(COALESCE(v_student.admission_fee_total, 0), v_batch_admission_fee);
    IF v_max_allowed > 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
        FROM public.student_payments
        WHERE student_id = NEW.student_id
          AND payment_type = 'admission'
          AND status != 'cancelled'
          AND id IS DISTINCT FROM NEW.id;
      IF v_total_paid + NEW.amount > v_max_allowed THEN
        RAISE EXCEPTION 'Overpayment: admission fee exceeded. Maximum allowed: %. Already paid: %.',
          (v_max_allowed - v_total_paid), v_total_paid;
      END IF;
    END IF;
  END IF;

  IF NEW.payment_type = 'monthly' AND NEW.months_covered IS NOT NULL AND array_length(NEW.months_covered, 1) > 0 THEN
    v_effective_fee := GREATEST(COALESCE(v_student.monthly_fee_amount, 0), v_batch_monthly_fee);
    IF v_effective_fee > 0 THEN
      FOREACH v_month IN ARRAY NEW.months_covered LOOP
        SELECT COALESCE(SUM(sp.amount / GREATEST(array_length(sp.months_covered, 1), 1)), 0)
          INTO v_month_paid
          FROM public.student_payments sp
          WHERE sp.student_id = NEW.student_id
            AND sp.payment_type = 'monthly'
            AND sp.status != 'cancelled'
            AND sp.months_covered IS NOT NULL
            AND v_month = ANY(sp.months_covered)
            AND sp.id IS DISTINCT FROM NEW.id;
        IF v_month_paid + (NEW.amount / array_length(NEW.months_covered, 1)) > v_effective_fee THEN
          RAISE EXCEPTION 'Overpayment: monthly fee for % exceeded. Maximum allowed: %. Already paid: %.',
            v_month, (v_effective_fee - v_month_paid), v_month_paid;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
