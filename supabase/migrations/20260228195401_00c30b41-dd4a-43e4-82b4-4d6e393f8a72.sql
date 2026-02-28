
CREATE OR REPLACE FUNCTION public.validate_student_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'graduated', 'dropout', 'transferred', 'inquiry') THEN
    RAISE EXCEPTION 'Invalid student status: %. Allowed values: active, inactive, graduated, dropout, transferred, inquiry', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
