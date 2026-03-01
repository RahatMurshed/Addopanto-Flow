

# Fix: DEO Moderator Seeing ৳0 Balance in Expense Accounts

## Problem

When a DEO (Data Entry Only) moderator opens the "Add Expense" dialog, all expense source balances show "৳0 available." This is because `useAccountBalances()` fetches from three tables -- `allocations`, `expenses`, and `khata_transfers` -- all of which have RLS policies that block DEO moderators from reading data (`NOT is_data_entry_moderator(...)`). Since the balance is computed client-side as `allocations - expenses - transfers`, and all three queries return empty arrays, the balance appears as zero.

The moderator CAN add expenses (they have `mod_expenses_add` permission), but they can't see the correct available balance to make informed decisions.

## Solution

Create a `SECURITY DEFINER` database function `get_account_balances(p_company_id uuid)` that computes balances server-side, bypassing RLS. This function will:

1. Verify the caller is a member of the company (security check).
2. Query `expense_accounts`, `allocations`, `expenses`, and `khata_transfers` directly.
3. Return the computed balances (id, name, color, allocation_percentage, expected_monthly_expense, is_active, total_allocated, total_spent, balance).

Then update `useAccountBalances()` in `src/hooks/useExpenses.ts` to call this RPC function instead of making four separate client-side queries.

## Technical Details

### 1. Database migration -- Create RPC function

```sql
CREATE OR REPLACE FUNCTION public.get_account_balances(p_company_id uuid)
RETURNS TABLE (
  id uuid, name text, color text,
  allocation_percentage numeric,
  expected_monthly_expense numeric,
  is_active boolean,
  total_allocated numeric,
  total_spent numeric,
  balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: caller must be a company member
  IF NOT is_company_member(auth.uid(), p_company_id) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  RETURN QUERY
  SELECT
    ea.id, ea.name, ea.color,
    ea.allocation_percentage,
    ea.expected_monthly_expense,
    ea.is_active,
    COALESCE(alloc.total, 0) + COALESCE(tin.total, 0) AS total_allocated,
    COALESCE(exp.total, 0) + COALESCE(tout.total, 0) AS total_spent,
    COALESCE(alloc.total, 0) + COALESCE(tin.total, 0)
      - COALESCE(exp.total, 0) - COALESCE(tout.total, 0) AS balance
  FROM expense_accounts ea
  LEFT JOIN LATERAL (
    SELECT sum(a.amount) AS total FROM allocations a
    WHERE a.expense_account_id = ea.id AND a.company_id = p_company_id
  ) alloc ON true
  LEFT JOIN LATERAL (
    SELECT sum(e.amount) AS total FROM expenses e
    WHERE e.expense_account_id = ea.id AND e.company_id = p_company_id
  ) exp ON true
  LEFT JOIN LATERAL (
    SELECT sum(t.amount) AS total FROM khata_transfers t
    WHERE t.to_account_id = ea.id AND t.company_id = p_company_id
  ) tin ON true
  LEFT JOIN LATERAL (
    SELECT sum(t.amount) AS total FROM khata_transfers t
    WHERE t.from_account_id = ea.id AND t.company_id = p_company_id
  ) tout ON true
  WHERE ea.company_id = p_company_id;
END;
$$;
```

### 2. Update `src/hooks/useExpenses.ts`

Replace the `useAccountBalances()` hook body to call `supabase.rpc('get_account_balances', { p_company_id: activeCompanyId })` instead of making four separate table queries. Map the result to the existing `AccountBalance` type.

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | Create `get_account_balances` RPC function |
| `src/hooks/useExpenses.ts` | Rewrite `useAccountBalances()` to use RPC |

This approach fixes the issue for DEO moderators while maintaining all existing RLS protections on the underlying tables. The `SECURITY DEFINER` function ensures the balance computation sees all data, but only after verifying company membership.

