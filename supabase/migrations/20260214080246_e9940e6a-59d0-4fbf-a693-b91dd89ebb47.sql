-- Performance indexes for scalability (Phase 2.1)

-- Revenue/expense date-range queries
CREATE INDEX IF NOT EXISTS idx_revenues_company_date ON public.revenues(company_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON public.expenses(company_id, date);

-- Student lookups
CREATE INDEX IF NOT EXISTS idx_students_company_status ON public.students(company_id, status);
CREATE INDEX IF NOT EXISTS idx_students_company_name ON public.students(company_id, name);

-- Payment lookups
CREATE INDEX IF NOT EXISTS idx_student_payments_student ON public.student_payments(student_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_student_payments_company ON public.student_payments(company_id, payment_date);

-- Allocation lookups
CREATE INDEX IF NOT EXISTS idx_allocations_revenue ON public.allocations(revenue_id);
CREATE INDEX IF NOT EXISTS idx_allocations_account ON public.allocations(expense_account_id);

-- Membership lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_company ON public.company_memberships(user_id, company_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_company_status ON public.company_join_requests(company_id, status);

-- Registration lookups
CREATE INDEX IF NOT EXISTS idx_registration_email_status ON public.registration_requests(email, status);