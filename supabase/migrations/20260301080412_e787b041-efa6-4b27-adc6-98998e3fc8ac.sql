
-- Fix P0: Make sync_student_payment_revenue status-aware
CREATE OR REPLACE FUNCTION public.sync_student_payment_revenue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_id uuid;
  v_revenue_id uuid;
  v_student_name text;
  v_desc text;
  v_acc RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- === INSERT: only create revenue if status = 'paid' ===
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'paid' THEN
      RETURN NEW;  -- Do nothing for unpaid/partial
    END IF;
  END IF;

  -- === UPDATE: handle status transitions ===
  IF TG_OP = 'UPDATE' THEN
    -- Not paid before, not paid now → do nothing
    IF OLD.status != 'paid' AND NEW.status != 'paid' THEN
      RETURN NEW;
    END IF;

    -- Was paid, no longer paid → delete revenue + allocations
    IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
      SELECT id INTO v_revenue_id FROM public.revenues WHERE student_payment_id = NEW.id AND is_system_generated = true;
      IF v_revenue_id IS NOT NULL THEN
        DELETE FROM public.allocations WHERE revenue_id = v_revenue_id;
        DELETE FROM public.revenues WHERE id = v_revenue_id;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- At this point: status IS 'paid' (either INSERT with paid, or UPDATE to/staying paid)
  SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;

  IF NEW.payment_type = 'admission' THEN
    v_desc := 'Admission fee - ' || COALESCE(v_student_name, 'Student');
  ELSE
    v_desc := 'Monthly tuition';
    IF NEW.months_covered IS NOT NULL AND array_length(NEW.months_covered, 1) > 0 THEN
      v_desc := v_desc || ' (' || array_to_string(NEW.months_covered, ', ') || ')';
    END IF;
    v_desc := v_desc || ' - ' || COALESCE(v_student_name, 'Student');
  END IF;

  IF NEW.source_id IS NOT NULL THEN
    v_source_id := NEW.source_id;
  ELSE
    SELECT id INTO v_source_id
    FROM public.revenue_sources
    WHERE name = 'Student Fees' AND company_id = NEW.company_id
    LIMIT 1;

    IF v_source_id IS NULL THEN
      INSERT INTO public.revenue_sources (name, user_id, company_id)
      VALUES ('Student Fees', NEW.user_id, NEW.company_id)
      RETURNING id INTO v_source_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Insert new revenue + allocations
    INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, student_payment_id, is_system_generated)
    VALUES (NEW.amount, NEW.payment_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true)
    RETURNING id INTO v_revenue_id;

    FOR v_acc IN
      SELECT id, allocation_percentage
      FROM public.expense_accounts
      WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
    LOOP
      INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
      VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if revenue already exists (transitioning TO paid)
    SELECT id INTO v_revenue_id FROM public.revenues WHERE student_payment_id = NEW.id AND is_system_generated = true;

    IF v_revenue_id IS NULL THEN
      -- Transitioning to paid: create revenue + allocations
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, student_payment_id, is_system_generated)
      VALUES (NEW.amount, NEW.payment_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true)
      RETURNING id INTO v_revenue_id;

      FOR v_acc IN
        SELECT id, allocation_percentage
        FROM public.expense_accounts
        WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
      LOOP
        INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
        VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
      END LOOP;
    ELSE
      -- Staying paid: update revenue
      UPDATE public.revenues
      SET amount = NEW.amount,
          date = NEW.payment_date,
          source_id = v_source_id,
          description = v_desc,
          updated_at = now()
      WHERE id = v_revenue_id;

      -- Recalculate allocations if amount changed
      IF NEW.amount IS DISTINCT FROM OLD.amount THEN
        DELETE FROM public.allocations WHERE revenue_id = v_revenue_id;
        FOR v_acc IN
          SELECT id, allocation_percentage
          FROM public.expense_accounts
          WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
        LOOP
          INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
          VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Data cleanup: delete phantom revenue + orphaned allocations for non-paid payments
DELETE FROM public.allocations
WHERE revenue_id IN (
  SELECT r.id FROM public.revenues r
  JOIN public.student_payments sp ON r.student_payment_id = sp.id
  WHERE sp.status != 'paid' AND r.is_system_generated = true
);

DELETE FROM public.revenues
WHERE student_payment_id IN (
  SELECT id FROM public.student_payments WHERE status != 'paid'
)
AND is_system_generated = true;
