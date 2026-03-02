
# Fix: Audit Log Not Using Company Currency

## Problem
The audit log displays raw database amounts (stored in BDT) without applying the company's currency conversion or symbol. For example, "Amount: 5000" appears instead of "$58.82" when the company currency is set to USD.

This affects:
- Description text for payments, expenses, and transfers (e.g., `Amount: 5000`)
- DiffView showing old/new amount values as raw numbers
- DataView showing inserted/deleted record amounts as raw numbers

## Solution
Since `auditHelpers.ts` contains pure functions (not React hooks), and `useCompanyCurrency` is a hook, the currency formatting must be applied at the component level in `AuditLog.tsx`.

### Changes to `src/pages/AuditLog.tsx`

1. **Import and use `useCompanyCurrency` hook** in the main `AuditLog` component to get the `fc` (format currency) function.

2. **Update `getDescription` function** (local copy in AuditLog.tsx) to accept an optional currency formatter parameter. When provided, format amount values:
   - `student_payments`: `Amount: 5000` becomes `Amount: $58.82`
   - `expenses`: `Amount: 5000` becomes `Amount: $58.82`
   - `khata_transfers`: `Amount: 5000` becomes `Amount: $58.82`

3. **Update `formatValue` and `formatFieldValue` functions** to accept an optional currency formatter and field key. When the key is `amount`, `monthly_fee`, `admission_fee`, or other monetary fields, format with `fc()`.

4. **Pass the formatter down** to `DiffView` and `DataView` components as a prop, so monetary fields in detail dialogs also display converted values.

### Monetary field detection
Fields to format: `amount`, `monthly_fee`, `admission_fee`, `total_paid`, `balance`, `expected_monthly_expense`, `allocation_percentage` (not this one -- it's a percentage), `price`, `cost_price`, `sale_price`.

A simple approach: maintain a `MONETARY_FIELDS` set and check if the field key is in it before applying `fc()`.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/AuditLog.tsx` | Add `useCompanyCurrency`, create `MONETARY_FIELDS` set, update `getDescription`/`formatValue`/`formatFieldValue`/`DiffView`/`DataView` to format monetary values |

### No changes needed to
- `src/components/audit/auditHelpers.ts` -- the helpers there are used elsewhere too; we only fix the page-level rendering in AuditLog.tsx where the hook is available.
