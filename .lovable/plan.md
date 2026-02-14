

## Fix Dynamic Currency Conversion System

### Problem Identified
The `companies_public` database view is missing `exchange_rate` and `base_currency` columns. The `CompanyContext` fetches company data from `companies_public`, so `useCompanyCurrency` always gets `undefined` for `exchange_rate` (defaulting to 1) -- meaning no conversion ever happens. Additionally, the `companies` table is not in the realtime publication, so currency changes don't propagate to other tabs.

### Plan

#### 1. Database Migration -- Fix `companies_public` view and add realtime
- Recreate the `companies_public` view to include `exchange_rate` and `base_currency` columns
- Add the `companies` table to `supabase_realtime` publication so currency changes propagate across tabs

#### 2. Update `useRealtimeSync` to listen for `companies` changes
- Add a `companies` entry to `TABLE_INVALIDATION_MAP` that invalidates `["user-companies"]` query keys
- Subscribe to `postgres_changes` on the `companies` table
- This ensures when an admin updates currency/exchange rate, all open tabs immediately refetch the company data, which flows through `CompanyContext` into `useCompanyCurrency`, triggering re-renders of all monetary displays

#### 3. Fix `StudentPaymentDialog` currency import
- The dialog imports `formatCurrency` directly from `@/utils/currencyUtils` instead of using `useCompanyCurrency`, so it doesn't apply exchange rate conversion. Update it to accept a formatter function from the parent or use the hook.

#### 4. Add exchange rate info display
- Show current exchange rate on the Dashboard header area (e.g., "1 USD = 120 BDT")
- Show the same info in payment forms so users know the current conversion context

#### 5. Payment form currency handling
- Payment amounts are entered and stored in base currency (BDT). Display the converted equivalent in the selected currency next to the input for user reference, keeping DB values untouched.

### Technical Details

**Migration SQL:**
```text
-- Recreate companies_public view with missing columns
CREATE OR REPLACE VIEW public.companies_public AS
SELECT id, name, slug, description, logo_url, currency,
       exchange_rate, base_currency,
       fiscal_year_start_month, created_by, created_at, updated_at
FROM public.companies;

-- Add companies to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
```

**Files to modify:**
- `supabase/migrations/` -- new migration for view + realtime
- `src/hooks/useRealtimeSync.ts` -- add `companies` subscription
- `src/components/StudentPaymentDialog.tsx` -- use currency hook or accept formatter prop
- `src/pages/Dashboard.tsx` -- add exchange rate info display
- `src/contexts/CompanyContext.tsx` -- no changes needed (already reads exchange_rate from company object; it just wasn't in the view)

