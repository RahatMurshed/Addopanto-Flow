

# Remove Suppliers Feature

## Files to Delete
- `src/pages/Suppliers.tsx`
- `src/hooks/useSuppliers.ts`
- `src/components/dialogs/SupplierDialog.tsx`

## Files to Edit

### `src/App.tsx`
- Remove the `SuppliersPage` lazy import (line 58)
- Remove the `/suppliers` route (line 200)

### `src/components/layout/AppLayout.tsx`
- Remove the "Suppliers" nav item (line 133)

### `src/components/layout/CommandPalette.tsx`
- Remove the "Suppliers" entry from the pages list (line 41)

### `src/components/dialogs/ProductDialog.tsx`
- Remove the `useSuppliers` import and usage (lines 10, 29)
- Remove the supplier dropdown from the form

### `src/components/dialogs/PurchaseOrderDialog.tsx`
- Remove the `useSuppliers` import and usage (lines 9, 21, 68)
- Remove the supplier dropdown from the form

### `src/hooks/useRealtimeSync.ts`
- Remove the `suppliers` entry from `TABLE_INVALIDATION_MAP` (line 38)
- Remove the `suppliers` entry from `TABLE_LABELS` (line 58)
- Remove the `.on("postgres_changes", ...)` subscription for `suppliers` (line 119)

### `src/pages/PurchaseOrders.tsx`
- Remove `useSuppliers` import and usage (lines 4, 31, 38)
- Remove supplier name column from the table

### `src/pages/PurchaseOrderDetail.tsx`
- Remove any supplier references in the detail view

## Database
- No database migration needed -- the `suppliers` table can remain in the database without causing issues. Removing it would require first dropping foreign key constraints from `products` and `purchase_orders`, which risks data loss.

