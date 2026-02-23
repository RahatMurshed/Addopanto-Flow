
-- =============================================
-- EMPLOYEE MANAGEMENT SYSTEM - Database Schema
-- =============================================

-- 1. Add can_view_employees permission to company_memberships
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS can_view_employees boolean NOT NULL DEFAULT false;

-- 2. Create employees table
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id_number text NOT NULL,
  full_name text NOT NULL,
  profile_picture_url text,
  designation text,
  department text,
  date_of_birth date,
  gender text,
  blood_group text,
  contact_number text NOT NULL,
  whatsapp_number text,
  email text,
  current_address text,
  permanent_address text,
  permanent_address_same boolean DEFAULT true,
  emergency_contact_name text,
  emergency_contact_number text,
  join_date date NOT NULL,
  employment_type text NOT NULL DEFAULT 'full_time',
  employment_status text NOT NULL DEFAULT 'active',
  monthly_salary numeric NOT NULL DEFAULT 0,
  bank_account_number text,
  bank_name text,
  bank_branch text,
  aadhar_national_id text,
  previous_experience text,
  qualifications text,
  notes text,
  created_by uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id_number)
);

-- 3. Create employee_salary_payments table
CREATE TABLE public.employee_salary_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  month text NOT NULL, -- format: YYYY-MM
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  deductions numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create employee_attendance table
CREATE TABLE public.employee_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'present', -- present, absent, half_day, leave
  marked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, date)
);

-- 5. Create employee_leaves table
CREATE TABLE public.employee_leaves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'casual', -- sick, casual, annual
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  approval_status text NOT NULL DEFAULT 'approved', -- pending, approved, rejected
  approved_by uuid,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX idx_employees_company_id ON public.employees(company_id);
CREATE INDEX idx_employees_status ON public.employees(employment_status);
CREATE INDEX idx_employees_department ON public.employees(department);
CREATE INDEX idx_employees_employee_id_number ON public.employees(employee_id_number);
CREATE INDEX idx_employee_salary_company ON public.employee_salary_payments(company_id);
CREATE INDEX idx_employee_salary_employee ON public.employee_salary_payments(employee_id);
CREATE INDEX idx_employee_salary_month ON public.employee_salary_payments(month);
CREATE INDEX idx_employee_attendance_company ON public.employee_attendance(company_id);
CREATE INDEX idx_employee_attendance_employee_date ON public.employee_attendance(employee_id, date);
CREATE INDEX idx_employee_leaves_company ON public.employee_leaves(company_id);
CREATE INDEX idx_employee_leaves_employee ON public.employee_leaves(employee_id);

-- 7. Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;

-- 8. Helper function: can user manage employees (admin/cipher)
CREATE OR REPLACE FUNCTION public.company_can_manage_employees(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND status = 'active'
      AND role = 'admin'
  ) OR public.is_cipher(_user_id)
$$;

-- 9. Helper function: can user view employees (admin/cipher or moderator with permission)
CREATE OR REPLACE FUNCTION public.company_can_view_employees(_company_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.company_can_manage_employees(_company_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = _company_id
        AND user_id = _user_id
        AND status = 'active'
        AND role = 'moderator'
        AND can_view_employees = true
    )
$$;

-- 10. RLS Policies for employees
CREATE POLICY "Company can view employees"
  ON public.employees FOR SELECT
  USING (company_can_view_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can update employees"
  ON public.employees FOR UPDATE
  USING (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can delete employees"
  ON public.employees FOR DELETE
  USING (company_can_manage_employees(company_id, auth.uid()));

-- 11. RLS Policies for salary payments (admin/cipher ONLY - moderators cannot see salary)
CREATE POLICY "Admin/Cipher can view salary payments"
  ON public.employee_salary_payments FOR SELECT
  USING (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can insert salary payments"
  ON public.employee_salary_payments FOR INSERT
  WITH CHECK (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can update salary payments"
  ON public.employee_salary_payments FOR UPDATE
  USING (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can delete salary payments"
  ON public.employee_salary_payments FOR DELETE
  USING (company_can_manage_employees(company_id, auth.uid()));

-- 12. RLS Policies for attendance
CREATE POLICY "Company can view attendance"
  ON public.employee_attendance FOR SELECT
  USING (company_can_view_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can insert attendance"
  ON public.employee_attendance FOR INSERT
  WITH CHECK (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can update attendance"
  ON public.employee_attendance FOR UPDATE
  USING (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can delete attendance"
  ON public.employee_attendance FOR DELETE
  USING (company_can_manage_employees(company_id, auth.uid()));

-- 13. RLS Policies for leaves
CREATE POLICY "Company can view leaves"
  ON public.employee_leaves FOR SELECT
  USING (company_can_view_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can insert leaves"
  ON public.employee_leaves FOR INSERT
  WITH CHECK (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can update leaves"
  ON public.employee_leaves FOR UPDATE
  USING (company_can_manage_employees(company_id, auth.uid()));

CREATE POLICY "Admin/Cipher can delete leaves"
  ON public.employee_leaves FOR DELETE
  USING (company_can_manage_employees(company_id, auth.uid()));

-- 14. Updated_at trigger for employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Audit triggers for employees
CREATE TRIGGER audit_employees_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_employee_salary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_salary_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_trigger();
