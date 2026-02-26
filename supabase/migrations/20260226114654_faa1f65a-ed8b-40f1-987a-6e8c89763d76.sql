
-- Function: auto-create expense for loan repayment interest portion
CREATE OR REPLACE FUNCTION public.sync_loan_repayment_interest_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_account_id uuid;
  v_user_id uuid;
BEGIN
  -- Only proceed if there's an interest portion > 0
  IF NEW.interest_portion IS NULL OR NEW.interest_portion <= 0 THEN
    RETURN NEW;
  END IF;

  -- Find the user_id from the loan record (recorded_by is the cipher user)
  v_user_id := NEW.recorded_by;

  -- Find or create a "Loan Interest" expense account for this company
  SELECT id INTO v_expense_account_id
  FROM public.expense_accounts
  WHERE company_id = NEW.company_id
    AND name = 'Loan Interest'
  LIMIT 1;

  IF v_expense_account_id IS NULL THEN
    INSERT INTO public.expense_accounts (company_id, user_id, name, color, allocation_percentage, is_active)
    VALUES (NEW.company_id, v_user_id, 'Loan Interest', '#EF4444', 0, true)
    RETURNING id INTO v_expense_account_id;
  END IF;

  -- Create expense record for the interest portion
  INSERT INTO public.expenses (
    company_id,
    user_id,
    expense_account_id,
    amount,
    date,
    description
  ) VALUES (
    NEW.company_id,
    v_user_id,
    v_expense_account_id,
    NEW.interest_portion,
    NEW.repayment_date,
    'Loan interest - Repayment #' || COALESCE(NEW.receipt_number, NEW.id::text)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: fire after insert on loan_repayments
CREATE TRIGGER sync_loan_repayment_interest_expense_trigger
AFTER INSERT ON public.loan_repayments
FOR EACH ROW
EXECUTE FUNCTION public.sync_loan_repayment_interest_expense();
