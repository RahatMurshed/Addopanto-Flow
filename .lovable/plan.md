
# Restructure Products as Top-Level Hub + Dynamic Categories + Phase 2

## Overview

The user wants three key changes:

1. **Products becomes the top-level navigation entry point** wrapping Courses. The hierarchy changes from `Courses -> Batches -> Students` to `Products -> Courses -> Batches -> Students`. The Products page lists ALL sellable items in the business. Clicking a course-category product navigates to the existing Courses page (not a single course).

2. **Dynamic product categories** instead of hardcoded ones. Admins can add custom categories (e.g., "Lab Equipment", "Accessories") alongside defaults like Books, Stationery, Uniforms. Both physical and digital product types supported.

3. **Phase 2 features**: Suppliers management, purchase orders for restocking, and barcode/QR integration.

## What Changes

### 1. Navigation Restructure

- **Sidebar**: Replace separate "Courses" and "Products" nav items with a single "Products" entry at the top. Courses page is accessed BY clicking the "Courses" category card on the Products page (or via breadcrumb).
- **Products page** becomes the central hub showing:
  - Dynamic category cards (including "Courses" which navigates to `/courses`)
  - All non-course products in a filterable table below
  - "Add Product" and "Record Sale" buttons
- **Breadcrumbs**: CourseDetail and BatchDetail breadcrumbs update to show `Products > Courses > [Course Name]` and `Products > Courses > [Course] > [Batch]`
- **Routes**: Keep existing `/courses`, `/courses/:id`, `/batches/:id` routes but update breadcrumbs. `/products` remains the main entry.

### 2. Dynamic Product Categories (New Table)

Create a `product_categories` table so admins can add/edit/delete categories:

```text
product_categories table:
  id           uuid PK
  company_id   uuid NOT NULL (FK companies)
  name         text NOT NULL (e.g. "Books", "Stationery")
  slug         text NOT NULL (e.g. "books", "stationery")
  icon         text DEFAULT 'package' (icon name from lucide)
  color        text DEFAULT '#6B7280' (hex color for card)
  is_system    boolean DEFAULT false (true for "Courses" - cannot be deleted)
  sort_order   integer DEFAULT 0
  user_id      uuid NOT NULL
  created_at   timestamptz DEFAULT now()
  UNIQUE(company_id, slug)
```

- Seed default categories per company: Courses (system, non-deletable), Books, Stationery, Uniforms, Other
- Products table `category` column changes from free-text to FK referencing `product_categories.id` (or we keep it as text matching the slug for backward compatibility -- using slug is simpler and avoids migration complexity)
- Category management UI: small dialog to add/edit/delete categories from the Products page (admin only)

### 3. Phase 2: Suppliers + Purchase Orders

#### Suppliers Table
```text
suppliers table:
  id              uuid PK
  company_id      uuid NOT NULL
  supplier_name   text NOT NULL
  contact_person  text
  phone           text
  email           text
  address         text
  payment_terms   text
  notes           text
  status          text DEFAULT 'active'
  user_id         uuid NOT NULL
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
```

#### Purchase Orders Table
```text
purchase_orders table:
  id                uuid PK
  company_id        uuid NOT NULL
  supplier_id       uuid (FK suppliers)
  order_number      text NOT NULL
  status            text DEFAULT 'pending' (pending/partial/received/cancelled)
  expected_delivery date
  total_amount      numeric DEFAULT 0
  notes             text
  user_id           uuid NOT NULL
  created_at        timestamptz DEFAULT now()
  updated_at        timestamptz DEFAULT now()
  UNIQUE(company_id, order_number)
```

#### Purchase Order Items Table
```text
purchase_order_items table:
  id                uuid PK
  purchase_order_id uuid NOT NULL (FK purchase_orders)
  product_id        uuid NOT NULL (FK products)
  company_id        uuid NOT NULL
  quantity_ordered  integer NOT NULL
  quantity_received integer DEFAULT 0
  unit_cost         numeric NOT NULL
  total_cost        numeric NOT NULL
  user_id           uuid NOT NULL
  created_at        timestamptz DEFAULT now()
```

- When a purchase order is marked "received", stock is automatically updated and stock movements are logged
- A trigger or frontend logic handles partial receipts (updating `quantity_received`)

#### Barcode/QR Integration
- Add `barcode` and `sku` columns to `products` table
- Auto-generate a barcode value from product_code if not provided
- Display barcode on ProductDetail page using a simple barcode rendering component (CSS-based or a lightweight library)
- Barcode search: typing or scanning a barcode in the Products page search will find the product

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useProductCategories.ts` | CRUD hooks for dynamic product categories |
| `src/hooks/useSuppliers.ts` | CRUD hooks for suppliers |
| `src/hooks/usePurchaseOrders.ts` | CRUD hooks for purchase orders + items |
| `src/components/dialogs/ProductCategoryDialog.tsx` | Add/Edit category dialog |
| `src/components/dialogs/SupplierDialog.tsx` | Add/Edit supplier dialog |
| `src/components/dialogs/PurchaseOrderDialog.tsx` | Create/Edit purchase order dialog |
| `src/pages/Suppliers.tsx` | Suppliers management page |
| `src/pages/PurchaseOrders.tsx` | Purchase orders list page |
| `src/pages/PurchaseOrderDetail.tsx` | Single PO detail with items + receive flow |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Products.tsx` | Replace hardcoded CATEGORY_CONFIG with dynamic categories from DB; add category management button; update "Courses" card to navigate to `/courses`; update layout |
| `src/pages/ProductDetail.tsx` | Add supplier info display; add barcode display; update breadcrumbs to `Products > [Product Name]` |
| `src/pages/Courses.tsx` | Update breadcrumbs to `Products > Courses`; remove from direct sidebar nav |
| `src/pages/CourseDetail.tsx` | Update breadcrumbs to `Products > Courses > [Course Name]` |
| `src/pages/BatchDetail.tsx` | Update breadcrumbs to `Products > Courses > [Course] > [Batch]` |
| `src/components/layout/AppLayout.tsx` | Remove separate "Courses" nav item; keep single "Products" entry. Add "Suppliers" nav item for admin/cipher |
| `src/components/dialogs/ProductDialog.tsx` | Use dynamic categories from DB instead of hardcoded list; add supplier selection dropdown; add barcode/SKU fields |
| `src/hooks/useProducts.ts` | Add `supplier_id`, `barcode`, `sku` to Product interface |
| `src/App.tsx` | Add routes for `/suppliers`, `/purchase-orders`, `/purchase-orders/:id` |
| `src/components/auth/AccessGuard.tsx` | Add access rules for suppliers/purchase-orders (same as products: block DEO) |
| `src/components/layout/CommandPalette.tsx` | Add Products and Suppliers to command palette search |

## Database Migration

Single migration covering:

1. **`product_categories` table** with RLS policies (company member SELECT, admin/cipher INSERT/UPDATE/DELETE)
2. **`suppliers` table** with RLS policies
3. **`purchase_orders` table** with RLS policies
4. **`purchase_order_items` table** with RLS policies
5. **Add columns to `products`**: `supplier_id` (uuid, nullable, FK suppliers), `barcode` (text, nullable), `sku` (text, nullable)
6. **Seed default categories**: A trigger or function that creates default categories (Courses, Books, Stationery, Uniforms, Other) when a new company is created
7. **Purchase order receive trigger**: `receive_purchase_order_items()` -- updates product stock and logs stock movements when `quantity_received` changes
8. **Audit triggers** on all new tables
9. **Indexes** on company_id, supplier_id, barcode for all relevant tables

## Implementation Order

1. Database migration (all tables + triggers + RLS)
2. Dynamic categories (hook + dialog + update Products page)
3. Navigation restructure (sidebar, breadcrumbs)
4. Suppliers management (hook + page + dialog)
5. Purchase orders (hook + pages + dialog + receive flow)
6. Barcode/SKU fields (product dialog + detail display)
7. Update ProductDialog to use dynamic categories + supplier dropdown

## Technical Notes

- **Backward compatibility**: Existing products with hardcoded category strings (e.g., "books") will still work since we match by slug. The migration will seed default categories matching existing slugs.
- **Company isolation**: All new tables have `company_id` with RLS policies using existing `is_company_member` and `company_can_edit_delete` functions.
- **No breaking changes to Courses flow**: The Course -> Batch -> Student hierarchy is untouched. Only navigation entry point and breadcrumbs change.
- **Category "Courses" is special**: It's marked `is_system = true` and clicking it navigates to `/courses` instead of filtering products. Course products are NOT shown in the products table (they live in the courses system).
