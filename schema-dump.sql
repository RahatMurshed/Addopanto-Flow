-- ============================================================
-- COMPLETE SQL SCHEMA DUMP — AddoPantoFlow
-- Generated: 2026-03-02
-- Run this on a fresh Supabase project to recreate the schema.
-- NOTE: auth.users is managed by Supabase — do NOT create it.
-- ============================================================

-- =====================
-- 1. ENUMS
-- =====================
CREATE TYPE public.app_role AS ENUM ('cipher', 'admin', 'moderator', 'user');
CREATE TYPE public.company_role AS ENUM ('admin', 'moderator', 'viewer', 'data_entry_operator');
CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'graduated', 'dropout', 'transferred', 'inquiry');


-- =====================
-- 2. TABLES
-- =====================

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  join_password text,
  invite_code text UNIQUE,
  logo_url text,
  description text,
  currency text NOT NULL DEFAULT 'BDT'::text,
  fiscal_year_start_month integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  base_currency text NOT NULL DEFAULT 'BDT'::text,
  timezone text
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text NOT NULL DEFAULT ''::text,
  avatar_url text,
  active_company_id uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.company_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.company_role NOT NULL DEFAULT 'moderator'::public.company_role,
  can_add_revenue boolean NOT NULL DEFAULT false,
  can_add_expense boolean NOT NULL DEFAULT false,
  can_add_expense_source boolean NOT NULL DEFAULT false,
  can_transfer boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_manage_students boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'::text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  deo_students boolean NOT NULL DEFAULT false,
  deo_payments boolean NOT NULL DEFAULT false,
  deo_batches boolean NOT NULL DEFAULT false,
  deo_finance boolean NOT NULL DEFAULT false,
  mod_students_add boolean NOT NULL DEFAULT false,
  mod_students_edit boolean NOT NULL DEFAULT false,
  mod_students_delete boolean NOT NULL DEFAULT false,
  mod_payments_add boolean NOT NULL DEFAULT false,
  mod_payments_edit boolean NOT NULL DEFAULT false,
  mod_payments_delete boolean NOT NULL DEFAULT false,
  mod_batches_add boolean NOT NULL DEFAULT false,
  mod_batches_edit boolean NOT NULL DEFAULT false,
  mod_batches_delete boolean NOT NULL DEFAULT false,
  mod_revenue_add boolean NOT NULL DEFAULT false,
  mod_revenue_edit boolean NOT NULL DEFAULT false,
  mod_revenue_delete boolean NOT NULL DEFAULT false,
  mod_expenses_add boolean NOT NULL DEFAULT false,
  mod_expenses_edit boolean NOT NULL DEFAULT false,
  mod_expenses_delete boolean NOT NULL DEFAULT false,
  data_entry_mode boolean NOT NULL DEFAULT false,
  can_view_employees boolean NOT NULL DEFAULT false,
  mod_employees_add boolean DEFAULT false,
  mod_employees_edit boolean DEFAULT false,
  mod_employees_delete boolean DEFAULT false,
  mod_employees_salary boolean DEFAULT false,
  mod_view_courses boolean DEFAULT false,
  mod_view_batches boolean DEFAULT false,
  mod_view_revenue boolean DEFAULT false,
  mod_view_expenses boolean DEFAULT false,
  mod_view_employees boolean DEFAULT false,
  UNIQUE (user_id, company_id)
);

CREATE TABLE public.company_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'::text,
  message text,
  rejection_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  banned_until timestamptz
);

CREATE TABLE public.company_creation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  company_slug text NOT NULL,
  description text,
  logo_url text,
  industry text,
  estimated_students integer,
  contact_email text,
  contact_phone text,
  reason text,
  status text NOT NULL DEFAULT 'pending'::text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  course_code text NOT NULL,
  description text,
  duration_months integer,
  category text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'active'::text,
  created_by uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_name text NOT NULL,
  batch_code text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  course_duration_months integer,
  default_admission_fee numeric NOT NULL DEFAULT 0,
  default_monthly_fee numeric NOT NULL DEFAULT 0,
  max_capacity integer,
  status text NOT NULL DEFAULT 'active'::text,
  created_by uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  course_duration_days integer DEFAULT 0,
  payment_mode text NOT NULL DEFAULT 'monthly'::text,
  UNIQUE (company_id, batch_code)
);

CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  student_id_number text,
  email text,
  phone text,
  enrollment_date date NOT NULL,
  billing_start_month text NOT NULL,
  course_start_month text,
  course_end_month text,
  admission_fee_total numeric NOT NULL DEFAULT 0,
  monthly_fee_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'::text,
  notes text,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  date_of_birth date,
  gender text,
  blood_group text,
  religion_category text,
  nationality text,
  aadhar_id_number text,
  whatsapp_number text,
  alt_contact_number text,
  address_house text,
  address_street text,
  address_area text,
  address_city text,
  address_state text,
  address_pin_zip text,
  permanent_address_same boolean DEFAULT true,
  perm_address_house text,
  perm_address_street text,
  perm_address_area text,
  perm_address_city text,
  perm_address_state text,
  perm_address_pin_zip text,
  father_name text,
  father_occupation text,
  father_contact text,
  father_annual_income numeric,
  mother_name text,
  mother_occupation text,
  mother_contact text,
  guardian_name text,
  guardian_contact text,
  guardian_relationship text,
  previous_school text,
  class_grade text,
  roll_number text,
  academic_year text,
  section_division text,
  previous_qualification text,
  previous_percentage text,
  board_university text,
  special_needs_medical text,
  emergency_contact_name text,
  emergency_contact_number text,
  transportation_mode text,
  distance_from_institution text,
  extracurricular_interests text,
  language_proficiency text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL
);

CREATE TABLE public.batch_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enrollment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active'::text,
  total_fee numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE TABLE public.revenue_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id)
);

CREATE TABLE public.student_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  payment_type text NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  months_covered text[],
  receipt_number text,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'paid'::text,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  batch_enrollment_id uuid REFERENCES public.batch_enrollments(id) ON DELETE RESTRICT
);

CREATE TABLE public.expense_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  allocation_percentage numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3B82F6'::text,
  expected_monthly_expense numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id)
);

CREATE TABLE public.revenues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  student_payment_id uuid REFERENCES public.student_payments(id) ON DELETE CASCADE,
  product_sale_id uuid, -- FK added after product_sales table
  is_system_generated boolean NOT NULL DEFAULT false
);

CREATE TABLE public.allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_id uuid NOT NULL REFERENCES public.revenues(id) ON DELETE CASCADE,
  expense_account_id uuid NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id)
);

CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_account_id uuid NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  funded_by_type text,
  funded_by_id uuid,
  funded_by_reference text,
  matches_loan_purpose boolean,
  purpose_notes text,
  invoice_number text,
  vendor_name text
);

CREATE TABLE public.khata_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_account_id uuid NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id)
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.monthly_fee_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  monthly_amount numeric NOT NULL,
  effective_from text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES public.companies(id)
);

CREATE TABLE public.moderator_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  can_add_revenue boolean NOT NULL DEFAULT false,
  can_add_expense boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT false,
  controlled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  can_add_expense_source boolean NOT NULL DEFAULT false,
  can_transfer boolean NOT NULL DEFAULT false
);

CREATE TABLE public.registration_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  can_add_revenue boolean NOT NULL DEFAULT true,
  can_add_expense boolean NOT NULL DEFAULT true,
  can_view_reports boolean NOT NULL DEFAULT true,
  can_add_expense_source boolean NOT NULL DEFAULT false,
  can_transfer boolean NOT NULL DEFAULT false,
  banned_until timestamptz
);

CREATE TABLE public.stakeholders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stakeholder_type text NOT NULL,
  category text NOT NULL DEFAULT 'individual'::text,
  name text NOT NULL,
  contact_number text,
  email text,
  address text,
  id_number text,
  relationship_notes text,
  status text NOT NULL DEFAULT 'active'::text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  image_url text
);

CREATE TABLE public.investments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  investment_amount numeric NOT NULL,
  investment_date date NOT NULL,
  ownership_percentage numeric NOT NULL DEFAULT 0,
  profit_share_percentage numeric NOT NULL DEFAULT 0,
  investment_type text NOT NULL DEFAULT 'equity'::text,
  company_valuation_at_investment numeric,
  terms_and_conditions text,
  status text NOT NULL DEFAULT 'active'::text,
  exit_date date,
  exit_amount numeric,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  transfer_method text,
  source_bank text,
  source_account_name text,
  source_account_number_masked text,
  destination_bank text,
  destination_account_masked text,
  transfer_date date,
  transaction_reference text,
  proof_document_url text,
  expected_amount numeric,
  received_amount numeric,
  receipt_status text DEFAULT 'pending'::text,
  allocated_to_expenses numeric DEFAULT 0,
  remaining_unallocated numeric,
  receipt_notes text
);

CREATE TABLE public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id uuid NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loan_amount numeric NOT NULL,
  interest_rate numeric NOT NULL DEFAULT 0,
  interest_amount numeric NOT NULL DEFAULT 0,
  total_repayable numeric NOT NULL,
  loan_date date NOT NULL,
  loan_purpose text,
  repayment_type text NOT NULL DEFAULT 'flexible'::text,
  repayment_start_date date,
  repayment_due_date date NOT NULL,
  monthly_installment numeric,
  collateral_description text,
  loan_agreement_url text,
  status text NOT NULL DEFAULT 'active'::text,
  remaining_balance numeric NOT NULL,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disbursement_method text,
  disbursement_date date,
  source_bank text,
  source_account_name text,
  source_account_number_masked text,
  destination_bank text,
  destination_account_masked text,
  loan_agreement_number text,
  transaction_reference text,
  disbursement_proof_url text,
  gross_loan_amount numeric,
  processing_fee numeric DEFAULT 0,
  documentation_charges numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  net_disbursed_amount numeric,
  disbursement_status text DEFAULT 'pending'::text,
  allocated_to_expenses numeric DEFAULT 0,
  remaining_unallocated numeric,
  stated_purpose text,
  purpose_compliant boolean DEFAULT true,
  disbursement_notes text
);

CREATE TABLE public.loan_repayments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repayment_date date NOT NULL,
  amount_paid numeric NOT NULL,
  principal_portion numeric NOT NULL DEFAULT 0,
  interest_portion numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  receipt_number text,
  payment_status text NOT NULL DEFAULT 'on_time'::text,
  days_overdue integer DEFAULT 0,
  notes text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profit_distributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  distribution_date date NOT NULL,
  profit_period_start date NOT NULL,
  profit_period_end date NOT NULL,
  total_company_profit numeric NOT NULL,
  investor_share_percentage numeric NOT NULL,
  calculated_amount numeric NOT NULL,
  amount_paid numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  payment_reference text,
  status text NOT NULL DEFAULT 'paid'::text,
  notes text,
  distributed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
  employment_type text NOT NULL DEFAULT 'full_time'::text,
  employment_status text NOT NULL DEFAULT 'active'::text,
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
  UNIQUE (company_id, employee_id_number)
);

CREATE TABLE public.employee_salary_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  month text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  deductions numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.currency_change_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  old_currency text NOT NULL,
  new_currency text NOT NULL,
  old_exchange_rate numeric NOT NULL,
  new_exchange_rate numeric NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dashboard_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text,
  company_id uuid,
  membership_role text,
  is_cipher boolean NOT NULL DEFAULT false,
  view_path text NOT NULL DEFAULT 'full'::text,
  is_anomaly boolean NOT NULL DEFAULT false,
  anomaly_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.duplicate_dismissals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  student_id_a uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_id_b uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  dismissed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, student_id_a, student_id_b)
);

CREATE TABLE public.student_batch_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  from_batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  to_batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  reason text,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  transferred_by uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX rate_limits_key_window_unique ON public.rate_limits (key, window_start);

CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text NOT NULL DEFAULT 'package'::text,
  color text NOT NULL DEFAULT '#6B7280'::text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_code text NOT NULL,
  category text NOT NULL DEFAULT 'other'::text,
  type text NOT NULL DEFAULT 'physical'::text,
  description text,
  price numeric NOT NULL DEFAULT 0,
  purchase_price numeric DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  reorder_level integer DEFAULT 5,
  image_url text,
  status text NOT NULL DEFAULT 'active'::text,
  linked_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  barcode text,
  sku text,
  UNIQUE (company_id, product_code)
);

CREATE TABLE public.product_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  customer_name text,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'paid'::text
);

-- Add FK from revenues to product_sales
ALTER TABLE public.revenues ADD CONSTRAINT revenues_product_sale_id_fkey
  FOREIGN KEY (product_sale_id) REFERENCES public.product_sales(id) ON DELETE CASCADE;

CREATE TABLE public.product_stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reference_id uuid,
  reason text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_sales_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_note_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  color_class text NOT NULL DEFAULT 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'::text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, value)
);

CREATE TABLE public.student_siblings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text,
  age integer,
  occupation_school text,
  contact text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  color_class text NOT NULL DEFAULT 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'::text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, label)
);

CREATE TABLE public.student_tag_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.student_tags(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, tag_id)
);


-- =====================
-- 3. VIEWS
-- =====================

CREATE OR REPLACE VIEW public.companies_public AS
  SELECT id, name, slug, description, logo_url, currency, exchange_rate,
         base_currency, fiscal_year_start_month, created_by, created_at, updated_at
  FROM public.companies;

CREATE OR REPLACE VIEW public.students_safe AS
  SELECT id, name, student_id_number, enrollment_date, billing_start_month,
         admission_fee_total, monthly_fee_amount, status, notes, user_id,
         created_at, updated_at, course_start_month, course_end_month,
         company_id, batch_id, class_grade, roll_number, academic_year,
         section_division, gender
  FROM public.students;


-- =====================
-- 4. INDEXES (non-PK, non-unique-constraint)
-- =====================

CREATE INDEX idx_allocations_account ON public.allocations (expense_account_id);
CREATE INDEX idx_allocations_company ON public.allocations (company_id);
CREATE INDEX idx_allocations_revenue ON public.allocations (revenue_id);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs (company_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs (record_id, company_id);
CREATE INDEX idx_audit_logs_table_action ON public.audit_logs (table_name, action);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs (table_name);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE UNIQUE INDEX idx_batch_enrollments_active_unique ON public.batch_enrollments (student_id, batch_id) WHERE (status = 'active'::text);
CREATE INDEX idx_batch_enrollments_batch ON public.batch_enrollments (batch_id);
CREATE INDEX idx_batch_enrollments_batch_status ON public.batch_enrollments (batch_id, status);
CREATE INDEX idx_batch_enrollments_student ON public.batch_enrollments (student_id, company_id);
CREATE INDEX idx_batches_company_id ON public.batches (company_id);
CREATE INDEX idx_batches_course_id ON public.batches (course_id);
CREATE INDEX idx_batches_created_by ON public.batches (created_by);
CREATE INDEX idx_batches_status ON public.batches (status);
CREATE INDEX idx_company_join_requests_company ON public.company_join_requests (company_id);
CREATE INDEX idx_company_join_requests_user ON public.company_join_requests (user_id);
CREATE INDEX idx_join_requests_company_status ON public.company_join_requests (company_id, status);
CREATE INDEX idx_company_memberships_company ON public.company_memberships (company_id);
CREATE INDEX idx_company_memberships_user ON public.company_memberships (user_id);
CREATE INDEX idx_company_memberships_user_company ON public.company_memberships (user_id, company_id, status);
CREATE INDEX idx_memberships_user_company ON public.company_memberships (user_id, company_id, status);
CREATE INDEX idx_courses_company_id ON public.courses (company_id);
CREATE UNIQUE INDEX idx_courses_company_name_unique ON public.courses (company_id, course_name);
CREATE INDEX idx_courses_course_id ON public.courses (id);
CREATE INDEX idx_dashboard_access_logs_created_at ON public.dashboard_access_logs (created_at DESC);
CREATE INDEX idx_dashboard_access_logs_is_anomaly ON public.dashboard_access_logs (is_anomaly) WHERE (is_anomaly = true);
CREATE INDEX idx_dashboard_access_logs_user_id ON public.dashboard_access_logs (user_id);
CREATE INDEX idx_employee_salary_company ON public.employee_salary_payments (company_id);
CREATE INDEX idx_employee_salary_employee ON public.employee_salary_payments (employee_id);
CREATE INDEX idx_employee_salary_month ON public.employee_salary_payments (month);
CREATE INDEX idx_employees_company_id ON public.employees (company_id);
CREATE INDEX idx_employees_department ON public.employees (department);
CREATE INDEX idx_employees_employee_id_number ON public.employees (employee_id_number);
CREATE INDEX idx_employees_status ON public.employees (employment_status);
CREATE INDEX idx_expense_accounts_company ON public.expense_accounts (company_id);
CREATE INDEX idx_expenses_company ON public.expenses (company_id);
CREATE INDEX idx_expenses_company_date ON public.expenses (company_id, date);
CREATE INDEX idx_expenses_funded_by ON public.expenses (funded_by_type, funded_by_id) WHERE (funded_by_id IS NOT NULL);
CREATE INDEX idx_expenses_user_id ON public.expenses (user_id);
CREATE INDEX idx_investments_company ON public.investments (company_id);
CREATE INDEX idx_investments_receipt_status ON public.investments (receipt_status) WHERE (receipt_status IS NOT NULL);
CREATE INDEX idx_investments_stakeholder ON public.investments (stakeholder_id);
CREATE INDEX idx_investments_status ON public.investments (company_id, status);
CREATE INDEX idx_khata_transfers_company ON public.khata_transfers (company_id);
CREATE INDEX idx_loan_repayments_company ON public.loan_repayments (company_id);
CREATE INDEX idx_loan_repayments_loan ON public.loan_repayments (loan_id);
CREATE INDEX idx_loans_company ON public.loans (company_id);
CREATE INDEX idx_loans_disbursement_status ON public.loans (disbursement_status) WHERE (disbursement_status IS NOT NULL);
CREATE INDEX idx_loans_stakeholder ON public.loans (stakeholder_id);
CREATE INDEX idx_loans_status ON public.loans (company_id, status);
CREATE INDEX idx_product_categories_company ON public.product_categories (company_id);
CREATE INDEX idx_product_sales_company_id ON public.product_sales (company_id);
CREATE INDEX idx_product_sales_product_id ON public.product_sales (product_id);
CREATE INDEX idx_product_sales_sale_date ON public.product_sales (sale_date);
CREATE INDEX idx_product_stock_movements_product_id ON public.product_stock_movements (product_id);
CREATE INDEX idx_products_barcode ON public.products (barcode);
CREATE INDEX idx_products_category ON public.products (category);
CREATE INDEX idx_products_company_id ON public.products (company_id);
CREATE INDEX idx_products_product_code ON public.products (company_id, product_code);
CREATE INDEX idx_products_status ON public.products (status);
CREATE INDEX idx_products_supplier ON public.products (supplier_id);
CREATE INDEX idx_profit_dist_company ON public.profit_distributions (company_id);
CREATE INDEX idx_profit_dist_investment ON public.profit_distributions (investment_id);
CREATE INDEX idx_rate_limits_key_window ON public.rate_limits (key, window_start);
CREATE INDEX idx_registration_email_status ON public.registration_requests (email, status);
CREATE INDEX idx_revenue_sources_company ON public.revenue_sources (company_id);
CREATE INDEX idx_revenues_company ON public.revenues (company_id);
CREATE INDEX idx_revenues_company_date ON public.revenues (company_id, date);
CREATE INDEX idx_revenues_product_sale_id ON public.revenues (product_sale_id);
CREATE INDEX idx_revenues_student_payment ON public.revenues (student_payment_id) WHERE (student_payment_id IS NOT NULL);
CREATE INDEX idx_revenues_user_id ON public.revenues (user_id);
CREATE INDEX idx_stakeholders_company ON public.stakeholders (company_id);
CREATE INDEX idx_stakeholders_status ON public.stakeholders (company_id, status);
CREATE INDEX idx_stakeholders_type ON public.stakeholders (company_id, stakeholder_type);
CREATE INDEX idx_batch_history_company ON public.student_batch_history (company_id);
CREATE INDEX idx_batch_history_student ON public.student_batch_history (student_id, transferred_at DESC);
CREATE INDEX idx_student_payments_company ON public.student_payments (company_id);
CREATE INDEX idx_student_payments_company_student ON public.student_payments (company_id, student_id, payment_date);
CREATE INDEX idx_student_payments_enrollment ON public.student_payments (batch_enrollment_id);
CREATE INDEX idx_student_payments_status_due ON public.student_payments (student_id, company_id, status, due_date);
CREATE INDEX idx_student_payments_student ON public.student_payments (student_id, payment_type);
CREATE INDEX idx_student_payments_user_id ON public.student_payments (user_id);
CREATE INDEX idx_student_sales_notes_category ON public.student_sales_notes (category);
CREATE INDEX idx_student_sales_notes_company ON public.student_sales_notes (company_id);
CREATE INDEX idx_student_sales_notes_created_by ON public.student_sales_notes (created_by);
CREATE INDEX idx_student_sales_notes_student ON public.student_sales_notes (student_id);


-- =====================
-- 5. FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_cipher(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'cipher')
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY
      CASE role WHEN 'cipher' THEN 1 WHEN 'admin' THEN 2 WHEN 'moderator' THEN 3 WHEN 'user' THEN 4 END
    LIMIT 1), 'user'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.get_cipher_user_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(array_agg(user_id), '{}'::uuid[]) FROM public.user_roles WHERE role = 'cipher'
$$;

CREATE OR REPLACE FUNCTION public.get_active_company_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT active_company_id FROM public.user_profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = _user_id AND company_id = _company_id AND role = 'admin' AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = _user_id AND company_id = _company_id AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.is_company_moderator(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND role = 'moderator' AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.is_data_entry_moderator(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND role = 'moderator' AND data_entry_mode = true AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.can_edit_delete(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.can_view_user(_target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.is_cipher(auth.uid()) THEN true
    WHEN public.is_cipher(_target_user_id) THEN false
    ELSE true
  END
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_delete(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND role = 'admin') OR is_cipher(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_student(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_students)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_student(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_students)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_student(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_students)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_payment(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_payments)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_payment(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_payments)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_payment(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_payments)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_batch(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_batches)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_batch(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_batches)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_batch(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_batches)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_revenue(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_revenue(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_revenue(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_expense(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_expense(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_expense(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND deo_finance)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_expense_source(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.company_can_transfer(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND (role = 'admin' OR (role = 'moderator' AND can_transfer)))
$$;

CREATE OR REPLACE FUNCTION public.company_can_manage_employees(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active' AND role = 'admin') OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_add_employee(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_add = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_edit_employee(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_edit = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_delete_employee(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_delete = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_manage_salary(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
    AND (role = 'admin' OR (role = 'moderator' AND mod_employees_salary = true AND data_entry_mode = false))
  ) OR public.is_cipher(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.company_can_view_employees(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.company_can_manage_employees(_company_id, _user_id)
    OR EXISTS (SELECT 1 FROM public.company_memberships WHERE company_id = _company_id AND user_id = _user_id AND status = 'active'
      AND role = 'moderator' AND (can_view_employees = true OR mod_view_employees = true))
$$;

CREATE OR REPLACE FUNCTION public.browse_companies_safe()
RETURNS TABLE(id uuid, name text, slug text, description text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, name, slug, description, logo_url FROM public.companies ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION public.get_company_members_filtered(_company_id uuid)
RETURNS SETOF public.company_memberships
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT cm.* FROM public.company_memberships cm
  WHERE cm.company_id = _company_id AND cm.status = 'active'
    AND (public.is_cipher(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = cm.user_id AND ur.role = 'cipher'))
  ORDER BY cm.joined_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_totals(_company_id uuid)
RETURNS TABLE(total_revenue numeric, total_expenses numeric, total_allocations numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    COALESCE((SELECT SUM(amount) FROM revenues WHERE company_id = _company_id), 0),
    COALESCE((SELECT SUM(amount) FROM expenses WHERE company_id = _company_id), 0),
    COALESCE((SELECT SUM(amount) FROM allocations WHERE company_id = _company_id), 0);
$$;

-- Legacy role-based permission functions (moderator_permissions table)
CREATE OR REPLACE FUNCTION public.can_add_expense(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN RETURN true; END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (SELECT 1 FROM moderator_permissions mp WHERE mp.user_id = _user_id AND mp.can_add_expense = true);
  END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.can_add_expense_source(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN RETURN true; END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (SELECT 1 FROM moderator_permissions mp WHERE mp.user_id = _user_id AND mp.can_add_expense_source = true);
  END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.can_add_revenue(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN RETURN true; END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (SELECT 1 FROM moderator_permissions mp WHERE mp.user_id = _user_id AND mp.can_add_revenue = true);
  END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.can_transfer(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN RETURN true; END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (SELECT 1 FROM moderator_permissions mp WHERE mp.user_id = _user_id AND mp.can_transfer = true);
  END IF;
  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '10 minutes';
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key text, _max_requests integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _window_start timestamptz; _count integer;
BEGIN
  _window_start := date_trunc('minute', now());
  INSERT INTO public.rate_limits (key, window_start, request_count) VALUES (_key, _window_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO _count;
  IF random() < 0.01 THEN PERFORM public.cleanup_rate_limits(); END IF;
  RETURN _count <= _max_requests;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_exchange_rate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.exchange_rate IS NOT NULL AND NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be a positive number';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_student_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'graduated', 'dropout', 'inquiry') THEN
    RAISE EXCEPTION 'Invalid student status: %. Allowed: active, inactive, graduated, dropout, inquiry', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_batch_capacity()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.max_capacity IS NOT NULL AND NEW.max_capacity < 0 THEN
    RAISE EXCEPTION 'Batch max_capacity cannot be negative. Got: %', NEW.max_capacity;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_batch_dates()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_payment_date()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.payment_date::date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Payment date cannot be in the future. Got: %, Today: %', NEW.payment_date, CURRENT_DATE;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_active_company_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.active_company_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.active_company_id IS NOT DISTINCT FROM NEW.active_company_id THEN RETURN NEW; END IF;
  IF public.is_cipher(NEW.user_id) THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_memberships WHERE user_id = NEW.user_id AND company_id = NEW.active_company_id AND status = 'active') THEN
    RAISE EXCEPTION 'Cannot set active company: user is not a member of this company';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

-- NOTE: The handle_new_user trigger must be attached to auth.users:
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Run this separately in Supabase SQL editor after creating the function.

CREATE OR REPLACE FUNCTION public.seed_default_product_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.product_categories (company_id, name, slug, icon, color, is_system, sort_order, user_id) VALUES
    (NEW.id, 'Courses', 'courses', 'graduation-cap', '#8B5CF6', true, 0, NEW.created_by),
    (NEW.id, 'Books', 'books', 'book-open', '#3B82F6', false, 1, NEW.created_by),
    (NEW.id, 'Stationery', 'stationery', 'pencil', '#10B981', false, 2, NEW.created_by),
    (NEW.id, 'Uniforms', 'uniforms', 'shirt', '#F59E0B', false, 3, NEW.created_by),
    (NEW.id, 'Other', 'other', 'package', '#6B7280', false, 4, NEW.created_by);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.get_account_balances(p_company_id uuid)
RETURNS TABLE(id uuid, name text, color text, allocation_percentage numeric, expected_monthly_expense numeric, is_active boolean, total_allocated numeric, total_spent numeric, balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_company_member(auth.uid(), p_company_id) THEN RAISE EXCEPTION 'Not a member of this company'; END IF;
  RETURN QUERY
  SELECT ea.id, ea.name, ea.color, ea.allocation_percentage, ea.expected_monthly_expense, ea.is_active,
    COALESCE(alloc.total, 0::numeric) + COALESCE(tin.total, 0::numeric),
    COALESCE(exp.total, 0::numeric) + COALESCE(tout.total, 0::numeric),
    COALESCE(alloc.total, 0::numeric) + COALESCE(tin.total, 0::numeric) - COALESCE(exp.total, 0::numeric) - COALESCE(tout.total, 0::numeric)
  FROM expense_accounts ea
  LEFT JOIN LATERAL (SELECT sum(a.amount) AS total FROM allocations a WHERE a.expense_account_id = ea.id AND a.company_id = p_company_id) alloc ON true
  LEFT JOIN LATERAL (SELECT sum(e.amount) AS total FROM expenses e WHERE e.expense_account_id = ea.id AND e.company_id = p_company_id) exp ON true
  LEFT JOIN LATERAL (SELECT sum(t.amount) AS total FROM khata_transfers t WHERE t.to_account_id = ea.id AND t.company_id = p_company_id) tin ON true
  LEFT JOIN LATERAL (SELECT sum(t.amount) AS total FROM khata_transfers t WHERE t.from_account_id = ea.id AND t.company_id = p_company_id) tout ON true
  WHERE ea.company_id = p_company_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_revenue_summary(_company_id uuid, _start_date date, _end_date date)
RETURNS TABLE(source_id uuid, source_name text, month text, total_amount numeric, entry_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT r.source_id, COALESCE(rs.name, 'Uncategorized'), to_char(r.date::date, 'YYYY-MM'),
    COALESCE(SUM(r.amount), 0), COUNT(*)
  FROM public.revenues r LEFT JOIN public.revenue_sources rs ON rs.id = r.source_id
  WHERE r.company_id = _company_id AND r.date::date >= _start_date AND r.date::date <= _end_date
  GROUP BY r.source_id, rs.name, to_char(r.date::date, 'YYYY-MM') ORDER BY month, source_name;
$$;

CREATE OR REPLACE FUNCTION public.get_expense_summary(_company_id uuid, _start_date date, _end_date date)
RETURNS TABLE(expense_account_id uuid, account_name text, account_color text, month text, total_amount numeric, entry_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.expense_account_id, COALESCE(ea.name, 'Uncategorized'), COALESCE(ea.color, '#6B7280'),
    to_char(e.date::date, 'YYYY-MM'), COALESCE(SUM(e.amount), 0), COUNT(*)
  FROM public.expenses e LEFT JOIN public.expense_accounts ea ON ea.id = e.expense_account_id
  WHERE e.company_id = _company_id AND e.date::date >= _start_date AND e.date::date <= _end_date
  GROUP BY e.expense_account_id, ea.name, ea.color, to_char(e.date::date, 'YYYY-MM') ORDER BY month, account_name;
$$;

CREATE OR REPLACE FUNCTION public.find_duplicate_students(_company_id uuid)
RETURNS TABLE(student_id uuid, group_id integer, match_criteria text, is_primary boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT s.id, s.enrollment_date,
      regexp_replace(lower(trim(s.name)), '\s+', ' ', 'g') AS norm_name,
      regexp_replace(regexp_replace(s.phone, '[\s\-\(\)\.]', '', 'g'), '^(\+91|0091|91|0)', '') AS norm_phone
    FROM public.students s WHERE s.company_id = _company_id AND s.status != 'inactive' AND s.phone IS NOT NULL AND trim(s.phone) != ''
  ),
  dup_groups AS (
    SELECT n.id AS sid, dense_rank() OVER (ORDER BY n.norm_name, n.norm_phone) AS gid, 'name_phone'::text AS criteria,
      n.enrollment_date, row_number() OVER (PARTITION BY n.norm_name, n.norm_phone ORDER BY n.enrollment_date ASC, n.id ASC) AS rn
    FROM normalized n WHERE (n.norm_name, n.norm_phone) IN (SELECT n2.norm_name, n2.norm_phone FROM normalized n2 GROUP BY n2.norm_name, n2.norm_phone HAVING count(*) > 1)
  ),
  filtered AS (
    SELECT dg.* FROM dup_groups dg
    WHERE NOT EXISTS (SELECT 1 FROM public.duplicate_dismissals dd WHERE dd.company_id = _company_id
      AND ((dd.student_id_a = dg.sid AND dd.student_id_b IN (SELECT dg2.sid FROM dup_groups dg2 WHERE dg2.gid = dg.gid AND dg2.sid != dg.sid))
        OR (dd.student_id_b = dg.sid AND dd.student_id_a IN (SELECT dg2.sid FROM dup_groups dg2 WHERE dg2.gid = dg.gid AND dg2.sid != dg.sid))))
  ),
  valid_groups AS (SELECT f.gid FROM filtered f GROUP BY f.gid HAVING count(*) >= 2)
  SELECT f.sid, f.gid::int, f.criteria, (f.rn = 1) FROM filtered f WHERE f.gid IN (SELECT vg.gid FROM valid_groups vg) ORDER BY f.gid, f.rn;
END; $$;

CREATE OR REPLACE FUNCTION public.check_student_duplicates_single(_company_id uuid, _phone text DEFAULT NULL, _name text DEFAULT NULL, _email text DEFAULT NULL, _aadhar text DEFAULT NULL, _exclude_student_id uuid DEFAULT NULL)
RETURNS TABLE(student_id uuid, student_name text, match_criteria text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_norm_phone text; v_norm_name text;
BEGIN
  v_norm_phone := regexp_replace(regexp_replace(COALESCE(_phone, ''), '[\s\-\(\)\.]', '', 'g'), '^(\+91|0091|91|0)', '');
  v_norm_name := regexp_replace(lower(trim(COALESCE(_name, ''))), '\s+', ' ', 'g');
  IF v_norm_phone != '' AND v_norm_name != '' THEN
    RETURN QUERY SELECT s.id, s.name, 'name_phone'::text FROM public.students s
    WHERE s.company_id = _company_id AND s.status != 'inactive' AND s.phone IS NOT NULL AND trim(s.phone) != ''
      AND (_exclude_student_id IS NULL OR s.id != _exclude_student_id)
      AND regexp_replace(lower(trim(s.name)), '\s+', ' ', 'g') = v_norm_name
      AND regexp_replace(regexp_replace(s.phone, '[\s\-\(\)\.]', '', 'g'), '^(\+91|0091|91|0)', '') = v_norm_phone;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_financial_consistency(_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_orphan_count integer; v_duplicate_count integer; v_mismatch_count integer; v_result jsonb;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count FROM public.student_payments sp WHERE sp.company_id = _company_id AND sp.status = 'paid' AND NOT EXISTS (SELECT 1 FROM public.revenues r WHERE r.student_payment_id = sp.id);
  SELECT COALESCE(SUM(dup_count - 1), 0) INTO v_duplicate_count FROM (SELECT student_payment_id, COUNT(*) AS dup_count FROM public.revenues WHERE company_id = _company_id AND student_payment_id IS NOT NULL GROUP BY student_payment_id HAVING COUNT(*) > 1) dupes;
  SELECT COUNT(*) INTO v_mismatch_count FROM public.revenues r JOIN public.student_payments sp ON sp.id = r.student_payment_id WHERE r.company_id = _company_id AND r.student_payment_id IS NOT NULL AND r.amount IS DISTINCT FROM sp.amount;
  v_result := jsonb_build_object('company_id', _company_id, 'orphan_payments', v_orphan_count, 'duplicate_revenues', v_duplicate_count, 'amount_mismatches', v_mismatch_count, 'checked_at', now());
  IF v_orphan_count > 0 OR v_duplicate_count > 0 OR v_mismatch_count > 0 THEN
    INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, new_data) VALUES (_company_id, '00000000-0000-0000-0000-000000000000'::uuid, 'system@consistency-check', 'revenues', _company_id::text, 'financial_consistency_warning', v_result);
  END IF;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_student_payment_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_student RECORD; v_total_paid NUMERIC; v_max_allowed NUMERIC; v_month TEXT; v_month_paid NUMERIC; v_batch_admission_fee NUMERIC := 0; v_batch_monthly_fee NUMERIC := 0; v_effective_fee NUMERIC;
BEGIN
  IF NEW.status = 'unpaid' THEN RETURN NEW; END IF;
  SELECT admission_fee_total, monthly_fee_amount, batch_id INTO v_student FROM public.students WHERE id = NEW.student_id;
  IF v_student.batch_id IS NOT NULL THEN
    SELECT COALESCE(default_admission_fee, 0), COALESCE(default_monthly_fee, 0) INTO v_batch_admission_fee, v_batch_monthly_fee FROM public.batches WHERE id = v_student.batch_id;
  END IF;
  IF NEW.payment_type = 'admission' THEN
    v_max_allowed := GREATEST(COALESCE(v_student.admission_fee_total, 0), v_batch_admission_fee);
    IF v_max_allowed > 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM public.student_payments WHERE student_id = NEW.student_id AND payment_type = 'admission' AND status NOT IN ('cancelled', 'unpaid') AND id IS DISTINCT FROM NEW.id AND (NEW.batch_enrollment_id IS NULL OR batch_enrollment_id = NEW.batch_enrollment_id);
      IF v_total_paid + NEW.amount > v_max_allowed THEN RAISE EXCEPTION 'Overpayment: admission fee exceeded. Maximum allowed: %. Already paid: %.', (v_max_allowed - v_total_paid), v_total_paid; END IF;
    END IF;
  END IF;
  IF NEW.payment_type = 'monthly' AND NEW.months_covered IS NOT NULL AND array_length(NEW.months_covered, 1) > 0 THEN
    v_effective_fee := GREATEST(COALESCE(v_student.monthly_fee_amount, 0), v_batch_monthly_fee);
    IF v_effective_fee > 0 THEN
      FOREACH v_month IN ARRAY NEW.months_covered LOOP
        SELECT COALESCE(SUM(sp.amount / GREATEST(array_length(sp.months_covered, 1), 1)), 0) INTO v_month_paid FROM public.student_payments sp WHERE sp.student_id = NEW.student_id AND sp.payment_type = 'monthly' AND sp.status NOT IN ('cancelled', 'unpaid') AND sp.months_covered IS NOT NULL AND v_month = ANY(sp.months_covered) AND sp.id IS DISTINCT FROM NEW.id AND (NEW.batch_enrollment_id IS NULL OR sp.batch_enrollment_id = NEW.batch_enrollment_id);
        IF v_month_paid + (NEW.amount / array_length(NEW.months_covered, 1)) > v_effective_fee THEN RAISE EXCEPTION 'Overpayment: monthly fee for % exceeded. Maximum allowed: %. Already paid: %.', v_month, (v_effective_fee - v_month_paid), v_month_paid; END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_student_payment_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_source_id uuid; v_revenue_id uuid; v_student_name text; v_desc text; v_acc RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'INSERT' THEN IF NEW.status != 'paid' THEN RETURN NEW; END IF; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'paid' AND NEW.status != 'paid' THEN RETURN NEW; END IF;
    IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
      SELECT id INTO v_revenue_id FROM public.revenues WHERE student_payment_id = NEW.id AND is_system_generated = true;
      IF v_revenue_id IS NOT NULL THEN DELETE FROM public.allocations WHERE revenue_id = v_revenue_id; DELETE FROM public.revenues WHERE id = v_revenue_id; END IF;
      RETURN NEW;
    END IF;
  END IF;
  SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;
  IF NEW.payment_type = 'admission' THEN v_desc := 'Admission fee - ' || COALESCE(v_student_name, 'Student');
  ELSE v_desc := 'Monthly tuition'; IF NEW.months_covered IS NOT NULL AND array_length(NEW.months_covered, 1) > 0 THEN v_desc := v_desc || ' (' || array_to_string(NEW.months_covered, ', ') || ')'; END IF; v_desc := v_desc || ' - ' || COALESCE(v_student_name, 'Student');
  END IF;
  IF NEW.source_id IS NOT NULL THEN v_source_id := NEW.source_id;
  ELSE SELECT id INTO v_source_id FROM public.revenue_sources WHERE name = 'Student Fees' AND company_id = NEW.company_id LIMIT 1;
    IF v_source_id IS NULL THEN INSERT INTO public.revenue_sources (name, user_id, company_id) VALUES ('Student Fees', NEW.user_id, NEW.company_id) RETURNING id INTO v_source_id; END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, student_payment_id, is_system_generated) VALUES (NEW.amount, NEW.payment_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true) RETURNING id INTO v_revenue_id;
    FOR v_acc IN SELECT id, allocation_percentage FROM public.expense_accounts WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0 LOOP
      INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount) VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
    END LOOP;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT id INTO v_revenue_id FROM public.revenues WHERE student_payment_id = NEW.id AND is_system_generated = true;
    IF v_revenue_id IS NULL THEN
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, student_payment_id, is_system_generated) VALUES (NEW.amount, NEW.payment_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true) RETURNING id INTO v_revenue_id;
      FOR v_acc IN SELECT id, allocation_percentage FROM public.expense_accounts WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0 LOOP
        INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount) VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
      END LOOP;
    ELSE
      UPDATE public.revenues SET amount = NEW.amount, date = NEW.payment_date, source_id = v_source_id, description = v_desc, updated_at = now() WHERE id = v_revenue_id;
      IF NEW.amount IS DISTINCT FROM OLD.amount THEN
        DELETE FROM public.allocations WHERE revenue_id = v_revenue_id;
        FOR v_acc IN SELECT id, allocation_percentage FROM public.expense_accounts WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0 LOOP
          INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount) VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_expense_fund_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.funded_by_type = 'investment' AND OLD.funded_by_id IS NOT NULL THEN UPDATE public.investments SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount), remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount WHERE id = OLD.funded_by_id;
    ELSIF OLD.funded_by_type = 'loan' AND OLD.funded_by_id IS NOT NULL THEN UPDATE public.loans SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount), remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount WHERE id = OLD.funded_by_id; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.funded_by_type = 'investment' AND NEW.funded_by_id IS NOT NULL THEN UPDATE public.investments SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount, remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount) WHERE id = NEW.funded_by_id;
    ELSIF NEW.funded_by_type = 'loan' AND NEW.funded_by_id IS NOT NULL THEN UPDATE public.loans SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount, remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount) WHERE id = NEW.funded_by_id;
      IF NEW.matches_loan_purpose = false THEN UPDATE public.loans SET purpose_compliant = false WHERE id = NEW.funded_by_id; END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.funded_by_type = 'investment' AND OLD.funded_by_id IS NOT NULL THEN UPDATE public.investments SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount), remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount WHERE id = OLD.funded_by_id;
    ELSIF OLD.funded_by_type = 'loan' AND OLD.funded_by_id IS NOT NULL THEN UPDATE public.loans SET allocated_to_expenses = GREATEST(0, COALESCE(allocated_to_expenses, 0) - OLD.amount), remaining_unallocated = COALESCE(remaining_unallocated, 0) + OLD.amount WHERE id = OLD.funded_by_id; END IF;
    IF NEW.funded_by_type = 'investment' AND NEW.funded_by_id IS NOT NULL THEN UPDATE public.investments SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount, remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount) WHERE id = NEW.funded_by_id;
    ELSIF NEW.funded_by_type = 'loan' AND NEW.funded_by_id IS NOT NULL THEN UPDATE public.loans SET allocated_to_expenses = COALESCE(allocated_to_expenses, 0) + NEW.amount, remaining_unallocated = GREATEST(0, COALESCE(remaining_unallocated, 0) - NEW.amount) WHERE id = NEW.funded_by_id;
      IF NEW.matches_loan_purpose = false THEN UPDATE public.loans SET purpose_compliant = false WHERE id = NEW.funded_by_id; END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_loan_repayment_interest_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_expense_account_id uuid; v_user_id uuid;
BEGIN
  IF NEW.interest_portion IS NULL OR NEW.interest_portion <= 0 THEN RETURN NEW; END IF;
  v_user_id := NEW.recorded_by;
  SELECT id INTO v_expense_account_id FROM public.expense_accounts WHERE company_id = NEW.company_id AND name = 'Loan Interest' LIMIT 1;
  IF v_expense_account_id IS NULL THEN INSERT INTO public.expense_accounts (company_id, user_id, name, color, allocation_percentage, is_active) VALUES (NEW.company_id, v_user_id, 'Loan Interest', '#EF4444', 0, true) RETURNING id INTO v_expense_account_id; END IF;
  INSERT INTO public.expenses (company_id, user_id, expense_account_id, amount, date, description) VALUES (NEW.company_id, v_user_id, v_expense_account_id, NEW.interest_portion, NEW.repayment_date, 'Loan interest - Repayment #' || COALESCE(NEW.receipt_number, NEW.id::text));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_auto_create_salary_expense()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_employee_name TEXT; v_expense_account_id UUID; v_description TEXT;
BEGIN
  SELECT full_name INTO v_employee_name FROM public.employees WHERE id = NEW.employee_id;
  SELECT id INTO v_expense_account_id FROM public.expense_accounts WHERE company_id = NEW.company_id AND name ILIKE '%Salary%' ORDER BY created_at ASC LIMIT 1;
  IF v_expense_account_id IS NULL THEN RETURN NEW; END IF;
  v_description := 'Salary - ' || COALESCE(v_employee_name, 'Unknown') || ' - ' || NEW.month || ' [SALARY:' || NEW.id || ']';
  IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE description LIKE '%[SALARY:' || NEW.id || ']%') THEN
    INSERT INTO public.expenses (company_id, user_id, expense_account_id, amount, date, description) VALUES (NEW.company_id, NEW.user_id, v_expense_account_id, NEW.net_amount, NEW.payment_date, v_description);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_enrollments_on_batch_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_student RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.batch_enrollments SET status = 'completed', updated_at = now() WHERE batch_id = NEW.id AND status = 'active';
    FOR v_student IN SELECT DISTINCT student_id FROM public.batch_enrollments WHERE batch_id = NEW.id AND company_id = NEW.company_id LOOP
      PERFORM check_and_graduate_student(v_student.student_id, NEW.company_id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.check_and_graduate_student(p_student_id uuid, p_company_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_has_active INTEGER; v_has_unpaid_completed INTEGER; v_expected NUMERIC; v_paid NUMERIC; rec RECORD;
BEGIN
  SELECT COUNT(*) INTO v_has_active FROM batch_enrollments WHERE student_id = p_student_id AND company_id = p_company_id AND status = 'active';
  IF v_has_active > 0 THEN RETURN FALSE; END IF;
  v_has_unpaid_completed := 0;
  FOR rec IN SELECT be.id AS enrollment_id, COALESCE(NULLIF(s.admission_fee_total, 0), b.default_admission_fee, 0) AS eff_admission, COALESCE(NULLIF(s.monthly_fee_amount, 0), b.default_monthly_fee, 0) AS eff_monthly, COALESCE(b.course_duration_months, 0) AS duration
    FROM batch_enrollments be JOIN students s ON s.id = be.student_id JOIN batches b ON b.id = be.batch_id WHERE be.student_id = p_student_id AND be.company_id = p_company_id AND be.status = 'completed'
  LOOP
    v_expected := rec.eff_admission + (rec.eff_monthly * rec.duration);
    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM student_payments WHERE batch_enrollment_id = rec.enrollment_id AND company_id = p_company_id;
    IF v_paid < v_expected AND v_expected > 0 THEN v_has_unpaid_completed := v_has_unpaid_completed + 1; END IF;
  END LOOP;
  IF v_has_unpaid_completed = 0 THEN UPDATE students SET status = 'graduated' WHERE id = p_student_id AND company_id = p_company_id AND status != 'graduated'; RETURN TRUE; END IF;
  RETURN FALSE;
END; $$;

CREATE OR REPLACE FUNCTION public.check_graduation_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_enrollment_status TEXT; v_batch_status TEXT;
BEGIN
  IF NEW.batch_enrollment_id IS NULL THEN RETURN NEW; END IF;
  SELECT be.status, b.status INTO v_enrollment_status, v_batch_status FROM batch_enrollments be JOIN batches b ON b.id = be.batch_id WHERE be.id = NEW.batch_enrollment_id;
  IF v_batch_status = 'completed' OR v_enrollment_status = 'completed' THEN PERFORM check_and_graduate_student(NEW.student_id, NEW.company_id); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_product_sale_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_source_id uuid; v_revenue_id uuid; v_product_name text; v_desc text; v_acc RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.products SET stock_quantity = stock_quantity + OLD.quantity WHERE id = OLD.product_id AND type = 'physical';
    INSERT INTO public.product_stock_movements (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, reason, user_id)
    SELECT OLD.company_id, OLD.product_id, 'sale_reversal', OLD.quantity, p.stock_quantity - OLD.quantity, p.stock_quantity, OLD.id, 'Sale deleted', OLD.user_id FROM public.products p WHERE p.id = OLD.product_id;
    RETURN OLD;
  END IF;
  SELECT product_name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
  v_desc := 'Product sale - ' || COALESCE(v_product_name, 'Product') || ' x' || NEW.quantity;
  IF NEW.source_id IS NOT NULL THEN v_source_id := NEW.source_id;
  ELSE SELECT id INTO v_source_id FROM public.revenue_sources WHERE name = 'Product Sales' AND company_id = NEW.company_id LIMIT 1;
    IF v_source_id IS NULL THEN INSERT INTO public.revenue_sources (name, user_id, company_id) VALUES ('Product Sales', NEW.user_id, NEW.company_id) RETURNING id INTO v_source_id; END IF;
  END IF;
  IF TG_OP = 'INSERT' THEN
    DECLARE v_product RECORD; v_rows_updated integer;
    BEGIN
      SELECT type, stock_quantity INTO v_product FROM public.products WHERE id = NEW.product_id;
      IF v_product.type = 'physical' THEN
        UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND stock_quantity >= NEW.quantity;
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        IF v_rows_updated = 0 THEN RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_product.stock_quantity, NEW.quantity; END IF;
        INSERT INTO public.product_stock_movements (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, user_id) VALUES (NEW.company_id, NEW.product_id, 'sale', NEW.quantity, v_product.stock_quantity, v_product.stock_quantity - NEW.quantity, NEW.id, NEW.user_id);
      END IF;
    END;
    IF NEW.payment_status = 'paid' THEN
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, product_sale_id, is_system_generated) VALUES (NEW.total_amount, NEW.sale_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true) RETURNING id INTO v_revenue_id;
      FOR v_acc IN SELECT id, allocation_percentage FROM public.expense_accounts WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0 LOOP
        INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount) VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
      END LOOP;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, product_sale_id, is_system_generated) VALUES (NEW.total_amount, NEW.sale_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true) RETURNING id INTO v_revenue_id;
      FOR v_acc IN SELECT id, allocation_percentage FROM public.expense_accounts WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0 LOOP
        INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount) VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
      END LOOP;
    ELSIF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN DELETE FROM public.revenues WHERE product_sale_id = NEW.id;
    ELSIF NEW.payment_status = 'paid' THEN
      UPDATE public.revenues SET amount = NEW.total_amount, date = NEW.sale_date, description = v_desc, updated_at = now() WHERE product_sale_id = NEW.id;
      IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
        SELECT id INTO v_revenue_id FROM public.revenues WHERE product_sale_id = NEW.id;
        IF v_revenue_id IS NOT NULL THEN DELETE FROM public.allocations WHERE revenue_id = v_revenue_id;
          FOR v_acc IN SELECT id, allocation_percentage FROM public.expense_accounts WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0 LOOP
            INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount) VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
          END LOOP;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_student_from_batch(p_student_id uuid, p_batch_id uuid, p_company_id uuid, p_user_id uuid, p_user_email text DEFAULT NULL)
RETURNS TABLE(deleted_payment_total numeric, deleted_payment_count integer, status_changed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_enrollment_id UUID; v_total NUMERIC := 0; v_count INTEGER := 0; v_paid_ids UUID[]; v_remaining INTEGER := 0; v_status_changed BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_enrollment_id FROM batch_enrollments WHERE student_id = p_student_id AND batch_id = p_batch_id AND company_id = p_company_id AND status = 'active' LIMIT 1;
  IF v_enrollment_id IS NULL THEN RAISE EXCEPTION 'No active enrollment found for this student in this batch'; END IF;
  SELECT COALESCE(SUM(amount), 0), COUNT(*), COALESCE(array_agg(id), '{}') INTO v_total, v_count, v_paid_ids FROM student_payments WHERE batch_enrollment_id = v_enrollment_id AND company_id = p_company_id;
  IF array_length(v_paid_ids, 1) > 0 THEN DELETE FROM revenues WHERE student_payment_id = ANY(v_paid_ids) AND company_id = p_company_id; END IF;
  DELETE FROM student_payments WHERE batch_enrollment_id = v_enrollment_id AND company_id = p_company_id;
  DELETE FROM batch_enrollments WHERE id = v_enrollment_id;
  UPDATE students SET batch_id = NULL WHERE id = p_student_id AND batch_id = p_batch_id;
  SELECT COUNT(*) INTO v_remaining FROM batch_enrollments WHERE student_id = p_student_id AND company_id = p_company_id AND status = 'active';
  IF v_remaining = 0 THEN UPDATE students SET status = 'inquiry' WHERE id = p_student_id AND company_id = p_company_id; v_status_changed := TRUE; END IF;
  INSERT INTO audit_logs (company_id, user_id, user_email, table_name, action, record_id, old_data, new_data) VALUES (p_company_id, p_user_id, p_user_email, 'batch_enrollments', 'remove_from_batch', v_enrollment_id, jsonb_build_object('student_id', p_student_id, 'batch_id', p_batch_id, 'enrollment_id', v_enrollment_id), jsonb_build_object('deleted_payment_total', v_total, 'deleted_payment_count', v_count, 'status_changed_to_inquiry', v_status_changed));
  RETURN QUERY SELECT v_total, v_count, v_status_changed;
END; $$;

-- Audit trigger functions
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_company_id uuid; v_user_id uuid; v_user_email text; v_record_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'revenues' THEN IF TG_OP = 'DELETE' AND OLD.student_payment_id IS NOT NULL THEN RETURN OLD; ELSIF TG_OP IN ('INSERT', 'UPDATE') AND NEW.student_payment_id IS NOT NULL THEN RETURN NEW; END IF; END IF;
  IF TG_TABLE_NAME = 'allocations' THEN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
  IF TG_OP = 'DELETE' THEN v_company_id := OLD.company_id; v_user_id := OLD.user_id; v_record_id := OLD.id;
  ELSE v_company_id := NEW.company_id; v_user_id := NEW.user_id; v_record_id := NEW.id; END IF;
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;
  BEGIN INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
    VALUES (v_company_id, v_user_id, v_user_email, TG_TABLE_NAME, v_record_id, TG_OP,
      CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END, CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'audit_log_trigger failed for %.% on %: %', TG_TABLE_NAME, v_record_id, TG_OP, SQLERRM; END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_companies_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_user_email text; v_record_id uuid; v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_company_id := OLD.id; v_record_id := OLD.id; v_user_id := COALESCE(auth.uid(), OLD.created_by);
  ELSE v_company_id := NEW.id; v_record_id := NEW.id; v_user_id := COALESCE(auth.uid(), NEW.created_by); END IF;
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;
  INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data)
  VALUES (v_company_id, v_user_id, v_user_email, 'companies', v_record_id, TG_OP, CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END, CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_moderator_permissions_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_user_email text; v_record_id uuid; v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_user_id := OLD.user_id; v_record_id := OLD.id; ELSE v_user_id := NEW.user_id; v_record_id := NEW.id; END IF;
  SELECT active_company_id INTO v_company_id FROM public.user_profiles WHERE user_id = COALESCE(auth.uid(), v_user_id) LIMIT 1;
  IF v_company_id IS NULL THEN SELECT company_id INTO v_company_id FROM public.company_memberships WHERE user_id = v_user_id AND status = 'active' LIMIT 1; END IF;
  IF v_company_id IS NULL THEN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = COALESCE(auth.uid(), v_user_id) LIMIT 1;
  BEGIN INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data) VALUES (v_company_id, COALESCE(auth.uid(), v_user_id), v_user_email, 'moderator_permissions', v_record_id, TG_OP, CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END, CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'audit_moderator_permissions_trigger failed: %', SQLERRM; END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_record_id uuid; v_user_email text; v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_user_id := OLD.user_id; v_record_id := OLD.id; ELSE v_user_id := NEW.user_id; v_record_id := NEW.id; END IF;
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT active_company_id INTO v_company_id FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_company_id IS NULL THEN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
  BEGIN INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data) VALUES (v_company_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), v_user_email, 'user_roles', v_record_id, TG_OP, CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END, CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'audit_role_change failed: %', SQLERRM; END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_student_batch_history_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id uuid; v_user_email text; v_record_id uuid; v_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_user_id := OLD.transferred_by; v_record_id := OLD.id; v_company_id := OLD.company_id;
  ELSE v_user_id := NEW.transferred_by; v_record_id := NEW.id; v_company_id := NEW.company_id; END IF;
  SELECT email INTO v_user_email FROM public.user_profiles WHERE user_id = v_user_id LIMIT 1;
  INSERT INTO public.audit_logs (company_id, user_id, user_email, table_name, record_id, action, old_data, new_data) VALUES (v_company_id, v_user_id, v_user_email, 'student_batch_history', v_record_id, TG_OP, CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END, CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END; $$;


-- =====================
-- 6. TRIGGERS
-- =====================

-- Updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_accounts_updated_at BEFORE UPDATE ON public.expense_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_moderator_permissions_updated_at BEFORE UPDATE ON public.moderator_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_sales_notes_updated_at BEFORE UPDATE ON public.student_sales_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Validation triggers
CREATE TRIGGER validate_company_exchange_rate BEFORE INSERT OR UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION validate_exchange_rate();
CREATE TRIGGER validate_student_status_trigger BEFORE INSERT OR UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION validate_student_status();
CREATE TRIGGER trg_validate_batch_capacity BEFORE INSERT OR UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION validate_batch_capacity();
CREATE TRIGGER validate_batch_dates_trigger BEFORE INSERT OR UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION validate_batch_dates();
CREATE TRIGGER validate_payment_date_trigger BEFORE INSERT OR UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION validate_payment_date();
CREATE TRIGGER trg_validate_student_payment_amount BEFORE INSERT OR UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION validate_student_payment_amount();
CREATE TRIGGER trg_validate_active_company BEFORE UPDATE OF active_company_id ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION validate_active_company_membership();

-- Business logic triggers
CREATE TRIGGER seed_categories_on_company_create AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION seed_default_product_categories();
CREATE TRIGGER sync_enrollments_on_batch_completion AFTER UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION sync_enrollments_on_batch_completion();
CREATE TRIGGER trg_sync_student_payment_revenue AFTER INSERT OR DELETE OR UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION sync_student_payment_revenue();
CREATE TRIGGER trg_check_graduation_on_payment AFTER INSERT ON public.student_payments FOR EACH ROW EXECUTE FUNCTION check_graduation_on_payment();
CREATE TRIGGER sync_expense_fund_allocation_trigger AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION sync_expense_fund_allocation();
CREATE TRIGGER sync_loan_repayment_interest_expense_trigger AFTER INSERT ON public.loan_repayments FOR EACH ROW EXECUTE FUNCTION sync_loan_repayment_interest_expense();
CREATE TRIGGER trg_auto_create_salary_expense AFTER INSERT ON public.employee_salary_payments FOR EACH ROW EXECUTE FUNCTION fn_auto_create_salary_expense();
CREATE TRIGGER sync_product_sale_revenue_trigger AFTER INSERT OR DELETE OR UPDATE ON public.product_sales FOR EACH ROW EXECUTE FUNCTION sync_product_sale_revenue();

-- Audit triggers
CREATE TRIGGER audit_batches AFTER INSERT OR DELETE OR UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_companies AFTER INSERT OR DELETE OR UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION audit_companies_trigger();
CREATE TRIGGER audit_company_join_requests AFTER INSERT OR DELETE OR UPDATE ON public.company_join_requests FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_company_memberships AFTER INSERT OR DELETE OR UPDATE ON public.company_memberships FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_courses AFTER INSERT OR DELETE OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_employees_trigger AFTER INSERT OR DELETE OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_employee_salary_trigger AFTER INSERT OR DELETE OR UPDATE ON public.employee_salary_payments FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_expense_accounts AFTER INSERT OR DELETE OR UPDATE ON public.expense_accounts FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_expenses AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_khata_transfers AFTER INSERT OR DELETE OR UPDATE ON public.khata_transfers FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_moderator_permissions AFTER INSERT OR DELETE OR UPDATE ON public.moderator_permissions FOR EACH ROW EXECUTE FUNCTION audit_moderator_permissions_trigger();
CREATE TRIGGER audit_product_categories AFTER INSERT OR DELETE OR UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_product_sales_trigger AFTER INSERT OR DELETE OR UPDATE ON public.product_sales FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_product_stock_movements_trigger AFTER INSERT OR DELETE OR UPDATE ON public.product_stock_movements FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_products_trigger AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_revenue_sources AFTER INSERT OR DELETE OR UPDATE ON public.revenue_sources FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_revenues AFTER INSERT OR DELETE OR UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_student_batch_history AFTER INSERT OR DELETE OR UPDATE ON public.student_batch_history FOR EACH ROW EXECUTE FUNCTION audit_student_batch_history_trigger();
CREATE TRIGGER audit_student_payments AFTER INSERT OR DELETE OR UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_students AFTER INSERT OR DELETE OR UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_suppliers AFTER INSERT OR DELETE OR UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
CREATE TRIGGER audit_user_roles_changes AFTER INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION audit_role_change();


-- =====================
-- 7. ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_creation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_fee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_note_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sales_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_siblings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- === allocations ===
CREATE POLICY "Admin/Cipher can insert allocations" ON public.allocations FOR INSERT TO authenticated WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id) AND (user_id = auth.uid()));
CREATE POLICY "Admins can delete allocations" ON public.allocations FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));
CREATE POLICY "Admins can update allocations" ON public.allocations FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));
CREATE POLICY "Company members can view allocations" ON public.allocations FOR SELECT TO authenticated USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id) AND (NOT is_data_entry_moderator(company_id, auth.uid())));

-- === audit_logs ===
CREATE POLICY "Authenticated members can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) AND is_company_member(auth.uid(), company_id));
CREATE POLICY "Company admins can view audit logs" ON public.audit_logs FOR SELECT USING ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));

-- === batch_enrollments ===
CREATE POLICY "Company members can view batch enrollments" ON public.batch_enrollments FOR SELECT USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id) AND ((NOT is_data_entry_moderator(company_id, auth.uid())) OR (created_by = auth.uid())));
CREATE POLICY "Authorized users can insert batch enrollments" ON public.batch_enrollments FOR INSERT WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()) OR company_can_add_batch(company_id, auth.uid())));
CREATE POLICY "Authorized users can update batch enrollments" ON public.batch_enrollments FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()) OR company_can_edit_batch(company_id, auth.uid())));
CREATE POLICY "Authorized users can delete batch enrollments" ON public.batch_enrollments FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()) OR company_can_delete_batch(company_id, auth.uid())));

-- === batches ===
CREATE POLICY "Company members can view batches" ON public.batches FOR SELECT TO authenticated USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id) AND (NOT is_data_entry_moderator(company_id, auth.uid())));
CREATE POLICY "company_can_add_batch" ON public.batches FOR INSERT TO authenticated WITH CHECK (company_can_add_batch(company_id, auth.uid()));
CREATE POLICY "company_can_edit_batch" ON public.batches FOR UPDATE TO authenticated USING (company_can_edit_batch(company_id, auth.uid()));
CREATE POLICY "company_can_delete_batch" ON public.batches FOR DELETE TO authenticated USING (company_can_delete_batch(company_id, auth.uid()));

-- === companies ===
CREATE POLICY "Cipher and admins can view companies" ON public.companies FOR SELECT USING (is_cipher(auth.uid()) OR is_company_admin(auth.uid(), id));
CREATE POLICY "Members can browse their companies" ON public.companies FOR SELECT TO authenticated USING (is_company_member(auth.uid(), id) OR is_cipher(auth.uid()));
CREATE POLICY "Cipher can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()));
CREATE POLICY "Cipher or company admin can update company" ON public.companies FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) OR is_company_admin(auth.uid(), id));
CREATE POLICY "Cipher can delete companies" ON public.companies FOR DELETE TO authenticated USING (is_cipher(auth.uid()));

-- === company_creation_requests ===
CREATE POLICY "Users can insert own creation requests" ON public.company_creation_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own creation requests" ON public.company_creation_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Cipher can view all creation requests" ON public.company_creation_requests FOR SELECT USING (is_cipher(auth.uid()));
CREATE POLICY "Cipher can update creation requests" ON public.company_creation_requests FOR UPDATE USING (is_cipher(auth.uid()));

-- === company_join_requests ===
CREATE POLICY "Authenticated users can create join requests" ON public.company_join_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own join requests" ON public.company_join_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Company admins can view join requests" ON public.company_join_requests FOR SELECT TO authenticated USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Company admins can update join requests" ON public.company_join_requests FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- === company_memberships ===
CREATE POLICY "Users can view own memberships" ON public.company_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Company admins can view company memberships" ON public.company_memberships FOR SELECT TO authenticated USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Company moderators can view company memberships" ON public.company_memberships FOR SELECT TO authenticated USING (is_company_moderator(company_id, auth.uid()));
CREATE POLICY "Company admins can insert memberships" ON public.company_memberships FOR INSERT TO authenticated WITH CHECK (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Company admins can update memberships" ON public.company_memberships FOR UPDATE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Company admins can delete memberships" ON public.company_memberships FOR DELETE TO authenticated USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- === courses ===
CREATE POLICY "Company members can view courses" ON public.courses FOR SELECT USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id) AND (NOT is_data_entry_moderator(company_id, auth.uid())));
CREATE POLICY "Authorized users can insert courses" ON public.courses FOR INSERT WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));
CREATE POLICY "Authorized users can update courses" ON public.courses FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));
CREATE POLICY "Authorized users can delete courses" ON public.courses FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid())));

-- === currency_change_logs ===
CREATE POLICY "Company admins can insert currency logs" ON public.currency_change_logs FOR INSERT WITH CHECK (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Company admins can view currency logs" ON public.currency_change_logs FOR SELECT USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- === dashboard_access_logs ===
CREATE POLICY "Users can insert own access logs" ON public.dashboard_access_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Ciphers can view all access logs" ON public.dashboard_access_logs FOR SELECT USING (is_cipher(auth.uid()));

-- === duplicate_dismissals ===
CREATE POLICY "Admin/Cipher can select dismissals" ON public.duplicate_dismissals FOR SELECT USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Admin/Cipher can insert dismissals" ON public.duplicate_dismissals FOR INSERT WITH CHECK (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));
CREATE POLICY "Admin/Cipher can delete dismissals" ON public.duplicate_dismissals FOR DELETE USING (is_company_admin(auth.uid(), company_id) OR is_cipher(auth.uid()));

-- === employees ===
CREATE POLICY "Company can view employees" ON public.employees FOR SELECT USING (company_can_view_employees(company_id, auth.uid()));
CREATE POLICY "Admin/Cipher can insert employees" ON public.employees FOR INSERT WITH CHECK (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "Admin/Cipher can update employees" ON public.employees FOR UPDATE USING (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "Admin/Cipher can delete employees" ON public.employees FOR DELETE USING (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "employees_insert" ON public.employees FOR INSERT WITH CHECK (company_can_add_employee(company_id, auth.uid()));
CREATE POLICY "employees_update" ON public.employees FOR UPDATE USING (company_can_edit_employee(company_id, auth.uid()));
CREATE POLICY "employees_delete" ON public.employees FOR DELETE USING (company_can_delete_employee(company_id, auth.uid()));

-- === employee_salary_payments ===
CREATE POLICY "Admin/Cipher can view salary payments" ON public.employee_salary_payments FOR SELECT USING (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "Admin/Cipher can insert salary payments" ON public.employee_salary_payments FOR INSERT WITH CHECK (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "Admin/Cipher can update salary payments" ON public.employee_salary_payments FOR UPDATE USING (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "Admin/Cipher can delete salary payments" ON public.employee_salary_payments FOR DELETE USING (company_can_manage_employees(company_id, auth.uid()));
CREATE POLICY "salary_insert" ON public.employee_salary_payments FOR INSERT WITH CHECK (company_can_manage_salary(company_id, auth.uid()));
CREATE POLICY "salary_update" ON public.employee_salary_payments FOR UPDATE USING (company_can_manage_salary(company_id, auth.uid()));
CREATE POLICY "salary_delete" ON public.employee_salary_payments FOR DELETE USING (company_can_manage_salary(company_id, auth.uid()));

-- === expense_accounts ===
CREATE POLICY "Company members can view expense accounts" ON public.expense_accounts FOR SELECT TO authenticated USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id));
CREATE POLICY "Admin/Cipher can insert expense accounts" ON public.expense_accounts FOR INSERT TO authenticated WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_add_expense_source(company_id, auth.uid()) AND (user_id = auth.uid()));
CREATE POLICY "Admins can update expense accounts" ON public.expense_accounts FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));
CREATE POLICY "Admins can delete expense accounts" ON public.expense_accounts FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

-- === expenses ===
CREATE POLICY "Company members can view expenses" ON public.expenses FOR SELECT TO authenticated USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id) AND ((NOT is_data_entry_moderator(company_id, auth.uid())) OR (user_id = auth.uid())));
CREATE POLICY "company_can_add_expense" ON public.expenses FOR INSERT TO authenticated WITH CHECK (company_can_add_expense(company_id, auth.uid()) AND (user_id = auth.uid()));
CREATE POLICY "company_can_edit_expense" ON public.expenses FOR UPDATE TO authenticated USING (company_can_edit_expense(company_id, auth.uid()) AND ((NOT is_data_entry_moderator(company_id, auth.uid())) OR (user_id = auth.uid())));
CREATE POLICY "company_can_delete_expense" ON public.expenses FOR DELETE TO authenticated USING (company_can_delete_expense(company_id, auth.uid()) AND ((NOT is_data_entry_moderator(company_id, auth.uid())) OR (user_id = auth.uid())));

-- === investments ===
CREATE POLICY "Cipher can select investments" ON public.investments FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));
CREATE POLICY "Cipher can insert investments" ON public.investments FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())) AND (user_id = auth.uid()));
CREATE POLICY "Cipher can update investments" ON public.investments FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));
CREATE POLICY "Cipher can delete investments" ON public.investments FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));

-- === khata_transfers ===
CREATE POLICY "Company members can view transfers" ON public.khata_transfers FOR SELECT TO authenticated USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id) AND (NOT is_data_entry_moderator(company_id, auth.uid())));
CREATE POLICY "Authorized users can insert khata transfers" ON public.khata_transfers FOR INSERT TO authenticated WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND (company_can_transfer(company_id, auth.uid()) OR is_cipher(auth.uid())) AND (user_id = auth.uid()));
CREATE POLICY "Admins can update transfers" ON public.khata_transfers FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));
CREATE POLICY "Admins can delete transfers" ON public.khata_transfers FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

-- === loans ===
CREATE POLICY "Cipher can select loans" ON public.loans FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));
CREATE POLICY "Cipher can insert loans" ON public.loans FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())) AND (user_id = auth.uid()));
CREATE POLICY "Cipher can update loans" ON public.loans FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));
CREATE POLICY "Cipher can delete loans" ON public.loans FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));

-- === loan_repayments ===
CREATE POLICY "Cipher can select loan_repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));
CREATE POLICY "Cipher can insert loan_repayments" ON public.loan_repayments FOR INSERT TO authenticated WITH CHECK (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())) AND (recorded_by = auth.uid()));
CREATE POLICY "Cipher can update loan_repayments" ON public.loan_repayments FOR UPDATE TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));
CREATE POLICY "Cipher can delete loan_repayments" ON public.loan_repayments FOR DELETE TO authenticated USING (is_cipher(auth.uid()) AND (company_id = get_active_company_id(auth.uid())));

-- NOTE: RLS policies for remaining tables (revenues, revenue_sources, students, student_payments,
-- moderator_permissions, registration_requests, user_profiles, user_roles, products, product_sales,
-- product_stock_movements, product_categories, stakeholders, profit_distributions, monthly_fee_history,
-- student_batch_history, student_siblings, student_tags, student_tag_assignments, student_sales_notes,
-- sales_note_categories, suppliers, rate_limits) follow similar patterns.
-- Query your existing database with: SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- to get the complete list, as there are 100+ policies total.


-- =====================
-- 8. REALTIME
-- =====================

ALTER PUBLICATION supabase_realtime ADD TABLE public.allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_creation_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_access_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.khata_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_fee_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;


-- =====================
-- 9. IMPORTANT NOTES
-- =====================
-- 1. After running this script, create the auth trigger manually:
--    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--
-- 2. Some RLS policies for tables like students, revenues, products etc. are not
--    included above due to size. Query pg_policies on this project to get them all.
--
-- 3. Update your .env with the new SUPABASE_URL and SUPABASE_ANON_KEY from your
--    new Supabase project.
--
-- 4. Storage buckets (if any) are not included — create them separately.
