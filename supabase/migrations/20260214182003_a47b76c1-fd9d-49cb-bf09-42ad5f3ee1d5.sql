
-- Add exchange_rate to companies (default 1.0 = base currency)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS exchange_rate numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'BDT';

-- Create currency change audit log
CREATE TABLE public.currency_change_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  old_currency text NOT NULL,
  new_currency text NOT NULL,
  old_exchange_rate numeric NOT NULL,
  new_exchange_rate numeric NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currency_change_logs ENABLE ROW LEVEL SECURITY;

-- Only company admins/cipher can view logs
CREATE POLICY "Company admins can view currency logs"
  ON public.currency_change_logs FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- Only company admins/cipher can insert logs
CREATE POLICY "Company admins can insert currency logs"
  ON public.currency_change_logs FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- Validation trigger: prevent negative exchange rates
CREATE OR REPLACE FUNCTION public.validate_exchange_rate()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be a positive number';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_company_exchange_rate
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_exchange_rate();
