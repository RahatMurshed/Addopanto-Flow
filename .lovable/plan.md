

# Batch Management System for Addopanto Flow

## Overview

Add a "Batch" organizational layer that groups students together. Admins and ciphers can create batches (e.g., "Batch-1", "Batch-2024-01"), assign students to batches during enrollment, and view batch-level analytics. All existing student functionality remains unchanged.

---

## Phase 1: Database Schema

### New `batches` Table

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| company_id | uuid (FK) | Required, for data isolation |
| batch_name | text | Required, e.g. "Batch - 1" |
| batch_code | text | Unique per company, e.g. "BATCH-2024-01" |
| description | text | Optional |
| start_date | date | Required |
| end_date | date | Optional |
| course_duration_months | integer | Optional |
| default_admission_fee | numeric | Default 0 |
| default_monthly_fee | numeric | Default 0 |
| max_capacity | integer | Optional (null = unlimited) |
| status | text | 'active', 'completed', 'archived' (default 'active') |
| created_by | uuid | User who created |
| user_id | uuid | For RLS consistency |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

Constraints:
- UNIQUE(company_id, batch_code)
- Validation trigger: end_date must be after start_date when both are set

### Modify `students` Table

- Add `batch_id uuid` column (nullable FK to `batches.id`, ON DELETE SET NULL)
- Nullable so existing students without a batch still work

### RLS Policies on `batches`

Following the same pattern as other company-scoped tables:
- SELECT: Company members can view (`is_company_member`)
- INSERT: Users with revenue permission (`company_can_add_revenue`)
- UPDATE: Admins/ciphers only (`company_can_edit_delete`)
- DELETE: Admins/ciphers only (`company_can_edit_delete`)

All policies include `company_id = get_active_company_id(auth.uid())`

### Realtime

- Enable realtime on `batches` table
- Add to `useRealtimeSync` invalidation map

---

## Phase 2: Data Layer (Hooks)

### New: `src/hooks/useBatches.ts`

- `useBatches(filters?)` -- Fetch all batches for active company with optional search/status filter
- `useBatch(id)` -- Fetch single batch by ID
- `useCreateBatch()` -- Insert new batch with company_id and user_id
- `useUpdateBatch()` -- Update batch fields
- `useDeleteBatch()` -- Delete batch (will check for students first)
- `useBatchStudents(batchId)` -- Fetch students filtered by batch_id
- `useBatchStats(batchId)` -- Aggregate student count, revenue collected/pending for a batch

### Modify: `src/hooks/useStudents.ts`

- Add optional `batchId` filter parameter to `useStudents()`
- Include `batch_id` in `StudentInsert` interface
- Query includes batch_id in select and filter

---

## Phase 3: Batches Page

### New: `src/pages/Batches.tsx`

- Summary cards: Total Batches, Active Batches, Total Students in Batches, Archived Batches
- Table columns: Batch Name (clickable link), Batch Code, Start Date, End Date, Students (count/capacity), Status, Actions (View/Edit/Delete)
- "Create Batch" button (visible to admins/ciphers and users with revenue permission)
- Batch status filter dropdown and search
- Skeleton loaders during fetch
- Pagination using existing `usePagination` hook

### New: `src/components/BatchDialog.tsx`

Modal form for create/edit with fields:
- Batch Name (required, max 100 chars)
- Batch Code (auto-generated from name + year, editable, unique per company)
- Description (optional, max 500 chars)
- Start Date (required, calendar picker)
- End Date (optional, must be after start date)
- Course Duration in Months (optional)
- Default Admission Fee (number, min 0)
- Default Monthly Fee (number, min 0)
- Max Capacity (optional, number, min 1)
- Status (active/completed/archived)

Validation with Zod, loading states on save, hardened dialog (no dismiss during save).

---

## Phase 4: Batch Detail Page

### New: `src/pages/BatchDetail.tsx`

- Batch info header with inline edit capability (name, dates, fees, capacity, status)
- Stats cards: Total Students, Revenue Collected, Revenue Pending, Payment Completion %
- Enrolled students table (same columns as main Students page + all actions)
- "Add Student to Batch" button that opens StudentDialog pre-configured with this batch
- Option to move students between batches (dropdown to select target batch with confirmation dialog)
- Batch revenue breakdown (admission collected vs pending, monthly collected vs pending)

---

## Phase 5: Student Integration

### Modify: `src/components/StudentDialog.tsx`

- Add "Select Batch" dropdown at the top of the form (before name field)
- Shows all active batches with name and available capacity (e.g., "Batch-1 (15/30)")
- Required field when creating from Batches page, optional otherwise
- When a batch is selected:
  - Auto-fill admission_fee_total with batch's default_admission_fee
  - Auto-fill monthly_fee_amount with batch's default_monthly_fee
  - Auto-fill course start/end from batch dates
  - All auto-filled values remain editable (override allowed)
- When editing existing student, show current batch and allow changing

### Modify: `src/pages/Students.tsx`

- Add batch filter dropdown in `StudentFilters` (shows "All Batches" + list of batches)
- Add "Batch" column in students table after Name (shows batch name as clickable badge linking to batch detail)
- Update page title area to show batch count badge if filtered

### Modify: `src/components/StudentFilters.tsx`

- Add `batchId` to `StudentFilterValues` interface (default: "all")
- Add batch dropdown to filter controls

### Modify: `src/pages/StudentDetail.tsx`

- Add batch info card at top (if student has a batch) showing batch name, code, duration, link to batch detail page

---

## Phase 6: Navigation and Routing

### Modify: `src/components/AppLayout.tsx`

- Add "Batches" nav item after "Students" with `Layers` icon from lucide-react

### Modify: `src/App.tsx`

- Add lazy import for `Batches` and `BatchDetail` pages
- Add routes: `/batches` and `/batches/:id`

---

## Phase 7: Dashboard Integration

### Modify: `src/pages/Dashboard.tsx`

- Add "Active Batches" count to summary metrics or as a small info card
- This is a lightweight addition; full batch analytics charts can come as a follow-up

---

## Phase 8: Realtime Sync

### Modify: `src/hooks/useRealtimeSync.ts`

- Add `batches` to `TABLE_INVALIDATION_MAP` with keys: `["batches", "students", "dashboard"]`
- Add `batches` label to `TABLE_LABELS`
- Subscribe to `batches` table changes

---

## Permission Model

- Admins and Ciphers: Full CRUD on batches, manage all students across batches
- Moderators with `can_manage_students`: Can view batches and manage students within them
- Moderators with `can_add_revenue`: Can add students to batches
- Viewers: Read-only access to batch list and details
- Uses existing `canAddRevenue`, `canEdit`, `canDelete`, `canManageStudents` from CompanyContext

---

## Deletion Safety

- Deleting a batch with students: Show confirmation dialog listing student count, offer options:
  - "Move students to another batch" (dropdown)
  - "Remove batch assignment" (sets batch_id to null)
  - Cancel
- Batch archiving: Changes status to 'archived', hides from active dropdowns, preserves all data

---

## Technical Details

### Files to Create
- `src/hooks/useBatches.ts` -- All batch CRUD hooks
- `src/pages/Batches.tsx` -- Batch list page
- `src/pages/BatchDetail.tsx` -- Batch detail/edit page
- `src/components/BatchDialog.tsx` -- Create/edit batch modal

### Files to Modify
- `src/App.tsx` -- Add routes
- `src/components/AppLayout.tsx` -- Add sidebar nav item
- `src/hooks/useStudents.ts` -- Add batch_id filter, update interfaces
- `src/components/StudentDialog.tsx` -- Add batch selector with fee auto-fill
- `src/pages/Students.tsx` -- Add batch column and filter
- `src/components/StudentFilters.tsx` -- Add batch filter
- `src/pages/StudentDetail.tsx` -- Add batch info card
- `src/hooks/useRealtimeSync.ts` -- Add batches table subscription
- `src/pages/Dashboard.tsx` -- Add active batches count

### Database Migration
- Create `batches` table with all columns, constraints, and RLS policies
- Add `batch_id` column to `students` table
- Add unique constraint on (company_id, batch_code)
- Enable realtime on batches table
- Add updated_at trigger on batches table

### No New Dependencies Required
- Uses existing: lucide-react, react-hook-form, zod, date-fns, recharts, framer-motion

