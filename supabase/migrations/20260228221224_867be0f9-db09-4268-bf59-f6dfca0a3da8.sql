
-- Fix 1: RPC functions for server-side aggregation

CREATE OR REPLACE FUNCTION public.get_revenue_summary(
  _company_id uuid,
  _start_date date,
  _end_date date
)
RETURNS TABLE(
  source_id uuid,
  source_name text,
  month text,
  total_amount numeric,
  entry_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.source_id,
    COALESCE(rs.name, 'Uncategorized') AS source_name,
    to_char(r.date::date, 'YYYY-MM') AS month,
    COALESCE(SUM(r.amount), 0) AS total_amount,
    COUNT(*) AS entry_count
  FROM public.revenues r
  LEFT JOIN public.revenue_sources rs ON rs.id = r.source_id
  WHERE r.company_id = _company_id
    AND r.date::date >= _start_date
    AND r.date::date <= _end_date
  GROUP BY r.source_id, rs.name, to_char(r.date::date, 'YYYY-MM')
  ORDER BY month, source_name;
$$;

CREATE OR REPLACE FUNCTION public.get_expense_summary(
  _company_id uuid,
  _start_date date,
  _end_date date
)
RETURNS TABLE(
  expense_account_id uuid,
  account_name text,
  account_color text,
  month text,
  total_amount numeric,
  entry_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.expense_account_id,
    COALESCE(ea.name, 'Uncategorized') AS account_name,
    COALESCE(ea.color, '#6B7280') AS account_color,
    to_char(e.date::date, 'YYYY-MM') AS month,
    COALESCE(SUM(e.amount), 0) AS total_amount,
    COUNT(*) AS entry_count
  FROM public.expenses e
  LEFT JOIN public.expense_accounts ea ON ea.id = e.expense_account_id
  WHERE e.company_id = _company_id
    AND e.date::date >= _start_date
    AND e.date::date <= _end_date
  GROUP BY e.expense_account_id, ea.name, ea.color, to_char(e.date::date, 'YYYY-MM')
  ORDER BY month, account_name;
$$;

-- Fix 2: Add is_system_generated column to revenues
ALTER TABLE public.revenues ADD COLUMN IF NOT EXISTS is_system_generated boolean NOT NULL DEFAULT false;

-- Backfill existing trigger-created revenues
UPDATE public.revenues SET is_system_generated = true WHERE student_payment_id IS NOT NULL;
UPDATE public.revenues SET is_system_generated = true WHERE product_sale_id IS NOT NULL;

-- Update sync_student_payment_revenue trigger to set is_system_generated = true
CREATE OR REPLACE FUNCTION public.sync_student_payment_revenue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source_id uuid;
  v_revenue_id uuid;
  v_student_name text;
  v_desc text;
  v_acc RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;

  IF NEW.payment_type = 'admission' THEN
    v_desc := 'Admission fee - ' || COALESCE(v_student_name, 'Student');
  ELSE
    v_desc := 'Monthly tuition';
    IF NEW.months_covered IS NOT NULL AND array_length(NEW.months_covered, 1) > 0 THEN
      v_desc := v_desc || ' (' || array_to_string(NEW.months_covered, ', ') || ')';
    END IF;
    v_desc := v_desc || ' - ' || COALESCE(v_student_name, 'Student');
  END IF;

  IF NEW.source_id IS NOT NULL THEN
    v_source_id := NEW.source_id;
  ELSE
    SELECT id INTO v_source_id
    FROM public.revenue_sources
    WHERE name = 'Student Fees' AND company_id = NEW.company_id
    LIMIT 1;

    IF v_source_id IS NULL THEN
      INSERT INTO public.revenue_sources (name, user_id, company_id)
      VALUES ('Student Fees', NEW.user_id, NEW.company_id)
      RETURNING id INTO v_source_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, student_payment_id, is_system_generated)
    VALUES (NEW.amount, NEW.payment_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true)
    RETURNING id INTO v_revenue_id;

    FOR v_acc IN
      SELECT id, allocation_percentage
      FROM public.expense_accounts
      WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
    LOOP
      INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
      VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.revenues
    SET amount = NEW.amount,
        date = NEW.payment_date,
        source_id = v_source_id,
        description = v_desc,
        updated_at = now()
    WHERE student_payment_id = NEW.id;

    IF NEW.amount IS DISTINCT FROM OLD.amount THEN
      SELECT id INTO v_revenue_id FROM public.revenues WHERE student_payment_id = NEW.id;
      IF v_revenue_id IS NOT NULL THEN
        DELETE FROM public.allocations WHERE revenue_id = v_revenue_id;
        FOR v_acc IN
          SELECT id, allocation_percentage
          FROM public.expense_accounts
          WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
        LOOP
          INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
          VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.amount * v_acc.allocation_percentage) / 100);
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update sync_product_sale_revenue trigger to set is_system_generated = true
CREATE OR REPLACE FUNCTION public.sync_product_sale_revenue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source_id uuid;
  v_revenue_id uuid;
  v_product_name text;
  v_desc text;
  v_acc RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.products
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = OLD.product_id AND type = 'physical';
    INSERT INTO public.product_stock_movements (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, reason, user_id)
    SELECT OLD.company_id, OLD.product_id, 'sale_reversal', OLD.quantity,
      p.stock_quantity - OLD.quantity, p.stock_quantity, OLD.id, 'Sale deleted', OLD.user_id
    FROM public.products p WHERE p.id = OLD.product_id;
    RETURN OLD;
  END IF;

  SELECT product_name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
  v_desc := 'Product sale - ' || COALESCE(v_product_name, 'Product') || ' x' || NEW.quantity;

  IF NEW.source_id IS NOT NULL THEN
    v_source_id := NEW.source_id;
  ELSE
    SELECT id INTO v_source_id
    FROM public.revenue_sources
    WHERE name = 'Product Sales' AND company_id = NEW.company_id
    LIMIT 1;

    IF v_source_id IS NULL THEN
      INSERT INTO public.revenue_sources (name, user_id, company_id)
      VALUES ('Product Sales', NEW.user_id, NEW.company_id)
      RETURNING id INTO v_source_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    DECLARE
      v_product RECORD;
      v_rows_updated integer;
    BEGIN
      SELECT type, stock_quantity INTO v_product FROM public.products WHERE id = NEW.product_id;
      IF v_product.type = 'physical' THEN
        UPDATE public.products
          SET stock_quantity = stock_quantity - NEW.quantity
          WHERE id = NEW.product_id AND stock_quantity >= NEW.quantity;
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        IF v_rows_updated = 0 THEN
          RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_product.stock_quantity, NEW.quantity;
        END IF;
        INSERT INTO public.product_stock_movements (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, user_id)
        VALUES (NEW.company_id, NEW.product_id, 'sale', NEW.quantity, v_product.stock_quantity, v_product.stock_quantity - NEW.quantity, NEW.id, NEW.user_id);
      END IF;
    END;

    IF NEW.payment_status = 'paid' THEN
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, product_sale_id, is_system_generated)
      VALUES (NEW.total_amount, NEW.sale_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true)
      RETURNING id INTO v_revenue_id;

      FOR v_acc IN
        SELECT id, allocation_percentage
        FROM public.expense_accounts
        WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
      LOOP
        INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
        VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
      END LOOP;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, product_sale_id, is_system_generated)
      VALUES (NEW.total_amount, NEW.sale_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id, true)
      RETURNING id INTO v_revenue_id;

      FOR v_acc IN
        SELECT id, allocation_percentage
        FROM public.expense_accounts
        WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
      LOOP
        INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
        VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
      END LOOP;

    ELSIF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
      DELETE FROM public.revenues WHERE product_sale_id = NEW.id;

    ELSIF NEW.payment_status = 'paid' THEN
      UPDATE public.revenues
      SET amount = NEW.total_amount,
          date = NEW.sale_date,
          description = v_desc,
          updated_at = now()
      WHERE product_sale_id = NEW.id;

      IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
        SELECT id INTO v_revenue_id FROM public.revenues WHERE product_sale_id = NEW.id;
        IF v_revenue_id IS NOT NULL THEN
          DELETE FROM public.allocations WHERE revenue_id = v_revenue_id;
          FOR v_acc IN
            SELECT id, allocation_percentage
            FROM public.expense_accounts
            WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
          LOOP
            INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
            VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
          END LOOP;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
