
-- Step 1: Backfill missing expense records for salary payments that have no linked expense
INSERT INTO public.expenses (company_id, user_id, expense_account_id, amount, date, description)
SELECT
  sp.company_id,
  sp.user_id,
  (
    SELECT ea.id FROM public.expense_accounts ea
    WHERE ea.company_id = sp.company_id AND ea.name ILIKE '%Salary%'
    ORDER BY ea.created_at ASC
    LIMIT 1
  ) AS expense_account_id,
  sp.net_amount,
  sp.payment_date,
  'Salary - ' || e.full_name || ' - ' || sp.month || ' [SALARY:' || sp.id || ']'
FROM public.employee_salary_payments sp
JOIN public.employees e ON e.id = sp.employee_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.expenses ex
  WHERE ex.description LIKE '%[SALARY:' || sp.id || ']%'
);

-- Step 2: Create trigger function to auto-create expense on salary payment insert
CREATE OR REPLACE FUNCTION public.fn_auto_create_salary_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_name TEXT;
  v_expense_account_id UUID;
  v_description TEXT;
BEGIN
  -- Get employee name
  SELECT full_name INTO v_employee_name
  FROM public.employees WHERE id = NEW.employee_id;

  -- Get the Salary expense account for this company
  SELECT id INTO v_expense_account_id
  FROM public.expense_accounts
  WHERE company_id = NEW.company_id AND name ILIKE '%Salary%'
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no salary account found, skip
  IF v_expense_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if expense already exists (idempotency)
  v_description := 'Salary - ' || COALESCE(v_employee_name, 'Unknown') || ' - ' || NEW.month || ' [SALARY:' || NEW.id || ']';
  
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses WHERE description LIKE '%[SALARY:' || NEW.id || ']%'
  ) THEN
    INSERT INTO public.expenses (company_id, user_id, expense_account_id, amount, date, description)
    VALUES (NEW.company_id, NEW.user_id, v_expense_account_id, NEW.net_amount, NEW.payment_date, v_description);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Create trigger
DROP TRIGGER IF EXISTS trg_auto_create_salary_expense ON public.employee_salary_payments;
CREATE TRIGGER trg_auto_create_salary_expense
  AFTER INSERT ON public.employee_salary_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_salary_expense();
