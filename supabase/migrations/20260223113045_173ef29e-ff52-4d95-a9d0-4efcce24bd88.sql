
CREATE OR REPLACE FUNCTION public.find_duplicate_students(_company_id uuid)
 RETURNS TABLE(student_id uuid, group_id integer, match_criteria text, is_primary boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT
      s.id,
      s.enrollment_date,
      regexp_replace(lower(trim(s.name)), '\s+', ' ', 'g') AS norm_name,
      regexp_replace(
        regexp_replace(s.phone, '[\s\-\(\)\.]', '', 'g'),
        '^(\+91|0091|91|0)', ''
      ) AS norm_phone
    FROM public.students s
    WHERE s.company_id = _company_id
      AND s.status != 'inactive'
      AND s.phone IS NOT NULL AND trim(s.phone) != ''
  ),
  dup_groups AS (
    SELECT
      n.id AS sid,
      dense_rank() OVER (ORDER BY n.norm_name, n.norm_phone) AS gid,
      'name_phone'::text AS criteria,
      n.enrollment_date,
      row_number() OVER (PARTITION BY n.norm_name, n.norm_phone ORDER BY n.enrollment_date ASC, n.id ASC) AS rn
    FROM normalized n
    WHERE (n.norm_name, n.norm_phone) IN (
      SELECT n2.norm_name, n2.norm_phone
      FROM normalized n2
      GROUP BY n2.norm_name, n2.norm_phone
      HAVING count(*) > 1
    )
  ),
  filtered AS (
    SELECT dg.*
    FROM dup_groups dg
    WHERE NOT EXISTS (
      SELECT 1 FROM public.duplicate_dismissals dd
      WHERE dd.company_id = _company_id
        AND (
          (dd.student_id_a = dg.sid AND dd.student_id_b IN (
            SELECT dg2.sid FROM dup_groups dg2 WHERE dg2.gid = dg.gid AND dg2.sid != dg.sid
          ))
          OR
          (dd.student_id_b = dg.sid AND dd.student_id_a IN (
            SELECT dg2.sid FROM dup_groups dg2 WHERE dg2.gid = dg.gid AND dg2.sid != dg.sid
          ))
        )
    )
  ),
  valid_groups AS (
    SELECT f.gid FROM filtered f GROUP BY f.gid HAVING count(*) >= 2
  )
  SELECT
    f.sid AS student_id,
    f.gid::int AS group_id,
    f.criteria AS match_criteria,
    (f.rn = 1) AS is_primary
  FROM filtered f
  WHERE f.gid IN (SELECT vg.gid FROM valid_groups vg)
  ORDER BY f.gid, f.rn;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_student_duplicates_single(_company_id uuid, _phone text DEFAULT NULL::text, _name text DEFAULT NULL::text, _email text DEFAULT NULL::text, _aadhar text DEFAULT NULL::text, _exclude_student_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(student_id uuid, student_name text, match_criteria text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm_phone text;
  v_norm_name text;
BEGIN
  v_norm_phone := regexp_replace(
    regexp_replace(COALESCE(_phone, ''), '[\s\-\(\)\.]', '', 'g'),
    '^(\+91|0091|91|0)', ''
  );
  v_norm_name := regexp_replace(lower(trim(COALESCE(_name, ''))), '\s+', ' ', 'g');

  IF v_norm_phone != '' AND v_norm_name != '' THEN
    RETURN QUERY
    SELECT s.id, s.name, 'name_phone'::text
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
END;
$function$;
