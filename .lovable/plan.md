

## Hide Revenue/Expense Data from DEOs Unless View Permission Granted

### Problem
Data Entry Operators with "Add Revenue" or "Add Expense" permission can currently see the full history table of all revenue/expense entries. They should only see the Add form -- the history/table should be hidden unless a separate "view" permission is granted by an admin.

### Solution
Add new `can_view_revenue` and `can_view_expense` columns to the `company_memberships` table, expose them in the frontend, and conditionally hide the history tables for DEOs without view permission.

---

### Changes

#### 1. Database Migration
Add two new boolean columns to `company_memberships`:
- `can_view_revenue` (default false)
- `can_view_expense` (default false)

#### 2. CompanyContext (`src/contexts/CompanyContext.tsx`)
- Add `canViewRevenue` and `canViewExpense` to the `CompanyMembership` interface and context type
- Compute them: admin/cipher always true, DEO checks column value

#### 3. Revenue Page (`src/pages/Revenue.tsx`)
- Update route guard: allow access if DEO has `canAddRevenue` OR `canViewRevenue`
- Hide the revenue history table, search/filter controls, and date filter when DEO lacks `canViewRevenue`
- Show only the Add Revenue button and dialog for add-only DEOs

#### 4. Expenses Page (`src/pages/Expenses.tsx`)
- Same pattern: allow access if `canAddExpense` OR `canViewExpense`
- Hide expense history table when DEO lacks `canViewExpense`

#### 5. Admin Permission Matrix
- Find the operator permission management UI and add toggle rows for the two new view permissions so admins can grant them

### Technical Details

**Database SQL:**
```sql
ALTER TABLE public.company_memberships
  ADD COLUMN can_view_revenue boolean NOT NULL DEFAULT false,
  ADD COLUMN can_view_expense boolean NOT NULL DEFAULT false;
```

**Revenue page conditional rendering (DEO with add-only):**
- Show: page header, Add Revenue button, dialog
- Hide: date filter, summary cards, revenue-by-source, allocation info, revenue history table, search/sort controls, export buttons, pagination

**Files to modify:**
- New migration file (database)
- `src/contexts/CompanyContext.tsx` -- add canViewRevenue, canViewExpense
- `src/pages/Revenue.tsx` -- wrap table/filters in canViewRevenue check
- `src/pages/Expenses.tsx` -- wrap table/filters in canViewExpense check
- Operator permission matrix component (to add toggle UI for admins)

