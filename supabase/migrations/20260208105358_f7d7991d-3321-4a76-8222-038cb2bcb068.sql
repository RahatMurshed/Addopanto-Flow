
-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  currency TEXT NOT NULL DEFAULT 'BDT',
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Revenue sources table
CREATE TABLE public.revenue_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own revenue sources" ON public.revenue_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenue sources" ON public.revenue_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenue sources" ON public.revenue_sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenue sources" ON public.revenue_sources FOR DELETE USING (auth.uid() = user_id);

-- Revenues table
CREATE TABLE public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.revenue_sources(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own revenues" ON public.revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revenues" ON public.revenues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revenues" ON public.revenues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own revenues" ON public.revenues FOR DELETE USING (auth.uid() = user_id);

-- Expense accounts (Khatas) table
CREATE TABLE public.expense_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocation_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  expected_monthly_expense NUMERIC(15,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense accounts" ON public.expense_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expense accounts" ON public.expense_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expense accounts" ON public.expense_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expense accounts" ON public.expense_accounts FOR DELETE USING (auth.uid() = user_id);

-- Allocations table
CREATE TABLE public.allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_id UUID NOT NULL REFERENCES public.revenues(id) ON DELETE CASCADE,
  expense_account_id UUID NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own allocations" ON public.allocations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own allocations" ON public.allocations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own allocations" ON public.allocations FOR DELETE USING (auth.uid() = user_id);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_account_id UUID NOT NULL REFERENCES public.expense_accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_accounts_updated_at BEFORE UPDATE ON public.expense_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
