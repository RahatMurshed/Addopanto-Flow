
-- ==============================================
-- Duplicate Student Detection System
-- ==============================================

-- 1. Performance indexes
CREATE INDEX IF NOT EXISTS idx_students_phone_company
  ON public.students (company_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_email_company
  ON public.students (company_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_aadhar_company
  ON public.students (company_id, aadhar_id_number) WHERE aadhar_id_number IS NOT NULL;

-- 2. Dismissals table
CREATE TABLE public.duplicate_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  student_id_a uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_id_b uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  dismissed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, student_id_a, student_id_b)
);

ALTER TABLE public.duplicate_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Cipher can select dismissals"
  ON public.duplicate_dismissals FOR SELECT
  USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

CREATE POLICY "Admin/Cipher can insert dismissals"
  ON public.duplicate_dismissals FOR INSERT
  WITH CHECK (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

CREATE POLICY "Admin/Cipher can delete dismissals"
  ON public.duplicate_dismissals FOR DELETE
  USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- 3. Batch detection function
CREATE OR REPLACE FUNCTION public.find_duplicate_students(_company_id uuid)
RETURNS TABLE(student_id uuid, group_id int, match_criteria text, is_primary bool)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id int := 0;
  rec RECORD;
BEGIN
  -- Create temp table to collect results
  CREATE TEMP TABLE IF NOT EXISTS _dup_results (
    student_id uuid,
    group_id int,
    match_criteria text,
    is_primary bool
  ) ON COMMIT DROP;
  DELETE FROM _dup_results;

  -- Phone + Name matches
  FOR rec IN
    SELECT
      regexp_replace(lower(trim(s.name)), '\s+', ' ', 'g') AS norm_name,
      regexp_replace(
        regexp_replace(s.phone, '[\s\-\(\)\.]', '', 'g'),
        '^(\+91|0091|91|0)', ''
      ) AS norm_phone
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.phone IS NOT NULL AND trim(s.phone) != ''
      AND s.status != 'inactive'
    GROUP BY 1, 2
    HAVING count(*) > 1
  LOOP
    v_group_id := v_group_id + 1;
    INSERT INTO _dup_results
    SELECT
      s.id,
      v_group_id,
      'phone_name',
      (s.enrollment_date = min(s.enrollment_date) OVER (PARTITION BY 1))
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.phone IS NOT NULL AND trim(s.phone) != ''
      AND regexp_replace(lower(trim(s.name)), '\s+', ' ', 'g') = rec.norm_name
      AND regexp_replace(
            regexp_replace(s.phone, '[\s\-\(\)\.]', '', 'g'),
            '^(\+91|0091|91|0)', ''
          ) = rec.norm_phone;
  END LOOP;

  -- Email matches
  FOR rec IN
    SELECT lower(trim(s.email)) AS norm_email
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.email IS NOT NULL AND trim(s.email) != ''
      AND s.status != 'inactive'
    GROUP BY 1
    HAVING count(*) > 1
  LOOP
    v_group_id := v_group_id + 1;
    INSERT INTO _dup_results
    SELECT
      s.id,
      v_group_id,
      'email',
      (s.enrollment_date = min(s.enrollment_date) OVER (PARTITION BY 1))
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.email IS NOT NULL AND trim(s.email) != ''
      AND lower(trim(s.email)) = rec.norm_email;
  END LOOP;

  -- Aadhar matches
  FOR rec IN
    SELECT regexp_replace(s.aadhar_id_number, '[\s\-]', '', 'g') AS norm_aadhar
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.aadhar_id_number IS NOT NULL AND trim(s.aadhar_id_number) != ''
      AND s.status != 'inactive'
    GROUP BY 1
    HAVING count(*) > 1
  LOOP
    v_group_id := v_group_id + 1;
    INSERT INTO _dup_results
    SELECT
      s.id,
      v_group_id,
      'aadhar',
      (s.enrollment_date = min(s.enrollment_date) OVER (PARTITION BY 1))
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.aadhar_id_number IS NOT NULL AND trim(s.aadhar_id_number) != ''
      AND regexp_replace(s.aadhar_id_number, '[\s\-]', '', 'g') = rec.norm_aadhar;
  END LOOP;

  -- Exclude dismissed pairs
  DELETE FROM _dup_results dr
  WHERE EXISTS (
    SELECT 1 FROM public.duplicate_dismissals dd
    WHERE dd.company_id = _company_id
      AND (
        (dd.student_id_a = dr.student_id AND dd.student_id_b IN (
          SELECT dr2.student_id FROM _dup_results dr2 WHERE dr2.group_id = dr.group_id AND dr2.student_id != dr.student_id
        ))
        OR
        (dd.student_id_b = dr.student_id AND dd.student_id_a IN (
          SELECT dr2.student_id FROM _dup_results dr2 WHERE dr2.group_id = dr.group_id AND dr2.student_id != dr.student_id
        ))
      )
  );

  -- Remove groups that now have only 1 member
  DELETE FROM _dup_results dr
  WHERE dr.group_id IN (
    SELECT g.group_id FROM _dup_results g GROUP BY g.group_id HAVING count(*) < 2
  );

  RETURN QUERY SELECT * FROM _dup_results ORDER BY _dup_results.group_id, _dup_results.is_primary DESC;
END;
$$;

-- 4. Single-student check function for real-time creation warnings
CREATE OR REPLACE FUNCTION public.check_student_duplicates_single(
  _company_id uuid,
  _phone text DEFAULT NULL,
  _name text DEFAULT NULL,
  _email text DEFAULT NULL,
  _aadhar text DEFAULT NULL,
  _exclude_student_id uuid DEFAULT NULL
)
RETURNS TABLE(student_id uuid, student_name text, match_criteria text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_phone text;
  v_norm_name text;
  v_norm_email text;
  v_norm_aadhar text;
BEGIN
  -- Normalize inputs
  v_norm_phone := regexp_replace(
    regexp_replace(COALESCE(_phone, ''), '[\s\-\(\)\.]', '', 'g'),
    '^(\+91|0091|91|0)', ''
  );
  v_norm_name := regexp_replace(lower(trim(COALESCE(_name, ''))), '\s+', ' ', 'g');
  v_norm_email := lower(trim(COALESCE(_email, '')));
  v_norm_aadhar := regexp_replace(COALESCE(_aadhar, ''), '[\s\-]', '', 'g');

  -- Phone + Name match
  IF v_norm_phone != '' AND v_norm_name != '' THEN
    RETURN QUERY
    SELECT s.id, s.name, 'phone_name'::text
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.phone IS NOT NULL AND trim(s.phone) != ''
      AND (_exclude_student_id IS NULL OR s.id != _exclude_student_id)
      AND regexp_replace(lower(trim(s.name)), '\s+', ' ', 'g') = v_norm_name
      AND regexp_replace(
            regexp_replace(s.phone, '[\s\-\(\)\.]', '', 'g'),
            '^(\+91|0091|91|0)', ''
          ) = v_norm_phone;
  END IF;

  -- Email match
  IF v_norm_email != '' THEN
    RETURN QUERY
    SELECT s.id, s.name, 'email'::text
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.email IS NOT NULL AND trim(s.email) != ''
      AND (_exclude_student_id IS NULL OR s.id != _exclude_student_id)
      AND lower(trim(s.email)) = v_norm_email;
  END IF;

  -- Aadhar match
  IF v_norm_aadhar != '' THEN
    RETURN QUERY
    SELECT s.id, s.name, 'aadhar'::text
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.aadhar_id_number IS NOT NULL AND trim(s.aadhar_id_number) != ''
      AND (_exclude_student_id IS NULL OR s.id != _exclude_student_id)
      AND regexp_replace(s.aadhar_id_number, '[\s\-]', '', 'g') = v_norm_aadhar;
  END IF;
END;
$$;
