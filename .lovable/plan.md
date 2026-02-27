

# Student Enrollment Details Popover and Table Cleanup

## Overview
When an authorized user clicks the "Enrolled" badge in the students table, a popover will appear showing the student's enrolled course (via their batch) and any products they've purchased. The Batch column will be removed from the table.

## Changes

### 1. Remove Batch Column from Students Table
**File:** `src/pages/Students.tsx`
- Remove the `<TableHead>Batch</TableHead>` column header (line 451)
- Remove the `<TableCell>{batchName}</TableCell>` cell (line 492)
- The `batchNameMap` can stay since it may be used elsewhere (drag-drop)

### 2. Make "Enrolled" Badge Clickable with Popover
**File:** `src/pages/Students.tsx`
- Import `Popover`, `PopoverTrigger`, `PopoverContent` from UI components
- Wrap the "Enrolled" badge in a `PopoverTrigger` that opens a popover
- The popover will show:
  - **Course name** (looked up via batch -> course relationship)
  - **Batch name** (since we removed the column, this info moves here)
  - **Product purchases** for this student (fetched from `product_sales` joined with `products`)
- The "Not Enrolled" badge remains static (no popover, or a popover saying "Not enrolled in any batch")

### 3. Fetch Course and Product Data
**File:** `src/pages/Students.tsx`
- Add `useCourses()` import to get course data for name lookups
- Add a query or use existing `useProductSales` to get product sales linked to students
- Build lookup maps:
  - `batchCourseMap`: batch_id -> course info (name, code) via batches + courses data
  - Student product purchases from product_sales where `student_id` matches

### 4. Popover Content Design
The popover will display a compact card with two sections:

```text
+-------------------------------+
| Course & Batch                |
| Course: Web Development       |
| Batch: WD-2025-A              |
+-------------------------------+
| Products Purchased (2)        |
| - JavaScript Book  x1  $25   |
| - Notebook Set     x3  $15   |
+-------------------------------+
```

- If no course is linked to the batch, show "No course assigned"
- If no product purchases exist, show "No purchases yet"
- Include a "View Details" link to navigate to the student detail page

## Technical Details

### Data Flow
- Batches are already fetched (`useBatches`)
- Courses need to be fetched (`useCourses` from `useCourses.ts`)
- Product sales need a lightweight query filtered by company -- can use existing `useProductSales` hook or a targeted query
- Products need to be fetched for name lookups (`useProducts`)

### Performance Consideration
- Course and batch data are already cached via React Query
- Product sales data will be fetched once and filtered client-side per student
- Popover is lazy -- content only renders when opened

### Files Modified
| File | Change |
|---|---|
| `src/pages/Students.tsx` | Remove Batch column, add Popover to Enrolled badge, import course/product data |
