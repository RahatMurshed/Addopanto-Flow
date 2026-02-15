

## Add Revenue Source Selection to Student Payment Dialog

### What will change

When recording a student payment, users will be able to select a **revenue source** (category) from the existing revenue sources list. Currently, the database trigger hardcodes "Student Fees" as the source for all student payments. This change gives users flexibility to categorize payments under any revenue source.

Additionally, revenues that currently have no source assigned will display as "Uncategorized" consistently across the app (this is already partially done on the Revenue page but needs consistency).

### Implementation Details

**1. Add `source_id` column to `student_payments` table**
- New migration: `ALTER TABLE public.student_payments ADD COLUMN source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL;`
- This column is optional (nullable) -- when null, the trigger falls back to the existing "Student Fees" auto-creation logic

**2. Update the database trigger `sync_student_payment_revenue()`**
- Modify the trigger to use `NEW.source_id` when provided, instead of always looking up/creating "Student Fees"
- Fallback: if `NEW.source_id IS NULL`, keep the current behavior (find or create "Student Fees")
- On UPDATE: if `source_id` changed, also update the linked revenue's `source_id`

**3. Update `StudentPaymentDialog.tsx`**
- Add a "Revenue Source" dropdown (Select component) after Payment Method
- Fetch revenue sources using `useRevenueSources()` hook
- Default to the "Student Fees" source if one exists, otherwise null
- Allow "Add new source" inline (same pattern as RevenueDialog -- input + plus button)
- Pass the selected `source_id` in the payment data

**4. Update `useStudentPayments.ts`**
- Add `source_id?: string | null` to the `StudentPaymentInsert` interface
- Pass it through in the insert mutation

**5. Display "Uncategorized" consistently**
- On the Revenue page table, revenues without a `source_id` already show source name from the join. Ensure "Uncategorized" badge appears for null sources
- On the Expenses page, expense entries already require an `expense_account_id` (mandatory), so no change needed there
- In the Revenue by Source breakdown card, group null-source revenues under "Uncategorized"

### Technical Details

**Migration SQL:**
```sql
-- Add source_id to student_payments
ALTER TABLE public.student_payments 
  ADD COLUMN source_id uuid REFERENCES public.revenue_sources(id) ON DELETE SET NULL;

-- Update trigger to respect source_id from payment
CREATE OR REPLACE FUNCTION public.sync_student_payment_revenue() ...
  -- Use NEW.source_id if provided, else fallback to "Student Fees" auto-create
```

**StudentPaymentDialog changes:**
- Import `useRevenueSources`, `useCreateRevenueSource` from hooks
- Add source selector UI between Payment Method and Receipt Number fields
- Pre-select "Student Fees" source by default (find by name in sources list)
- Include inline "add source" input matching the RevenueDialog pattern

**Revenue page "Uncategorized" handling:**
- In the "Revenue by Source" breakdown, add a row for revenues where `source_id` is null, labeled "Uncategorized"
- In the table, show "Uncategorized" badge when `revenue_sources` is null

### Files to modify

- **New migration** -- add `source_id` column to `student_payments`, update trigger
- `src/hooks/useStudentPayments.ts` -- add `source_id` to insert type
- `src/components/StudentPaymentDialog.tsx` -- add source selector UI
- `src/pages/Revenue.tsx` -- ensure "Uncategorized" handling in source breakdown

