-- Add UPDATE policy for allocations table
CREATE POLICY "Users can update own allocations"
ON public.allocations
FOR UPDATE
USING (auth.uid() = user_id);

-- Add UPDATE policy for khata_transfers table
CREATE POLICY "Users can update own transfers"
ON public.khata_transfers
FOR UPDATE
USING (auth.uid() = user_id);