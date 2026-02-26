
-- Drop triggers on purchase_order_items
DROP TRIGGER IF EXISTS receive_po_items_trigger ON public.purchase_order_items;
DROP TRIGGER IF EXISTS audit_purchase_order_items ON public.purchase_order_items;

-- Drop triggers on purchase_orders
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON public.purchase_orders;
DROP TRIGGER IF EXISTS audit_purchase_orders ON public.purchase_orders;

-- Drop function
DROP FUNCTION IF EXISTS public.receive_purchase_order_items();

-- Drop tables (child first)
DROP TABLE IF EXISTS public.purchase_order_items;
DROP TABLE IF EXISTS public.purchase_orders;

-- Clean up audit logs referencing these tables
DELETE FROM public.audit_logs WHERE table_name IN ('purchase_orders', 'purchase_order_items');
