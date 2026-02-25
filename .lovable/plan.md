

# Phase 1: Products Management System -- Core Foundation

## Overview
Build the foundational products management system with a Products page, product CRUD, basic sales recording with automatic revenue integration, and stock tracking. This follows existing patterns (hooks, company isolation, RLS, audit triggers) and sets up the database schema for future phases.

## What Gets Built

### Products page at `/products`
- Category cards at top: Courses (links to existing `/courses`), Books, Stationery, Uniforms, Other
- Each card shows: icon, product count, total revenue, quick "Add Product" button
- Products table with search, category/status filters, sorting
- Grid/list view toggle
- Clicking a course-type product navigates to `/courses/:id`; clicking physical products opens `/products/:id`

### Add/Edit Product dialog
- Fields: product name, product code, category (Courses/Books/Stationery/Uniforms/Other), type (Digital/Physical), description, price, purchase price (admin-only), stock quantity, reorder level, image URL, status (Active/Out of Stock/Discontinued)
- For "Courses" category: link to existing course via dropdown
- Conditional fields: stock/reorder only for Physical type
- Validation: unique product code per company, no negative prices/stock

### Product Detail page at `/products/:id`
- Product info card with image, name, code, category, price, stock indicator (green/orange/red)
- Sales history table: Sale Date, Quantity, Unit Price, Total, Customer, Payment Method, Sold By
- Summary cards: Total Revenue, Items Sold, Current Stock, Profit Margin (admin-only)

### Sales recording
- Modal to record a sale: product dropdown (searchable), quantity, unit price (auto-filled, editable), customer name, link to student (optional), payment method, sale date, notes
- Stock deduction on sale
- Auto-creates a revenue entry via database trigger (same pattern as `sync_student_payment_revenue`)
- Validates stock availability before sale

### Stock tracking
- Stock movement log (sale/purchase/adjustment) with previous and new stock levels
- Low stock badge on product cards when stock drops below reorder level
- Stock adjustment feature with reason field

## Database Changes (4 new tables + 1 trigger + RLS)

### Table: `products`
```text
id              uuid PK DEFAULT gen_random_uuid()
company_id      uuid NOT NULL (FK companies)
product_name    text NOT NULL
product_code    text NOT NULL
category        text NOT NULL DEFAULT 'other'
type            text NOT NULL DEFAULT 'physical'  -- physical | digital
description     text
price           numeric NOT NULL DEFAULT 0
purchase_price  numeric DEFAULT 0
stock_quantity  integer DEFAULT 0
reorder_level   integer DEFAULT 5
image_url       text
status          text NOT NULL DEFAULT 'active'
linked_course_id uuid  -- FK courses, nullable
user_id         uuid NOT NULL
created_by      uuid NOT NULL
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
UNIQUE(company_id, product_code)
```

### Table: `product_sales`
```text
id              uuid PK DEFAULT gen_random_uuid()
company_id      uuid NOT NULL
product_id      uuid NOT NULL (FK products)
quantity         integer NOT NULL DEFAULT 1
unit_price      numeric NOT NULL
total_amount    numeric NOT NULL
customer_name   text
student_id      uuid  -- FK students, nullable
payment_method  text DEFAULT 'cash'
sale_date       date DEFAULT CURRENT_DATE
notes           text
source_id       uuid  -- FK revenue_sources, nullable
user_id         uuid NOT NULL
created_at      timestamptz DEFAULT now()
```

### Table: `product_stock_movements`
```text
id              uuid PK DEFAULT gen_random_uuid()
company_id      uuid NOT NULL
product_id      uuid NOT NULL (FK products)
movement_type   text NOT NULL  -- sale | purchase | adjustment
quantity         integer NOT NULL
previous_stock  integer NOT NULL
new_stock       integer NOT NULL
reference_id    uuid   -- links to product_sales.id or null
reason          text
user_id         uuid NOT NULL
created_at      timestamptz DEFAULT now()
```

### Revenue trigger: `sync_product_sale_revenue()`
- Same pattern as existing `sync_student_payment_revenue`
- On INSERT into `product_sales`: creates a revenue entry with `product_sale_id` FK
- On UPDATE: updates linked revenue
- On DELETE: revenue auto-deleted via CASCADE
- Adds `product_sale_id` column to `revenues` table (nullable, FK with ON DELETE CASCADE)

### RLS Policies (all tables)
- SELECT: `is_company_member(auth.uid(), company_id)` with active company check
- INSERT/UPDATE/DELETE: admin/cipher, plus moderators with product permissions (future `can_manage_products` flag -- for Phase 1, admin/cipher only)
- Purchase price visible only to admin/cipher (handled in frontend)

### Audit trigger
- Attach existing `audit_log_trigger` to `products`, `product_sales`, `product_stock_movements`

## New Files

### Hooks
- `src/hooks/useProducts.ts` -- CRUD hooks following `useCourses.ts` pattern
- `src/hooks/useProductSales.ts` -- Sales CRUD + stock validation
- `src/hooks/useProductStockMovements.ts` -- Stock movement queries

### Pages
- `src/pages/Products.tsx` -- Main products page with category cards + table
- `src/pages/ProductDetail.tsx` -- Single product view with sales history

### Dialogs
- `src/components/dialogs/ProductDialog.tsx` -- Add/Edit product form
- `src/components/dialogs/ProductSaleDialog.tsx` -- Record sale modal
- `src/components/dialogs/StockAdjustmentDialog.tsx` -- Stock adjustment modal

## Modified Files

### `src/App.tsx`
- Add lazy imports for Products, ProductDetail
- Add routes: `/products`, `/products/:id` with CriticalRouteErrorBoundary

### `src/components/layout/AppLayout.tsx`
- Add "Products" nav item with `Package` icon (from lucide-react)
- Position after Courses in navigation for admin/cipher
- Traditional moderators: show if future `canManageProducts` permission is granted

### `src/components/auth/AccessGuard.tsx`
- Add `deoProducts` rule blocking DEO moderators from Products page

### Database migration
- Create `products`, `product_sales`, `product_stock_movements` tables
- Add `product_sale_id` column to `revenues` table
- Create `sync_product_sale_revenue` trigger function
- Create RLS policies for all new tables
- Attach audit triggers
- Add database indexes on `company_id`, `product_code`, `category`, `status`

## Technical Details

- **Company isolation**: All queries filter by `company_id = activeCompanyId` in hooks + RLS
- **Revenue auto-creation**: Database trigger creates revenue with "Product Sales" source (auto-created per company like "Student Fees")
- **Stock race conditions**: The stock deduction uses a transaction in the trigger -- UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND stock_quantity >= NEW.quantity, raising an exception if insufficient
- **Currency**: All prices displayed using existing `useCompanyCurrency` hook
- **Audit**: Reuses existing `audit_log_trigger` function
- **No PII concerns**: Product data is not PII-sensitive

## Testing Checklist

| # | Test | Expected Result | Pass |
|---|------|----------------|------|
| 1 | Create product with unique code | Product appears in table | |
| 2 | Create product with duplicate code | Error: duplicate product code | |
| 3 | Record sale with sufficient stock | Stock decreases, revenue entry created | |
| 4 | Record sale exceeding stock | Error: insufficient stock | |
| 5 | Delete product sale | Revenue auto-deleted, stock restored | |
| 6 | Stock adjustment | Movement logged, stock updated | |
| 7 | Course product click | Navigates to /courses/:id | |
| 8 | Category filter | Only matching products shown | |
| 9 | Moderator cannot see purchase price | Purchase price column hidden | |
| 10 | Cross-company isolation | Products from other companies not visible | |

## Future Phases (not in scope now)
- Phase 2: Suppliers, purchase orders, barcode/QR
- Phase 3: Product bundles, variants, promotions
- Phase 4: Advanced analytics, returns/refunds, notifications
- Phase 5: Product lifecycle, waste tracking, CSV bulk import

