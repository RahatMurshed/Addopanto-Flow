
-- Add source_id to student_payments
ALTER TABLE public.student_payments 
  ADD COLUMN source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL;

-- Update trigger to respect source_id from payment
CREATE OR REPLACE FUNCTION public.sync_student_payment_revenue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source_id uuid;
  v_revenue_id uuid;
  v_student_name text;
  v_desc text;
  v_acc RECORD;
BEGIN
  -- ON DELETE: linked revenue is auto-deleted via ON DELETE CASCADE on student_payment_id FK
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Get student name for description
  SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;

  -- Build description
  IF NEW.payment_type = 'admission' THEN
    v_desc := 'Admission fee - ' || COALESCE(v_student_name, 'Student');
  ELSE
    v_desc := 'Monthly tuition';
    IF NEW.months_covered IS NOT NULL AND array_length(NEW.months_covered, 1) > 0 THEN
      v_desc := v_desc || ' (' || array_to_string(NEW.months_covered, ', ') || ')';
    END IF;
    v_desc := v_desc || ' - ' || COALESCE(v_student_name, 'Student');
  END IF;

  -- Use source_id from payment if provided, else find/create "Student Fees"
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
    -- Create linked revenue
    INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, student_payment_id)
    VALUES (NEW.amount, NEW.payment_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id)
    RETURNING id INTO v_revenue_id;

    -- Create allocations
    FOR v_acc IN
      SELECT id, allocation_percentage
      FROM public.expense_accounts
      WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
    LOOP
      INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
      VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Update linked revenue (including source_id if changed)
    UPDATE public.revenues
    SET amount = NEW.amount,
        date = NEW.payment_date,
        source_id = v_source_id,
        description = v_desc,
        updated_at = now()
    WHERE student_payment_id = NEW.id;

    -- If amount changed, recalculate allocations
    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      SELECT id INTO v_revenue_id FROM public.revenues WHERE student_payment_id = NEW.id;
      IF v_revenue_id IS NOT NULL THEN
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
$function$;
