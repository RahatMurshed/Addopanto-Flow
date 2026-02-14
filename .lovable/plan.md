

## Add "Data Entry Operator" Role with Granular Permissions

This is a major feature spanning database schema, backend authorization, frontend routing, navigation, permission UI, and dedicated data entry pages. Here's the full implementation plan.

---

### Phase 1: Database Schema Changes

**1.1 Add `data_entry_operator` to the `company_role` enum:**
```text
ALTER TYPE company_role ADD VALUE 'data_entry_operator';
```

**1.2 Add granular permission columns to `company_memberships`:**

New boolean columns (all default `false`):
- `can_add_student`
- `can_edit_student`
- `can_delete_student`
- `can_add_payment`
- `can_edit_payment`
- `can_delete_payment`
- `can_add_batch`
- `can_edit_batch`
- `can_delete_batch`
- `can_edit_revenue`
- `can_delete_revenue`
- `can_edit_expense`
- `can_delete_expense`

Existing columns already cover: `can_add_revenue`, `can_add_expense`, `can_add_expense_source`, `can_transfer`, `can_view_reports`, `can_manage_students`.

**1.3 Add RLS helper functions for new permissions:**

Create `SECURITY DEFINER` functions like `company_can_add_student(_user_id, _company_id)`, `company_can_edit_student(...)`, etc. Each checks if user is admin/cipher (always true) OR has the specific permission column set to true on their membership.

**1.4 Update existing RLS policies:**

Currently, edit/delete policies use `company_can_edit_delete()` which only checks admin role. Update student, batch, revenue, expense table policies to check the new granular functions instead for UPDATE and DELETE operations. INSERT policies for students will check `company_can_add_student()` in addition to existing checks.

---

### Phase 2: Frontend Permission System Updates

**2.1 Update `CompanyContext` (`src/contexts/CompanyContext.tsx`):**

Add new permission properties derived from membership:
```text
// New permissions from membership
canAddStudent, canEditStudent, canDeleteStudent,
canAddPayment, canEditPayment, canDeletePayment,
canAddBatch, canEditBatch, canDeleteBatch,
canEditRevenue, canDeleteRevenue,
canEditExpense, canDeleteExpense,
isDataEntryOperator (membership.role === 'data_entry_operator')
```

Admin and Cipher automatically get all permissions (same pattern as existing).

**2.2 Update `CompanyMembership` interface:**

Add the new boolean fields to match the updated database schema.

---

### Phase 3: Data Entry Operator Dashboard

**3.1 Modify `Dashboard.tsx`:**

When user `isDataEntryOperator`:
- Hide all analytics cards (total revenue, expenses, profit, balance)
- Hide all charts (area chart, pie chart)
- Hide recent transactions table
- Show a "Quick Actions" grid instead with large action cards for permitted operations only

Quick action cards (shown only if permission granted):
- "Add Student" (links to student dialog)
- "Record Payment" (links to payment dialog)
- "Create Batch" (links to batch dialog)
- "Add Revenue" (links to revenue dialog)
- "Add Expense" (links to expense dialog)

Each card has an icon, title, and brief description. Cards not permitted are hidden entirely.

**3.2 Empty state for no permissions:**

If Data Entry Operator has zero permissions enabled, show a friendly message: "Your admin hasn't assigned any permissions yet. Please contact your business administrator."

---

### Phase 4: Navigation Sidebar Changes

**4.1 Update `AppLayout.tsx` navigation:**

For Data Entry Operators:
- Always show: Dashboard (their quick-actions hub)
- Conditionally show based on permissions:
  - "Students" only if `canAddStudent || canEditStudent || canDeleteStudent`
  - "Batches" only if `canAddBatch || canEditBatch || canDeleteBatch`
  - "Revenue" only if `canAddRevenue || canEditRevenue || canDeleteRevenue`
  - "Expenses" only if `canAddExpense || canEditExpense || canDeleteExpense`
  - "Expense Sources" only if `canAddExpenseSource`
- Always hide: Reports, Requests, Members, Platform Users, Settings
- Hide company switcher (operator is locked to their assigned company)

---

### Phase 5: Page-Level Access Control

**5.1 Modify existing pages for Data Entry Operators:**

Each page (Students, Batches, Revenue, Expenses) will check if the user is a Data Entry Operator and restrict what they see:

**Students page (`Students.tsx`):**
- If operator: Show minimal list (Name + Student ID only, no financial columns like fees, payment status, overdue amounts)
- Hide: Overdue section, payment summary columns, financial totals
- Show "Add Student" button only if `canAddStudent`
- Show "Edit" action only if `canEditStudent`
- Show "Delete" action only if `canDeleteStudent`
- Hide "View Details" link (no access to StudentDetail page)
- Hide payment dialog trigger

**Batches page (`Batches.tsx`):**
- If operator: Show minimal list (Batch name + code + status only, no financial stats)
- Hide: Fee columns, student counts with financial breakdowns, summary cards
- Show "Add Batch" only if `canAddBatch`
- Show "Edit" only if `canEditBatch`
- Show "Delete" only if `canDeleteBatch`
- Hide "View Details" link

**Revenue page (`Revenue.tsx`):**
- If operator: Hide existing revenue table and totals
- Show "Add Revenue" button only if `canAddRevenue`
- Show edit/delete on individual entries only if `canEditRevenue`/`canDeleteRevenue`
- Hide summary cards and charts

**Expenses page (`Expenses.tsx`):**
- Same pattern as Revenue

**5.2 Block access to restricted pages:**

Add redirects for Data Entry Operators on:
- `/reports` - redirect to `/dashboard`
- `/settings` - redirect to `/dashboard`
- `/requests` - redirect to `/dashboard`
- `/company/members` - redirect to `/dashboard`
- `/users` - redirect to `/dashboard`
- `/students/:id` (StudentDetail) - redirect unless `canEditStudent`
- `/batches/:id` (BatchDetail) - redirect unless `canEditBatch`

---

### Phase 6: Permission Management UI

**6.1 Update `CompanyMembers.tsx` member table:**

Add `data_entry_operator` to the role selector dropdown. When a member has this role, show an expanded permission matrix below their row or in a modal.

**6.2 Create Permission Matrix component:**

A grouped checkbox UI shown when managing a Data Entry Operator:

```text
Student Management
  [ ] Add Student  [ ] Edit Student  [ ] Delete Student

Payment Management
  [ ] Add Payment  [ ] Edit Payment  [ ] Delete Payment

Batch Management
  [ ] Add Batch  [ ] Edit Batch  [ ] Delete Batch

Revenue Management
  [ ] Add Revenue  [ ] Edit Revenue  [ ] Delete Revenue

Expense Management
  [ ] Add Expense  [ ] Edit Expense  [ ] Delete Expense

Other
  [ ] Add Expense Source  [ ] Transfer Between Accounts
```

Each toggle updates the `company_memberships` row via the existing `updateMemberMutation`.

---

### Phase 7: Role Badge and UI Polish

**7.1 Update `UserRoleBadge.tsx`:**

Add a "Data Entry Operator" badge with a distinct color (e.g., teal/cyan gradient) and a `Keyboard` or `PenLine` icon.

**7.2 Update `CompanyMembers.tsx` `roleBadge` function:**

Add styling for the `data_entry_operator` role.

---

### Phase 8: Realtime and Audit

The existing `useRealtimeSync` hook already listens to all core tables and invalidates caches. Data entered by operators will automatically appear in admin/moderator views through the existing realtime system.

Currency conversion is already handled by `useCompanyCurrency` hook which is used in all form components -- no additional work needed.

---

### Files to Create
- `src/components/OperatorPermissionMatrix.tsx` -- grouped checkbox permission editor

### Files to Modify
- Database migration (new enum value + 13 new columns + helper functions + updated RLS)
- `src/contexts/CompanyContext.tsx` -- add new permissions
- `src/components/AppLayout.tsx` -- conditional nav for operators
- `src/pages/Dashboard.tsx` -- operator quick-actions view
- `src/pages/Students.tsx` -- restricted view for operators
- `src/pages/Batches.tsx` -- restricted view for operators
- `src/pages/Revenue.tsx` -- restricted view for operators
- `src/pages/Expenses.tsx` -- restricted view for operators
- `src/pages/Reports.tsx` -- block access for operators
- `src/pages/StudentDetail.tsx` -- block/restrict access
- `src/pages/BatchDetail.tsx` -- block/restrict access
- `src/pages/CompanyMembers.tsx` -- add operator role + permission matrix
- `src/components/UserRoleBadge.tsx` -- add operator badge
- `src/App.tsx` -- no route changes needed (access control is page-level)

### Estimated Scope
This is a large feature touching 15+ files with significant database schema changes, new RLS policies, and UI modifications across most pages. Implementation will be done systematically starting with the database layer, then permissions context, then UI changes.

