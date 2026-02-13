
# Student Revenue Management System - Implementation Plan

## Overview

This plan adds a student payment tracking system that extends the existing Revenue page. Students will be separate data records (not app login users for now -- see note below) with admission fees, monthly tuition tracking, partial payment support, and admin-configurable billing start months.

**Important note on "Students as app users":** Since your app uses an approval-based registration flow (signup -> pending -> admin approves -> role assigned), making students log in would mean each student needs to go through that same approval flow and get a role. This is a Phase 2 enhancement. Phase 1 focuses on the core data model and admin-facing UI. Phase 2 adds a `student` role and a student-facing portal where they can view their own payment status.

---

## Phase 1: Core System (This Implementation)

### A. Database Schema

**4 new tables + 1 new enum:**

#### 1. `student_status` enum
```
'active', 'inactive', 'graduated'
```

#### 2. `students` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| name | text | required |
| student_id_number | text | optional custom ID (e.g. "STU-001") |
| email | text | optional contact |
| phone | text | optional contact |
| enrollment_date | date | required |
| billing_start_month | text | format "YYYY-MM", admin sets this |
| admission_fee_total | numeric | default 0, the total admission fee |
| monthly_fee_amount | numeric | default 0, current monthly rate |
| status | student_status | default 'active' |
| notes | text | optional |
| user_id | uuid | who created the record |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

#### 3. `student_payments` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| student_id | uuid (FK -> students) | required, ON DELETE CASCADE |
| payment_date | date | required |
| amount | numeric | required, positive |
| payment_type | text | 'admission' or 'monthly' |
| payment_method | text | 'cash', 'card', 'bank_transfer', 'mobile_banking', 'other' |
| months_covered | text[] | for monthly: ["2024-01", "2024-02"] |
| receipt_number | text | optional |
| description | text | optional notes |
| user_id | uuid | who recorded the payment |
| created_at | timestamptz | auto |

#### 4. `monthly_fee_history` table
Tracks fee changes per student over time so past months use the correct rate.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| student_id | uuid (FK -> students) | ON DELETE CASCADE |
| monthly_amount | numeric | the fee amount |
| effective_from | text | "YYYY-MM" format |
| user_id | uuid | who set it |
| created_at | timestamptz | auto |

#### RLS Policies (all 4 tables)
- **SELECT**: All authenticated users can view (same shared-data model as existing tables)
- **INSERT**: `can_add_revenue(auth.uid())` -- same permission as adding revenue
- **UPDATE**: `can_edit_delete(auth.uid())` -- admin/cipher only
- **DELETE**: `can_edit_delete(auth.uid())` -- admin/cipher only

#### Revenue Integration
When a student payment is recorded, a corresponding row is also inserted into the existing `revenues` table with:
- `source_id` pointing to a revenue source named "Student Fees" (auto-created)
- `description` referencing the student name and payment type
- `amount` matching the payment

This ensures student payments appear in the existing Dashboard, Revenue page, and Reports automatically.

---

### B. New Pages & Navigation

#### 1. `/students` -- Students List Page
**Nav item**: "Students" with GraduationCap icon, added after "Revenue" in sidebar

**Layout:**
- Header: "Students" title + "Add Student" button (permission-gated)
- Summary cards: Total Students, Active Students, Pending Admission Fees, Overdue Monthly Payments
- Date filter (reuse AdvancedDateFilter) for filtering payment activity
- Table with columns:

| Name | Student ID | Status | Admission | Monthly Status | Total Paid | Actions |
|------|-----------|--------|-----------|----------------|------------|---------|

- Admission column shows: "Paid" (green badge), "Partial: X/Y" (yellow badge), "Pending" (red badge)
- Monthly Status shows: "Current" (green), "X months overdue" (red), or "N/A" if no monthly fee
- Actions: View Details, Add Payment
- Pagination (reuse `usePagination` + `TablePagination`)
- Skeleton loading states

#### 2. `/students/:id` -- Student Detail Page
**Layout:**
- Back button to students list
- Student info header (name, ID, enrollment date, status badge, edit button)
- Two main sections side by side on desktop, stacked on mobile:

**Admission Fee Card:**
- Total fee, amount paid, amount pending
- Progress bar showing percentage paid
- Payment history list for admission payments

**Monthly Tuition Card:**
- Current monthly rate
- Month grid showing paid/pending/overdue months (color-coded)
- Months are calculated from `billing_start_month` to current month
- Each month shows: paid (green check), pending (yellow), overdue (red)
- "Add Payment" button

**Payment History Table:**
- All payments for this student, newest first
- Columns: Date, Amount, Type (admission/monthly), Method, Months Covered, Receipt #, Actions
- Edit/Delete actions (admin only)

#### 3. Student Dialog (Create/Edit)
**Reusable dialog component** (`StudentDialog.tsx`):
- Name (required, max 100 chars)
- Student ID Number (optional, max 50 chars)
- Email (optional, validated)
- Phone (optional)
- Enrollment Date (date picker)
- First Billing Month (month/year picker -- admin decides)
- Admission Fee Total (number, >= 0)
- Monthly Fee Amount (number, >= 0)
- Status (select: active/inactive/graduated)
- Notes (textarea, optional)

#### 4. Payment Dialog
**Reusable dialog component** (`StudentPaymentDialog.tsx`):
- Student (pre-selected if opened from student detail)
- Payment Type: Admission or Monthly (radio/select)
- If Monthly: Multi-select for months (shows unpaid months, allows selecting multiple)
- Amount: Auto-calculated for monthly (months x rate), editable for partial
- Payment Date (date picker)
- Payment Method (select)
- Receipt Number (optional)
- Notes (optional)

---

### C. Hooks (following existing patterns)

| Hook | Purpose |
|------|---------|
| `useStudents.ts` | CRUD for students table |
| `useStudentPayments.ts` | CRUD for student_payments + revenue integration |
| `useStudentSummary.ts` | Computed data: admission status, monthly status, overdue calculations |

**Overdue calculation logic:**
- Generate all months from `billing_start_month` to current month (or end month if student is inactive/graduated)
- Cross-reference with `student_payments` where `payment_type = 'monthly'` and check `months_covered`
- For partial payments: track cumulative amount paid per month vs the fee rate for that month (from `monthly_fee_history`)
- A month is "overdue" if it's in the past and not fully paid
- A month is "pending" if it's the current month and not yet paid

**Admission status logic:**
- Sum all payments where `payment_type = 'admission'`
- Compare against `admission_fee_total`
- Status: "Paid" if sum >= total, "Partial" if sum > 0 but < total, "Pending" if sum = 0

---

### D. Integration with Existing Revenue Page

The Revenue page (`/revenue`) gets a new "Student Payments" revenue source automatically. Student payments create entries in the `revenues` table so they show up in:
- Dashboard revenue totals and charts
- Revenue page transaction list
- Reports page analytics
- All export functions (CSV/PDF)

No changes needed to the Revenue page itself -- integration happens at the data layer.

---

### E. Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Students.tsx` | Students list page |
| `src/pages/StudentDetail.tsx` | Individual student detail page |
| `src/components/StudentDialog.tsx` | Create/edit student dialog |
| `src/components/StudentPaymentDialog.tsx` | Record payment dialog |
| `src/components/StudentMonthGrid.tsx` | Visual month grid (paid/pending/overdue) |
| `src/hooks/useStudents.ts` | Students CRUD hooks |
| `src/hooks/useStudentPayments.ts` | Payments CRUD + revenue integration hooks |

### F. Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/students` and `/students/:id` routes |
| `src/components/AppLayout.tsx` | Add "Students" nav item with GraduationCap icon |

---

### G. Security

- All new tables get RLS enabled with the same pattern as existing financial tables
- Uses existing `can_add_revenue` and `can_edit_delete` SECURITY DEFINER functions
- Moderators with `can_add_revenue` permission can add students and record payments
- Only admin/cipher can edit or delete students and payments
- `user_id` column on all tables for audit trail

---

## Phase 2 (Future -- Not in This Implementation)

- Student login portal (add `student` role to `app_role` enum)
- Student can view their own payment status and history
- Payment reminders and notifications
- Receipt PDF generation
- Fee change history tracking with effective dates
- Bulk payment operations
- Advanced analytics and charts on a dedicated student revenue dashboard
- Discount/scholarship/waiver tracking
- Late fee calculation
- Grace period settings

---

## Technical Details

### Database Migration SQL (Summary)

1. Create `student_status` enum
2. Create `students` table with RLS
3. Create `student_payments` table with RLS  
4. Create `monthly_fee_history` table with RLS
5. Add `updated_at` trigger to `students` table
6. Create a "Student Fees" revenue source (or let the hook auto-create it on first payment)

### Validation Rules

- Student name: required, 1-100 characters, trimmed
- Amount: required, positive number
- billing_start_month: required, format "YYYY-MM", must be on or after enrollment month
- months_covered: required for monthly payments, at least one month selected
- receipt_number: optional, max 50 characters
- email: optional, valid email format if provided
- phone: optional, max 20 characters

### Edge Cases Handled

- Student enrolled mid-month: admin explicitly sets first billing month
- Fee changes: `monthly_fee_history` tracks rate changes; overdue calculation uses the rate that was active for each month
- Partial payments: amount is tracked cumulatively per month; a month is "paid" only when cumulative >= rate
- Student becomes inactive: stop generating future pending months at the status change date
- Deleting a student: CASCADE deletes all payments; corresponding revenue entries remain for audit (with description noting the student)
