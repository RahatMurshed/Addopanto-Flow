

# Enhance Products Management System

## Overview
The core product management infrastructure (database tables, triggers, hooks, pages) is already built and working. This plan focuses on upgrading the UI/UX and adding missing business logic validations to match the detailed specification.

## Changes

### 1. Products Page - Card Grid Layout + Stats Header
**File: `src/pages/Products.tsx`**

Replace the products table with a responsive card grid layout:
- Add stats header showing Total, Active, Out of Stock counts
- Each product card displays: image (or placeholder), product name, code, category badge, price in company currency, stock indicator badge (for physical), and quick action buttons (View, Record Sale)
- For course-linked products: show "Enrolled: N students" instead of stock
- Keep search, status filter, and category cards at the top
- Responsive: 4 columns desktop, 2 tablet, 1 mobile

### 2. ProductDialog - Course Category Business Logic
**File: `src/components/dialogs/ProductDialog.tsx`**

- When category dropdown shows "courses" (re-enable courses category in the dropdown):
  - Show "Link to Course" dropdown (already present)
  - Auto-fill product name from selected course name
  - Auto-calculate price: `course.admission_fee + (course.monthly_fee * course.duration_months)` (requires fetching batch defaults - will use first batch or course-level data)
  - Auto-set type to "digital", hide stock/purchase price/reorder fields
  - Validate: prevent duplicate products per course (check existing products with same `linked_course_id`)
- For physical products:
  - Validate selling price > purchase price on submit
  - Show validation error message
- Auto-generate product code (PRD-001, PRD-002...) based on existing product count when field is empty
- Add product code uniqueness check before submit

### 3. ProductSaleDialog - Enhanced Validation + Student Link
**File: `src/components/dialogs/ProductSaleDialog.tsx`**

- Hard-block sale submission when quantity > available stock (for physical products) - disable submit button
- Add "Link to Student" searchable dropdown (fetch students from `useStudents` hook)
  - Shows student name, ID, batch
  - Passes `student_id` to sale record
- Validate sale date cannot be future date
- Show "Only N units available" error prominently
- After success: show option buttons "Record Another" / close

### 4. Product Detail Page - Enhanced Tabs
**File: `src/pages/ProductDetail.tsx`**

- Add "Overview" tab as first tab showing:
  - Product image (if set) or placeholder
  - All product details in organized cards (price, purchase price, type, status, description, supplier info, barcode/SKU)
  - For course products: linked course info with link to course page
  - For physical: stock level with visual indicator, reorder level
- Keep "Sales History" and "Stock Movements" tabs as-is
- Add "Revenue Analytics" tab:
  - Monthly revenue chart using recharts (BarChart)
  - Total revenue, quantity sold, profit margin stats
  - Best selling periods

### 5. Revenue Page - Product Sales Breakdown
**File: `src/pages/Revenue.tsx`**

The revenue page already shows product sales in "Revenue by Source" since the `sync_product_sale_revenue` trigger auto-creates a "Product Sales" revenue source. No structural changes needed, but:
- Add a summary card showing "Student Fees" vs "Product Sales" split with percentages
- Filter revenues to distinguish between `student_payment_id IS NOT NULL` (student fees) vs `product_sale_id IS NOT NULL` (product sales)

### 6. Products Page - Category Icon Rendering
**File: `src/pages/Products.tsx`**

Currently all category cards show the generic `Package` icon. Map the `icon` field from `product_categories` (e.g., "graduation-cap", "book-open", "pencil", "shirt") to the corresponding lucide-react icon component.

## Technical Details

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/Products.tsx` | Card grid layout, stats header, dynamic category icons, responsive grid |
| `src/components/dialogs/ProductDialog.tsx` | Course auto-fill logic, price calculation, selling > purchase validation, auto-generate product code, duplicate course check |
| `src/components/dialogs/ProductSaleDialog.tsx` | Stock hard-block, student link dropdown, future date validation, "Record Another" flow |
| `src/pages/ProductDetail.tsx` | Add Overview tab with organized details, Revenue Analytics tab with recharts chart |
| `src/pages/Revenue.tsx` | Add Student Fees vs Product Sales split card |

### No Database Changes Needed
All required tables, triggers, and RLS policies are already in place. The `sync_product_sale_revenue` trigger handles:
- Stock decrement on sale insert
- Stock restore on sale delete
- Revenue record creation/update/delete
- Expense account allocations

### Key Validations (Frontend)
- Product code auto-generation: Query existing products count, generate `PRD-{count+1}` padded to 3 digits
- Selling price > purchase price: Check on form submit for non-course products
- Duplicate course product: Query products with same `linked_course_id` before creating
- Stock availability: Disable submit when `quantity > product.stock_quantity` for physical products
- Future date: Compare `saleDate` against `new Date()`, block if future

### Revenue Analytics Chart
Uses existing `recharts` dependency (already installed). Groups sales by month using `date-fns` and renders a `BarChart` showing monthly revenue trend for the specific product.

## Implementation Order
1. ProductDialog enhancements (course logic, validations, auto-code)
2. ProductSaleDialog enhancements (stock block, student link, date validation)
3. Products page card grid layout + stats + icons
4. ProductDetail page enhanced tabs (Overview, Revenue Analytics)
5. Revenue page product sales split card
