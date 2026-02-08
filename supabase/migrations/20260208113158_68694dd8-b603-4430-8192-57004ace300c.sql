-- Create khata_transfers table for tracking balance transfers between accounts
CREATE TABLE public.khata_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent transferring to the same account
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

-- Enable Row Level Security
ALTER TABLE public.khata_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transfers"
ON public.khata_transfers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transfers"
ON public.khata_transfers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers"
ON public.khata_transfers
FOR DELETE
USING (auth.uid() = user_id);