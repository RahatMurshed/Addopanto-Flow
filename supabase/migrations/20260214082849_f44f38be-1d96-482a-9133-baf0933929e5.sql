-- Backfill: link existing unlinked revenues to their student payments
-- Match by: student name in description + company_id + closest created_at
-- Use a CTE with ROW_NUMBER to get the best match for each payment

WITH ranked_matches AS (
  SELECT 
    sp.id AS sp_id,
    r.id AS r_id,
    ROW_NUMBER() OVER (
      PARTITION BY sp.id 
      ORDER BY ABS(EXTRACT(EPOCH FROM (sp.created_at - r.created_at)))
    ) AS rn_sp,
    ROW_NUMBER() OVER (
      PARTITION BY r.id 
      ORDER BY ABS(EXTRACT(EPOCH FROM (sp.created_at - r.created_at)))
    ) AS rn_rev
  FROM student_payments sp
  JOIN students s ON s.id = sp.student_id
  JOIN revenues r ON r.description ILIKE '%' || s.name || '%'
    AND r.company_id = sp.company_id
    AND r.student_payment_id IS NULL
    AND ABS(EXTRACT(EPOCH FROM (sp.created_at - r.created_at))) < 10 -- within 10 seconds
  WHERE NOT EXISTS (
    SELECT 1 FROM revenues r2 WHERE r2.student_payment_id = sp.id
  )
),
best_matches AS (
  -- Only keep matches where this is the best match for BOTH the payment and the revenue
  SELECT sp_id, r_id
  FROM ranked_matches
  WHERE rn_sp = 1 AND rn_rev = 1
)
UPDATE revenues r
SET student_payment_id = bm.sp_id
FROM best_matches bm
WHERE r.id = bm.r_id;

-- Now sync amounts: for any linked revenue where amounts differ from payment
UPDATE revenues r
SET amount = sp.amount,
    date = sp.payment_date,
    updated_at = now()
FROM student_payments sp
WHERE r.student_payment_id = sp.id
  AND (r.amount != sp.amount OR r.date != sp.payment_date);