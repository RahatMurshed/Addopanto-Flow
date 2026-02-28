
-- Fix 3: Server-side validation — reject payments with future payment_date
CREATE OR REPLACE FUNCTION public.validate_payment_date()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_date::date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Payment date cannot be in the future. Got: %, Today: %', NEW.payment_date, CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_payment_date_trigger
  BEFORE INSERT OR UPDATE ON public.student_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_date();
