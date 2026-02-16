
## Fix Course RLS Policies - Swapped Arguments

### Problem
Course creation fails with "new row violates row-level security policy" because all three write RLS policies on the `courses` table have the function arguments in the wrong order.

The functions `company_can_add_batch`, `company_can_edit_batch`, and `company_can_delete_batch` all expect `(user_id, company_id)`, but the policies pass `(company_id, user_id)`.

### Root Cause
In the original migration, the policies were written as:
```sql
company_can_add_batch(company_id, auth.uid())  -- WRONG
```
But the function signature is:
```sql
company_can_add_batch(_user_id uuid, _company_id uuid)  -- expects user first
```

### Fix
A single database migration to drop and recreate the three policies with corrected argument order:

**New migration file:**

| Policy | Current (broken) | Fixed |
|---|---|---|
| INSERT | `company_can_add_batch(company_id, auth.uid())` | `company_can_add_batch(auth.uid(), company_id)` |
| UPDATE | `company_can_edit_batch(company_id, auth.uid())` | `company_can_edit_batch(auth.uid(), company_id)` |
| DELETE | `company_can_delete_batch(company_id, auth.uid())` | `company_can_delete_batch(auth.uid(), company_id)` |

### Files Changed
Only a new SQL migration file. No application code changes needed.
