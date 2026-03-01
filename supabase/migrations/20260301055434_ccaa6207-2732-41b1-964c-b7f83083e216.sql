
-- 1. Create verify_financial_consistency RPC function
CREATE OR REPLACE FUNCTION public.verify_financial_consistency(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orphan_count integer;
  v_duplicate_count integer;
  v_mismatch_count integer;
  v_result jsonb;
BEGIN
  -- 1. Paid student_payments with no linked revenues entry
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.student_payments sp
  WHERE sp.company_id = _company_id
    AND sp.status = 'paid'
    AND NOT EXISTS (
      SELECT 1 FROM public.revenues r WHERE r.student_payment_id = sp.id
    );

  -- 2. Duplicate revenues entries for the same student_payment_id
  SELECT COALESCE(SUM(dup_count - 1), 0) INTO v_duplicate_count
  FROM (
    SELECT student_payment_id, COUNT(*) AS dup_count
    FROM public.revenues
    WHERE company_id = _company_id
      AND student_payment_id IS NOT NULL
    GROUP BY student_payment_id
    HAVING COUNT(*) > 1
  ) dupes;

  -- 3. Revenue amount mismatches with linked student_payments
  SELECT COUNT(*) INTO v_mismatch_count
  FROM public.revenues r
  JOIN public.student_payments sp ON sp.id = r.student_payment_id
  WHERE r.company_id = _company_id
    AND r.student_payment_id IS NOT NULL
    AND r.amount IS DISTINCT FROM sp.amount;

  v_result := jsonb_build_object(
    'company_id', _company_id,
    'orphan_payments', v_orphan_count,
    'duplicate_revenues', v_duplicate_count,
    'amount_mismatches', v_mismatch_count,
    'checked_at', now()
  );

  -- Log any discrepancies to audit_logs
  IF v_orphan_count > 0 OR v_duplicate_count > 0 OR v_mismatch_count > 0 THEN
    INSERT INTO public.audit_logs (
      company_id, user_id, user_email, table_name, record_id, action, new_data
    ) VALUES (
      _company_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'system@consistency-check',
      'revenues',
      _company_id::text,
      'financial_consistency_warning',
      v_result
    );
  END IF;

  RETURN v_result;
END;
$function$;

-- 2. Add timezone column to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS timezone text DEFAULT NULL;

COMMENT ON COLUMN public.companies.timezone IS 'IANA timezone identifier for date comparisons in reporting. NULL means server default (UTC).';
