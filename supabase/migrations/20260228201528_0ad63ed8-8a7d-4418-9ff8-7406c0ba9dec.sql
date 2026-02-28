
-- Add payment_status column to product_sales
ALTER TABLE public.product_sales
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';

-- Update the sync_product_sale_revenue trigger to respect payment_status
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

    -- Only create revenue if payment_status = 'paid'
    IF NEW.payment_status = 'paid' THEN
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
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle payment_status transitions
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
      -- Became paid: create revenue
      INSERT INTO public.revenues (amount, date, source_id, description, user_id, company_id, product_sale_id)
      VALUES (NEW.total_amount, NEW.sale_date, v_source_id, v_desc, NEW.user_id, NEW.company_id, NEW.id)
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
      -- Was paid, now not: remove revenue (cascade deletes allocations)
      DELETE FROM public.revenues WHERE product_sale_id = NEW.id;

    ELSIF NEW.payment_status = 'paid' THEN
      -- Still paid: update revenue
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
  END IF;

  RETURN NEW;
END;
$function$;
