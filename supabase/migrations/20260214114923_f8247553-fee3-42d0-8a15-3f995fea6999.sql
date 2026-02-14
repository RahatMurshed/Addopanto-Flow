-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_company 
  ON public.company_memberships(user_id, company_id, status);
CREATE INDEX IF NOT EXISTS idx_students_company_status 
  ON public.students(company_id, status);
CREATE INDEX IF NOT EXISTS idx_revenues_company_date 
  ON public.revenues(company_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date 
  ON public.expenses(company_id, date);
CREATE INDEX IF NOT EXISTS idx_student_payments_company_student 
  ON public.student_payments(company_id, student_id, payment_date);