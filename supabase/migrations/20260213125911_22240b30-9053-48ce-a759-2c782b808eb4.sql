
-- 1. Create student_status enum
CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'graduated');

-- 2. Create students table
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  student_id_number text,
  email text,
  phone text,
  enrollment_date date NOT NULL,
  billing_start_month text NOT NULL,
  admission_fee_total numeric NOT NULL DEFAULT 0,
  monthly_fee_amount numeric NOT NULL DEFAULT 0,
  status student_status NOT NULL DEFAULT 'active',
  notes text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Authorized users can insert students" ON public.students FOR INSERT WITH CHECK (can_add_revenue(auth.uid()));
CREATE POLICY "Admins can update students" ON public.students FOR UPDATE USING (can_edit_delete(auth.uid()));
CREATE POLICY "Admins can delete students" ON public.students FOR DELETE USING (can_edit_delete(auth.uid()));

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create student_payments table
CREATE TABLE public.student_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  payment_type text NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  months_covered text[],
  receipt_number text,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all student payments" ON public.student_payments FOR SELECT USING (true);
CREATE POLICY "Authorized users can insert student payments" ON public.student_payments FOR INSERT WITH CHECK (can_add_revenue(auth.uid()));
CREATE POLICY "Admins can update student payments" ON public.student_payments FOR UPDATE USING (can_edit_delete(auth.uid()));
CREATE POLICY "Admins can delete student payments" ON public.student_payments FOR DELETE USING (can_edit_delete(auth.uid()));

-- 4. Create monthly_fee_history table
CREATE TABLE public.monthly_fee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  monthly_amount numeric NOT NULL,
  effective_from text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_fee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all fee history" ON public.monthly_fee_history FOR SELECT USING (true);
CREATE POLICY "Authorized users can insert fee history" ON public.monthly_fee_history FOR INSERT WITH CHECK (can_add_revenue(auth.uid()));
CREATE POLICY "Admins can update fee history" ON public.monthly_fee_history FOR UPDATE USING (can_edit_delete(auth.uid()));
CREATE POLICY "Admins can delete fee history" ON public.monthly_fee_history FOR DELETE USING (can_edit_delete(auth.uid()));
