
# Fix: Transfer History Not Using Company Currency

## Problem
The `TransferHistoryCard` component has the BDT currency symbol (`৳`) hardcoded in three places, so it ignores the company's chosen currency and exchange rate. This affects the Expense Sources (Khatas) page, Expenses page, and Reports page.

## Fix
Import and use the `useCompanyCurrency` hook inside `TransferHistoryCard.tsx` to format all monetary values with proper currency conversion.

## File Changed
**`src/components/finance/TransferHistoryCard.tsx`**

Three hardcoded currency references will be replaced:

1. **Line 194** (table amount column): `৳{Number(transfer.amount).toLocaleString()}` becomes `{fc(Number(transfer.amount))}`
2. **Line 249** (footer total): `৳{totalAmount.toLocaleString()}` becomes `{fc(totalAmount)}`
3. **Line 290** (detail dialog amount): `` `৳${Number(viewingTransfer.amount).toLocaleString()}` `` becomes `fc(Number(viewingTransfer.amount))`

One new import is added at the top:
```typescript
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
```

And inside the component, one line is added:
```typescript
const { fc } = useCompanyCurrency();
```

This ensures all transfer amounts are converted using the company's exchange rate and displayed with the correct currency symbol, consistent with the rest of the application.
