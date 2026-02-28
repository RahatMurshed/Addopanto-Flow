
-- Update the validation trigger to remove 'transferred'
CREATE OR REPLACE FUNCTION public.validate_student_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'graduated', 'dropout', 'inquiry') THEN
    RAISE EXCEPTION 'Invalid student status: %. Allowed values: active, inactive, graduated, dropout, inquiry', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update any students currently with 'transferred' status to 'inactive'
UPDATE public.students SET status = 'inactive' WHERE status = 'transferred';
