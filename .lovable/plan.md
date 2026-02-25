

# Fix Product Category Selection + Category Detail Pages

## Problems Found

1. **ProductDialog uses hardcoded categories** (lines 19-25 in ProductDialog.tsx) -- the `CATEGORIES` constant lists "courses, books, stationery, uniforms, other" instead of fetching from the `product_categories` table. So any custom category added by the admin never appears in the Add Product dropdown.

2. **No dedicated page per category** -- clicking a category card on the Products page only toggles a filter on the same table. The user expects each category (e.g., "Books", "Stationery") to have its own page like Courses does, showing products within that category with full management capabilities.

## Changes

### 1. Fix ProductDialog -- Use Dynamic Categories

**File: `src/components/dialogs/ProductDialog.tsx`**
- Remove the hardcoded `CATEGORIES` constant
- Import and use `useProductCategories()` hook to fetch categories from DB
- Filter out the "courses" system category (courses are managed separately)
- Populate the category `<Select>` with dynamic categories
- Add supplier dropdown using `useSuppliers()` hook
- Add barcode/SKU input fields

### 2. Create Category Detail Page

**New file: `src/pages/CategoryProducts.tsx`**
- A page at route `/products/category/:slug` showing:
  - Breadcrumb: `Products > [Category Name]`
  - Category header with name, icon, color, product count, total revenue
  - "Add Product" button (pre-selects this category in the dialog)
  - Products table filtered to this category with search, status filter
  - Same product row actions (edit, delete, click to go to product detail)

### 3. Update Products Page -- Category Cards Navigate to Category Pages

**File: `src/pages/Products.tsx`**
- Change category card `onClick` behavior: instead of filtering the table, navigate to `/products/category/:slug`
- Keep "courses" card navigating to `/courses`
- The main Products page table still shows ALL products (no category filter needed since each category has its own page)
- Remove the category filter dropdown from the Products page (replaced by category pages)

### 4. Add Route

**File: `src/App.tsx`**
- Add lazy import for `CategoryProducts`
- Add route: `/products/category/:slug` with same access guards as Products

### 5. Update ProductDetail Breadcrumbs

**File: `src/pages/ProductDetail.tsx`**
- Update the back button and header to show breadcrumb: `Products > [Category Name] > [Product Name]`
- Back button navigates to `/products/category/:slug` instead of `/products`

## Technical Details

- The `CategoryProducts` page reuses existing hooks: `useProducts({ category: slug })`, `useProductSales()`, `useProductCategories()`
- The ProductDialog receives an optional `defaultCategory` prop so when "Add Product" is clicked from a category page, the category is pre-selected
- The category slug comes from the URL param and is matched against `product_categories` to get the display name, icon, and color
- No database changes needed -- all tables and data already exist
