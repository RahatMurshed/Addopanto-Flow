
-- =============================================
-- Phase 1: Products Management System
-- =============================================

-- 1. Products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_code text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  type text NOT NULL DEFAULT 'physical',
  description text,
  price numeric NOT NULL DEFAULT 0,
  purchase_price numeric DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  reorder_level integer DEFAULT 5,
  image_url text,
  status text NOT NULL DEFAULT 'active',
  linked_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, product_code)
);

-- 2. Product sales table
CREATE TABLE public.product_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  customer_name text,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  payment_method text NOT NULL DEFAULT 'cash',
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Product stock movements table
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

-- 4. Add product_sale_id to revenues for auto-linking
ALTER TABLE public.revenues
  ADD COLUMN product_sale_id uuid REFERENCES public.product_sales(id) ON DELETE CASCADE;

-- 5. Indexes
CREATE INDEX idx_products_company_id ON public.products(company_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_product_code ON public.products(company_id, product_code);
CREATE INDEX idx_product_sales_company_id ON public.product_sales(company_id);
CREATE INDEX idx_product_sales_product_id ON public.product_sales(product_id);
CREATE INDEX idx_product_sales_sale_date ON public.product_sales(sale_date);
CREATE INDEX idx_product_stock_movements_product_id ON public.product_stock_movements(product_id);
CREATE INDEX idx_revenues_product_sale_id ON public.revenues(product_sale_id);

-- 6. Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for products
CREATE POLICY "Company members can view products"
  ON public.products FOR SELECT
  USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert products"
  ON public.products FOR INSERT
  WITH CHECK (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can update products"
  ON public.products FOR UPDATE
  USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete products"
  ON public.products FOR DELETE
  USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

-- 8. RLS Policies for product_sales
CREATE POLICY "Company members can view product sales"
  ON public.product_sales FOR SELECT
  USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert product sales"
  ON public.product_sales FOR INSERT
  WITH CHECK (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can update product sales"
  ON public.product_sales FOR UPDATE
  USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete product sales"
  ON public.product_sales FOR DELETE
  USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

-- 9. RLS Policies for product_stock_movements
CREATE POLICY "Company members can view stock movements"
  ON public.product_stock_movements FOR SELECT
  USING (company_id = get_active_company_id(auth.uid()) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert stock movements"
  ON public.product_stock_movements FOR INSERT
  WITH CHECK (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete stock movements"
  ON public.product_stock_movements FOR DELETE
  USING (company_id = get_active_company_id(auth.uid()) AND company_can_edit_delete(auth.uid(), company_id));

-- 10. Updated_at trigger for products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Audit triggers
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_product_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_product_stock_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- 12. Sync product sale revenue trigger (mirrors sync_student_payment_revenue)
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
  -- ON DELETE: linked revenue is auto-deleted via ON DELETE CASCADE on product_sale_id FK
  IF TG_OP = 'DELETE' THEN
    -- Restore stock
    UPDATE public.products
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = OLD.product_id AND type = 'physical';
    -- Log stock movement for deletion
    INSERT INTO public.product_stock_movements (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, reason, user_id)
    SELECT OLD.company_id, OLD.product_id, 'sale_reversal', OLD.quantity,
      p.stock_quantity - OLD.quantity, p.stock_quantity, OLD.id, 'Sale deleted', OLD.user_id
    FROM public.products p WHERE p.id = OLD.product_id;
    RETURN OLD;
  END IF;

  -- Get product name for description
  SELECT product_name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
  v_desc := 'Product sale - ' || COALESCE(v_product_name, 'Product') || ' x' || NEW.quantity;

  -- Use source_id from sale if provided, else find/create "Product Sales"
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
    -- Validate and deduct stock for physical products
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
        -- Log stock movement
        INSERT INTO public.product_stock_movements (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, user_id)
        VALUES (NEW.company_id, NEW.product_id, 'sale', NEW.quantity, v_product.stock_quantity, v_product.stock_quantity - NEW.quantity, NEW.id, NEW.user_id);
      END IF;
    END;

    -- Create linked revenue
    INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, product_sale_id)
    VALUES (NEW.total_amount, NEW.sale_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id)
    RETURNING id INTO v_revenue_id;

    -- Create allocations
    FOR v_acc IN
      SELECT id, allocation_percentage
      FROM public.expense_accounts
      WHERE company_id = NEW.company_id AND is_active = true AND allocation_percentage > 0
    LOOP
      INSERT INTO public.allocations (user_id, company_id, revenue_id, expense_account_id, amount)
      VALUES (NEW.user_id, NEW.company_id, v_revenue_id, v_acc.id, (NEW.total_amount * v_acc.allocation_percentage) / 100);
    END LOOP;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Update linked revenue
    UPDATE public.revenues
    SET amount = NEW.total_amount,
        date = NEW.sale_date,
        description = v_desc,
        updated_at = now()
    WHERE product_sale_id = NEW.id;

    -- If amount changed, recalculate allocations
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

  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_product_sale_revenue_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_sale_revenue();
