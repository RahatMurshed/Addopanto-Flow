-- Create permission helper functions for shared data model

-- Function: Can user add revenue
CREATE OR REPLACE FUNCTION public.can_add_revenue(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (
      SELECT 1 FROM moderator_permissions mp 
      WHERE mp.user_id = _user_id AND mp.can_add_revenue = true
    );
  END IF;
  RETURN false;
END;
$$;

-- Function: Can user add expense
CREATE OR REPLACE FUNCTION public.can_add_expense(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (
      SELECT 1 FROM moderator_permissions mp 
      WHERE mp.user_id = _user_id AND mp.can_add_expense = true
    );
  END IF;
  RETURN false;
END;
$$;

-- Function: Can user add expense source (khata)
CREATE OR REPLACE FUNCTION public.can_add_expense_source(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (
      SELECT 1 FROM moderator_permissions mp 
      WHERE mp.user_id = _user_id AND mp.can_add_expense_source = true
    );
  END IF;
  RETURN false;
END;
$$;

-- Function: Can user transfer between accounts
CREATE OR REPLACE FUNCTION public.can_transfer(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;
  IF has_role(_user_id, 'moderator') THEN
    RETURN EXISTS (
      SELECT 1 FROM moderator_permissions mp 
      WHERE mp.user_id = _user_id AND mp.can_transfer = true
    );
  END IF;
  RETURN false;
END;
$$;

-- Function: Can user edit/delete (only cipher/admin)
CREATE OR REPLACE FUNCTION public.can_edit_delete(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'cipher') OR has_role(_user_id, 'admin')
$$;

-- =====================================================
-- Update RLS policies for REVENUES table
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can update own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can delete own revenues" ON revenues;

CREATE POLICY "Authorized users can insert revenues" ON revenues
FOR INSERT WITH CHECK (can_add_revenue(auth.uid()));

CREATE POLICY "Admins can update revenues" ON revenues
FOR UPDATE USING (can_edit_delete(auth.uid()));

CREATE POLICY "Admins can delete revenues" ON revenues
FOR DELETE USING (can_edit_delete(auth.uid()));

-- =====================================================
-- Update RLS policies for EXPENSES table
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "Authorized users can insert expenses" ON expenses
FOR INSERT WITH CHECK (can_add_expense(auth.uid()));

CREATE POLICY "Admins can update expenses" ON expenses
FOR UPDATE USING (can_edit_delete(auth.uid()));

CREATE POLICY "Admins can delete expenses" ON expenses
FOR DELETE USING (can_edit_delete(auth.uid()));

-- =====================================================
-- Update RLS policies for EXPENSE_ACCOUNTS table
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own expense accounts" ON expense_accounts;
DROP POLICY IF EXISTS "Users can update own expense accounts" ON expense_accounts;
DROP POLICY IF EXISTS "Users can delete own expense accounts" ON expense_accounts;

CREATE POLICY "Authorized users can insert expense accounts" ON expense_accounts
FOR INSERT WITH CHECK (can_add_expense_source(auth.uid()));

CREATE POLICY "Admins can update expense accounts" ON expense_accounts
FOR UPDATE USING (can_edit_delete(auth.uid()));

CREATE POLICY "Admins can delete expense accounts" ON expense_accounts
FOR DELETE USING (can_edit_delete(auth.uid()));

-- =====================================================
-- Update RLS policies for REVENUE_SOURCES table
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own revenue sources" ON revenue_sources;
DROP POLICY IF EXISTS "Users can update own revenue sources" ON revenue_sources;
DROP POLICY IF EXISTS "Users can delete own revenue sources" ON revenue_sources;

CREATE POLICY "Authorized users can insert revenue sources" ON revenue_sources
FOR INSERT WITH CHECK (can_add_revenue(auth.uid()));

CREATE POLICY "Admins can update revenue sources" ON revenue_sources
FOR UPDATE USING (can_edit_delete(auth.uid()));

CREATE POLICY "Admins can delete revenue sources" ON revenue_sources
FOR DELETE USING (can_edit_delete(auth.uid()));

-- =====================================================
-- Update RLS policies for ALLOCATIONS table
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own allocations" ON allocations;
DROP POLICY IF EXISTS "Users can update own allocations" ON allocations;
DROP POLICY IF EXISTS "Users can delete own allocations" ON allocations;

CREATE POLICY "Authorized users can insert allocations" ON allocations
FOR INSERT WITH CHECK (can_add_revenue(auth.uid()));

CREATE POLICY "Admins can update allocations" ON allocations
FOR UPDATE USING (can_edit_delete(auth.uid()));

CREATE POLICY "Admins can delete allocations" ON allocations
FOR DELETE USING (can_edit_delete(auth.uid()));

-- =====================================================
-- Update RLS policies for KHATA_TRANSFERS table
-- =====================================================
DROP POLICY IF EXISTS "Users can insert own transfers" ON khata_transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON khata_transfers;
DROP POLICY IF EXISTS "Users can delete own transfers" ON khata_transfers;

CREATE POLICY "Authorized users can insert transfers" ON khata_transfers
FOR INSERT WITH CHECK (can_transfer(auth.uid()));

CREATE POLICY "Admins can update transfers" ON khata_transfers
FOR UPDATE USING (can_edit_delete(auth.uid()));

CREATE POLICY "Admins can delete transfers" ON khata_transfers
FOR DELETE USING (can_edit_delete(auth.uid()));