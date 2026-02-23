-- Fix: find_duplicate_students was marked STABLE but uses CREATE TEMP TABLE
-- Change to VOLATILE to allow temp table creation
CREATE OR REPLACE FUNCTION public.find_duplicate_students(_company_id uuid)
 RETURNS TABLE(student_id uuid, group_id integer, match_criteria text, is_primary boolean)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;