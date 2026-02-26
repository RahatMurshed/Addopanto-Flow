

# Separate Products & Courses + Remove Purchase Orders

## Summary
Make Products and Courses fully independent pages (no hierarchy between them), and completely remove the Purchase Orders feature from frontend, backend, and database.

## Part 1: Make Courses Independent from Products

### Navigation (`AppLayout.tsx`)
- Add "Courses" as its own nav item (with `BookOpen` icon) for admin/cipher and moderators with course permissions
- Keep "Products" as a separate nav item

### Routes (`App.tsx`)
- `/courses` and `/courses/:id` remain as-is (already exist)
- `/products` remains as-is
- Remove any redirect from `/batches` to `/courses` if it implies hierarchy

### Courses Page (`Courses.tsx`)
- Remove the breadcrumb linking back to `/products` (lines 193-198)

### Course Detail (`CourseDetail.tsx`)
- Change breadcrumb from "Products > Courses > ..." to just "Courses > ..."

### Batch Detail (`BatchDetail.tsx`)
- Change breadcrumb from "Products > Courses > ..." to "Courses > ..."

### Products Page (`Products.tsx`)
- Remove the "Courses" category card that navigates to `/courses` (the category card click handler on line 180)
- Filter out `courses` slug from category stats so it doesn't show on Products page
- Remove course-related imports (`useCourses`)
- Remove course-linked product logic (clicking a course product navigates to course detail)

### Product Dialog (`ProductDialog.tsx`)
- Remove the "Courses" category option from selectable categories
- Remove course-linking logic (linked_course_id, auto-fill from batch fees, course dropdown)
- Remove `useCourses` and `useBatches` imports

### Command Palette (`CommandPalette.tsx`)
- Keep both "Products" and "Courses" entries (already present)

## Part 2: Remove Purchase Orders (Frontend)

### Files to Delete
- `src/pages/PurchaseOrders.tsx`
- `src/pages/PurchaseOrderDetail.tsx`
- `src/hooks/usePurchaseOrders.ts`
- `src/components/dialogs/PurchaseOrderDialog.tsx`

### Files to Edit
- **`App.tsx`**: Remove `PurchaseOrdersPage` and `PurchaseOrderDetailPage` lazy imports and their routes (lines 59-60, 201-202)
- **`AppLayout.tsx`**: Remove "Purchase Orders" nav item (line 134)
- **`CommandPalette.tsx`**: Remove "Purchase Orders" from pages list (line 42)
- **`useRealtimeSync.ts`**: Remove `purchase_orders` and `purchase_order_items` from TABLE_INVALIDATION_MAP, TABLE_LABELS, and realtime subscriptions

## Part 3: Remove Purchase Orders (Database)

A database migration will:
1. Drop triggers: `receive_po_items_trigger`, `audit_purchase_order_items`, `update_purchase_orders_updated_at`, `audit_purchase_orders`
2. Drop function: `receive_purchase_order_items()`
3. Drop tables: `purchase_order_items` (child first), then `purchase_orders`
4. Clean up any audit_logs referencing these tables

## Technical Notes
- The `products` table has columns `linked_course_id`, `linked_batch_id` -- these columns will remain in the DB but will no longer be used by the UI. No migration needed for them since they're nullable.
- The `product_categories` table still has the system "Courses" category seeded per company. The Products page will simply filter it out from display.
- The `suppliers` table (already disconnected from frontend) remains in DB as before.

