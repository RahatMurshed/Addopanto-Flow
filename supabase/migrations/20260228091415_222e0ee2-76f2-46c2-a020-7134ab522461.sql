
-- Validation trigger to enforce valid student status values
CREATE OR REPLACE FUNCTION public.validate_student_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'graduated', 'dropout', 'transferred') THEN
    RAISE EXCEPTION 'Invalid student status: %. Allowed values: active, inactive, graduated, dropout, transferred', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_student_status_trigger
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_student_status();
