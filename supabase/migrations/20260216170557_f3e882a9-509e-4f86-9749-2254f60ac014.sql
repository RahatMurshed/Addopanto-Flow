
CREATE VIEW public.students_safe
WITH (security_invoker=on) AS
  SELECT id, name, student_id_number, enrollment_date, billing_start_month,
         admission_fee_total, monthly_fee_amount, status, notes, user_id,
         created_at, updated_at, course_start_month, course_end_month,
         company_id, batch_id, class_grade, roll_number, academic_year,
         section_division, gender
  FROM public.students;
