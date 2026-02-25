

# Fix Product Management Workflow Issues

## Issues Found

### 1. Products page fetches ALL products twice (Performance Bug)
In `Products.tsx`, lines 40 and 54 both call `useProducts()` -- once with filters and once without. The unfiltered call (`allProducts`) is used only for category stats calculation. This causes two separate network requests on every render.

**Fix**: Remove the duplicate `useProducts()` call on line 54. Use the already-fetched `allSales` and a single unfiltered products query for stats, OR compute stats from the unfiltered hook and use a separate filtered list for the table display. The cleanest approach: keep ONE `useProducts()` without filters for stats, and filter in-memory for the table.

### 2. Courses page missing "Products >" breadcrumb
The Courses page (`src/pages/Courses.tsx`) has no breadcrumb linking back to Products. CourseDetail and BatchDetail correctly show "Products > Courses > ..." but the Courses list page itself has no breadcrumb at all, breaking the navigation hierarchy.

**Fix**: Add a breadcrumb section to `Courses.tsx` showing `Products > Courses`.

### 3. ProductSaleDialog does not reset preselectedProduct on reopen (State Bug)
In `ProductSaleDialog.tsx`, the `productId` and `unitPrice` states are initialized from `preselectedProduct` only once via `useState`. When the dialog reopens with a different preselected product (or from a different context), the old values persist.

**Fix**: Add a `useEffect` that resets form state when `open` or `preselectedProduct` changes, similar to how `ProductDialog` handles it.

### 4. Realtime sync missing product tables
`useRealtimeSync.ts` does not subscribe to `products`, `product_sales`, `product_stock_movements`, `product_categories`, `suppliers`, or `purchase_orders` tables. Changes by other users to these tables won't auto-refresh.

**Fix**: Add these tables to `TABLE_INVALIDATION_MAP` and `TABLE_LABELS`, and add corresponding `.on("postgres_changes", ...)` subscriptions.

### 5. CategoryProducts page "Add Product" does not pre-select category in dialog
The `CategoryProducts` page passes `defaultCategory={slug}` to `ProductDialog`, which works. However, when opening the sale dialog from `CategoryProducts`, the `ProductSaleDialog` shows ALL products, not filtered to the category. This is acceptable behavior but could be confusing.

**Fix**: No code change needed -- it's by design since sales should allow any product selection.

### 6. Products page `useProducts` fetches without filters then WITH filters -- table shows filtered, stats show all (Correct but wasteful)
The intent is correct: stats need all products, table needs filtered products. But the approach creates two separate API calls.

**Fix**: Fetch all products once (unfiltered), compute stats from that, then filter in-memory for the table display.

### 7. Console warning: "Function components cannot be given refs"
From the console logs, `ProductSaleDialog` and `AlertDialog` are receiving refs but are not wrapped in `forwardRef`. This happens because they're rendered as direct children of components that try to pass refs.

**Fix**: This is a non-critical React warning from Radix UI internals. No action needed.

## Changes Summary

### File: `src/pages/Products.tsx`
- Remove duplicate `useProducts()` call (line 54)
- Use single unfiltered fetch for stats, filter in-memory for table display

### File: `src/pages/Courses.tsx`
- Add breadcrumb: `Products > Courses` at the top of the page

### File: `src/components/dialogs/ProductSaleDialog.tsx`
- Add `useEffect` to reset form state (`productId`, `unitPrice`, `quantity`, `customerName`, `notes`, `paymentMethod`, `saleDate`) when `open` changes or `preselectedProduct` changes

### File: `src/hooks/useRealtimeSync.ts`
- Add entries to `TABLE_INVALIDATION_MAP`:
  - `products` -> `["products", "product-sales", "dashboard"]`
  - `product_sales` -> `["product-sales", "products", "revenues", "dashboard", "reports"]`
  - `product_stock_movements` -> `["product-stock-movements", "products"]`
  - `product_categories` -> `["product_categories", "products"]`
  - `suppliers` -> `["suppliers"]`
  - `purchase_orders` -> `["purchase_orders"]`
  - `purchase_order_items` -> `["purchase_order_items", "products", "product-stock-movements"]`
- Add corresponding `TABLE_LABELS`
- Add `.on("postgres_changes", ...)` for each new table

## No Database Changes Required
All issues are frontend-only. The database triggers, RLS policies, and schema are correctly implemented.

