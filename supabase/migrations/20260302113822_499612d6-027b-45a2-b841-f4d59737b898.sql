
CREATE OR REPLACE FUNCTION public.validate_payment_date()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only validate payment_date for paid payments, not unpaid schedule rows
  IF NEW.status = 'paid' AND NEW.payment_date::date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Payment date cannot be in the future. Got: %, Today: %', NEW.payment_date, CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$function$;
