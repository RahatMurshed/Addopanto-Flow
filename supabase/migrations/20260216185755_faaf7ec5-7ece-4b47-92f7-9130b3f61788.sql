-- Allow only cipher users to delete audit logs
CREATE POLICY "Only cipher users can delete audit logs"
ON public.audit_logs
FOR DELETE
USING (public.is_cipher(auth.uid()));