
-- ============================================================
-- 1. product_categories table
-- ============================================================
CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  icon text NOT NULL DEFAULT 'package',
  color text NOT NULL DEFAULT '#6B7280',
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view categories" ON public.product_categories
  FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert categories" ON public.product_categories
  FOR INSERT WITH CHECK (company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can update categories" ON public.product_categories
  FOR UPDATE USING (company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete categories" ON public.product_categories
  FOR DELETE USING (company_can_edit_delete(auth.uid(), company_id) AND is_system = false);

CREATE INDEX idx_product_categories_company ON public.product_categories(company_id);

-- Audit trigger
CREATE TRIGGER audit_product_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================
-- 2. Seed default categories for existing companies
-- ============================================================
INSERT INTO public.product_categories (company_id, name, slug, icon, color, is_system, sort_order, user_id)
SELECT c.id, cat.name, cat.slug, cat.icon, cat.color, cat.is_system, cat.sort_order, c.created_by
FROM public.companies c
CROSS JOIN (VALUES
  ('Courses', 'courses', 'graduation-cap', '#8B5CF6', true, 0),
  ('Books', 'books', 'book-open', '#3B82F6', false, 1),
  ('Stationery', 'stationery', 'pencil', '#10B981', false, 2),
  ('Uniforms', 'uniforms', 'shirt', '#F59E0B', false, 3),
  ('Other', 'other', 'package', '#6B7280', false, 4)
) AS cat(name, slug, icon, color, is_system, sort_order)
ON CONFLICT (company_id, slug) DO NOTHING;

-- ============================================================
-- 3. Auto-seed categories for new companies
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_default_product_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.product_categories (company_id, name, slug, icon, color, is_system, sort_order, user_id)
  VALUES
    (NEW.id, 'Courses', 'courses', 'graduation-cap', '#8B5CF6', true, 0, NEW.created_by),
    (NEW.id, 'Books', 'books', 'book-open', '#3B82F6', false, 1, NEW.created_by),
    (NEW.id, 'Stationery', 'stationery', 'pencil', '#10B981', false, 2, NEW.created_by),
    (NEW.id, 'Uniforms', 'uniforms', 'shirt', '#F59E0B', false, 3, NEW.created_by),
    (NEW.id, 'Other', 'other', 'package', '#6B7280', false, 4, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_categories_on_company_create
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_product_categories();

-- ============================================================
-- 4. suppliers table
-- ============================================================
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  payment_terms text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view suppliers" ON public.suppliers
  FOR SELECT USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can update suppliers" ON public.suppliers
  FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete suppliers" ON public.suppliers
  FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================
-- 5. purchase_orders table
-- ============================================================
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expected_delivery date,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, order_number)
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view purchase orders" ON public.purchase_orders
  FOR SELECT USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can update purchase orders" ON public.purchase_orders
  FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete purchase orders" ON public.purchase_orders
  FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE INDEX idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================
-- 6. purchase_order_items table
-- ============================================================
CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quantity_ordered integer NOT NULL,
  quantity_received integer NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view PO items" ON public.purchase_order_items
  FOR SELECT USING ((company_id = get_active_company_id(auth.uid())) AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can insert PO items" ON public.purchase_order_items
  FOR INSERT WITH CHECK ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can update PO items" ON public.purchase_order_items
  FOR UPDATE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE POLICY "Admin/Cipher can delete PO items" ON public.purchase_order_items
  FOR DELETE USING ((company_id = get_active_company_id(auth.uid())) AND company_can_edit_delete(auth.uid(), company_id));

CREATE INDEX idx_po_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON public.purchase_order_items(product_id);

CREATE TRIGGER audit_purchase_order_items
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================
-- 7. Add barcode, sku, supplier_id to products
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS sku text;

CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_barcode ON public.products(barcode);

-- ============================================================
-- 8. Receive PO items trigger - updates stock on quantity_received change
-- ============================================================
CREATE OR REPLACE FUNCTION public.receive_purchase_order_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_diff integer;
  v_product RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.quantity_received > OLD.quantity_received THEN
    v_diff := NEW.quantity_received - OLD.quantity_received;
    
    SELECT stock_quantity, type INTO v_product FROM public.products WHERE id = NEW.product_id;
    
    UPDATE public.products
      SET stock_quantity = COALESCE(stock_quantity, 0) + v_diff
      WHERE id = NEW.product_id;
    
    INSERT INTO public.product_stock_movements
      (company_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, reason, user_id)
    VALUES
      (NEW.company_id, NEW.product_id, 'purchase', v_diff,
       COALESCE(v_product.stock_quantity, 0),
       COALESCE(v_product.stock_quantity, 0) + v_diff,
       NEW.purchase_order_id, 'Purchase order received', NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER receive_po_items_trigger
  AFTER UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.receive_purchase_order_items();
