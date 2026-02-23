-- Rewrite find_duplicate_students to avoid temp tables (PostgREST incompatible)
-- Use a pure query-based approach instead
CREATE OR REPLACE FUNCTION public.find_duplicate_students(_company_id uuid)
 RETURNS TABLE(student_id uuid, group_id integer, match_criteria text, is_primary boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH phone_name_groups AS (
    SELECT
      s.id AS sid,
      dense_rank() OVER (ORDER BY norm_phone, norm_name) AS gid,
      'phone_name'::text AS criteria,
      s.enrollment_date
    FROM (
      SELECT
        s2.id,
        s2.enrollment_date,
        regexp_replace(lower(trim(s2.name)), '\s+', ' ', 'g') AS norm_name,
        regexp_replace(
          regexp_replace(s2.phone, '[\s\-\(\)\.]', '', 'g'),
          '^(\+91|0091|91|0)', ''
        ) AS norm_phone
      FROM public.students s2
      WHERE s2.company_id = _company_id
        AND s2.phone IS NOT NULL AND trim(s2.phone) != ''
        AND s2.status != 'inactive'
    ) s
    WHERE (s.norm_phone, s.norm_name) IN (
      SELECT
        regexp_replace(
          regexp_replace(s3.phone, '[\s\-\(\)\.]', '', 'g'),
          '^(\+91|0091|91|0)', ''
        ),
        regexp_replace(lower(trim(s3.name)), '\s+', ' ', 'g')
      FROM public.students s3
      WHERE s3.company_id = _company_id
        AND s3.phone IS NOT NULL AND trim(s3.phone) != ''
        AND s3.status != 'inactive'
      GROUP BY 1, 2
      HAVING count(*) > 1
    )
  ),
  email_groups AS (
    SELECT
      s.id AS sid,
      1000000 + dense_rank() OVER (ORDER BY norm_email) AS gid,
      'email'::text AS criteria,
      s.enrollment_date
    FROM (
      SELECT s2.id, s2.enrollment_date, lower(trim(s2.email)) AS norm_email
      FROM public.students s2
      WHERE s2.company_id = _company_id
        AND s2.email IS NOT NULL AND trim(s2.email) != ''
        AND s2.status != 'inactive'
    ) s
    WHERE s.norm_email IN (
      SELECT lower(trim(s3.email))
      FROM public.students s3
      WHERE s3.company_id = _company_id
        AND s3.email IS NOT NULL AND trim(s3.email) != ''
        AND s3.status != 'inactive'
      GROUP BY 1
      HAVING count(*) > 1
    )
  ),
  aadhar_groups AS (
    SELECT
      s.id AS sid,
      2000000 + dense_rank() OVER (ORDER BY norm_aadhar) AS gid,
      'aadhar'::text AS criteria,
      s.enrollment_date
    FROM (
      SELECT s2.id, s2.enrollment_date, regexp_replace(s2.aadhar_id_number, '[\s\-]', '', 'g') AS norm_aadhar
      FROM public.students s2
      WHERE s2.company_id = _company_id
        AND s2.aadhar_id_number IS NOT NULL AND trim(s2.aadhar_id_number) != ''
        AND s2.status != 'inactive'
    ) s
    WHERE s.norm_aadhar IN (
      SELECT regexp_replace(s3.aadhar_id_number, '[\s\-]', '', 'g')
      FROM public.students s3
      WHERE s3.company_id = _company_id
        AND s3.aadhar_id_number IS NOT NULL AND trim(s3.aadhar_id_number) != ''
        AND s3.status != 'inactive'
      GROUP BY 1
      HAVING count(*) > 1
    )
  ),
  all_matches AS (
    SELECT * FROM phone_name_groups
    UNION ALL
    SELECT * FROM email_groups
    UNION ALL
    SELECT * FROM aadhar_groups
  ),
  filtered AS (
    SELECT am.*
    FROM all_matches am
    WHERE NOT EXISTS (
      SELECT 1 FROM public.duplicate_dismissals dd
      WHERE dd.company_id = _company_id
        AND (
          (dd.student_id_a = am.sid AND dd.student_id_b IN (
            SELECT am2.sid FROM all_matches am2 WHERE am2.gid = am.gid AND am2.sid != am.sid
          ))
          OR
          (dd.student_id_b = am.sid AND dd.student_id_a IN (
            SELECT am2.sid FROM all_matches am2 WHERE am2.gid = am.gid AND am2.sid != am.sid
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
    (f.enrollment_date = min(f.enrollment_date) OVER (PARTITION BY f.gid)) AS is_primary
  FROM filtered f
  WHERE f.gid IN (SELECT vg.gid FROM valid_groups vg)
  ORDER BY f.gid, (f.enrollment_date = min(f.enrollment_date) OVER (PARTITION BY f.gid)) DESC;
END;
$function$;