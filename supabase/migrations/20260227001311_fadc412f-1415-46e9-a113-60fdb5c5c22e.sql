
-- ============================
-- Phase 1: Fund Source Tracking
-- ============================

-- 1. Add source tracking columns to investments
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS transfer_method text,
  ADD COLUMN IF NOT EXISTS source_bank text,
  ADD COLUMN IF NOT EXISTS source_account_name text,
  ADD COLUMN IF NOT EXISTS source_account_number_masked text,
  ADD COLUMN IF NOT EXISTS destination_bank text,
  ADD COLUMN IF NOT EXISTS destination_account_masked text,
  ADD COLUMN IF NOT EXISTS transfer_date date,
  ADD COLUMN IF NOT EXISTS transaction_reference text,
  ADD COLUMN IF NOT EXISTS proof_document_url text,
  ADD COLUMN IF NOT EXISTS expected_amount numeric,
  ADD COLUMN IF NOT EXISTS received_amount numeric,
  ADD COLUMN IF NOT EXISTS receipt_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS allocated_to_expenses numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_unallocated numeric,
  ADD COLUMN IF NOT EXISTS receipt_notes text;

-- 2. Add disbursement tracking columns to loans
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS disbursement_method text,
  ADD COLUMN IF NOT EXISTS disbursement_date date,
  ADD COLUMN IF NOT EXISTS source_bank text,
  ADD COLUMN IF NOT EXISTS source_account_name text,
  ADD COLUMN IF NOT EXISTS source_account_number_masked text,
  ADD COLUMN IF NOT EXISTS destination_bank text,
  ADD COLUMN IF NOT EXISTS destination_account_masked text,
  ADD COLUMN IF NOT EXISTS loan_agreement_number text,
  ADD COLUMN IF NOT EXISTS transaction_reference text,
  ADD COLUMN IF NOT EXISTS disbursement_proof_url text,
  ADD COLUMN IF NOT EXISTS gross_loan_amount numeric,
  ADD COLUMN IF NOT EXISTS processing_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documentation_charges numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_disbursed_amount numeric,
  ADD COLUMN IF NOT EXISTS disbursement_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS allocated_to_expenses numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_unallocated numeric,
  ADD COLUMN IF NOT EXISTS stated_purpose text,
  ADD COLUMN IF NOT EXISTS purpose_compliant boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS disbursement_notes text;

-- 3. Add funding source columns to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS funded_by_type text,
  ADD COLUMN IF NOT EXISTS funded_by_id uuid,
  ADD COLUMN IF NOT EXISTS funded_by_reference text,
  ADD COLUMN IF NOT EXISTS matches_loan_purpose boolean,
  ADD COLUMN IF NOT EXISTS purpose_notes text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS vendor_name text;

-- 4. Create fund-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('fund-documents', 'fund-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for fund-documents (cipher-only upload/delete, public read)
CREATE POLICY "Anyone can view fund documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fund-documents');

CREATE POLICY "Cipher users can upload fund documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fund-documents'
    AND public.is_cipher(auth.uid())
  );

CREATE POLICY "Cipher users can update fund documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fund-documents'
    AND public.is_cipher(auth.uid())
  );

CREATE POLICY "Cipher users can delete fund documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fund-documents'
    AND public.is_cipher(auth.uid())
  );

-- 5. Create trigger to auto-update fund allocation on expense changes
CREATE OR REPLACE FUNCTION public.sync_expense_fund_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle DELETE: restore allocation to source
  IF TG_OP = 'DELETE' THEN
    IF OLD.funded_by_type = 'investment' AND OLD.funded_by_id IS NOT NULL THEN
      UPDATE public.investments
      SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount),
          remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount
      WHERE id = OLD.funded_by_id;
    ELSIF OLD.funded_by_type = 'loan' AND OLD.funded_by_id IS NOT NULL THEN
      UPDATE public.loans
      SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount),
          remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount
      WHERE id = OLD.funded_by_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle INSERT: deduct from source
  IF TG_OP = 'INSERT' THEN
    IF NEW.funded_by_type = 'investment' AND NEW.funded_by_id IS NOT NULL THEN
      UPDATE public.investments
      SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount,
          remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount)
      WHERE id = NEW.funded_by_id;
    ELSIF NEW.funded_by_type = 'loan' AND NEW.funded_by_id IS NOT NULL THEN
      UPDATE public.loans
      SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount,
          remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount)
      WHERE id = NEW.funded_by_id;
      -- Check purpose compliance
      IF NEW.matches_loan_purpose = false THEN
        UPDATE public.loans SET purpose_compliant = false WHERE id = NEW.funded_by_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: adjust difference
  IF TG_OP = 'UPDATE' THEN
    -- Remove old allocation
    IF OLD.funded_by_type = 'investment' AND OLD.funded_by_id IS NOT NULL THEN
      UPDATE public.investments
      SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount),
          remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount
      WHERE id = OLD.funded_by_id;
    ELSIF OLD.funded_by_type = 'loan' AND OLD.funded_by_id IS NOT NULL THEN
      UPDATE public.loans
      SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount),
          remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount
      WHERE id = OLD.funded_by_id;
    END IF;

    -- Add new allocation
    IF NEW.funded_by_type = 'investment' AND NEW.funded_by_id IS NOT NULL THEN
      UPDATE public.investments
      SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount,
          remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount)
      WHERE id = NEW.funded_by_id;
    ELSIF NEW.funded_by_type = 'loan' AND NEW.funded_by_id IS NOT NULL THEN
      UPDATE public.loans
      SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount,
          remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount)
      WHERE id = NEW.funded_by_id;
      IF NEW.matches_loan_purpose = false THEN
        UPDATE public.loans SET purpose_compliant = false WHERE id = NEW.funded_by_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_expense_fund_allocation_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_expense_fund_allocation();

-- 6. Add indexes for fund tracking queries
CREATE INDEX IF NOT EXISTS idx_expenses_funded_by ON public.expenses (funded_by_type, funded_by_id) WHERE funded_by_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investments_receipt_status ON public.investments (receipt_status) WHERE receipt_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loans_disbursement_status ON public.loans (disbursement_status) WHERE disbursement_status IS NOT NULL;
