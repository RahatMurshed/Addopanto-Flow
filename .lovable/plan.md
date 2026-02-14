

## Fix Currency Conversion Calculation

### Root Cause
The conversion formula in `convertAmount()` does `amount * exchangeRate`, but the semantics of `exchange_rate` are ambiguous and incorrect. Currently:

- Amounts are stored in BDT (base currency)
- If display currency is USD and admin enters "120" (meaning 1 USD = 120 BDT), the system calculates `12000 * 120 = $1,440,000` instead of `12000 / 120 = $100`
- One company already has `exchange_rate: 145.04` with `currency: BDT`, meaning it would multiply all BDT amounts by 145x

### Solution: Clear Exchange Rate Semantics

Define the exchange rate as: **"1 [display currency] = X [base currency (BDT)]"**

- Admin enters `120` meaning "1 USD = 120 BDT"
- Conversion formula becomes: `displayAmount = baseAmount / exchangeRate`
- When base and display currency are the same (BDT), rate must be 1, so `amount / 1 = amount` (correct)

### Changes

#### 1. Fix `convertAmount()` in `src/utils/currencyUtils.ts`
- Change formula from `amount * exchangeRate` to `amount / exchangeRate`
- Update rounding logic to handle division precision
- When exchange rate is 1 (same currency), skip conversion entirely for performance

#### 2. Update Settings Page UI in `src/pages/SettingsPage.tsx`
- Add clear label: "1 [selected currency] = ??? BDT" next to the exchange rate input
- When currency is BDT, auto-set exchange rate to 1 and disable the input (no conversion needed)
- Fix the live preview to use the corrected formula
- Show example: "If 1 USD = 120 BDT, enter 120"

#### 3. Fix `useCompanyCurrency.ts` -- remove `as any` cast
- The `companies_public` view now includes `exchange_rate`, so the `(activeCompany as any)?.exchange_rate` cast is unnecessary. Access it directly.

#### 4. Update test file `src/utils/__tests__/currencyUtils.test.ts`
- Update `convertAmount` tests to match the new division-based formula
- Add test: `convertAmount(12000, 120)` should return `100` (12000 BDT to USD)
- Add test: `convertAmount(1000, 1)` should return `1000` (same currency)

#### 5. Fix existing data
- The company with `exchange_rate: 145.04` and `currency: BDT` needs to be corrected to `1` (since base and display are both BDT, no conversion should happen). This will be a data update, not a migration.

### Technical Details

**Updated `convertAmount` function:**
```text
function convertAmount(amount: number, exchangeRate: number): number {
  if (!exchangeRate || exchangeRate <= 0 || exchangeRate === 1) return amount;
  return Math.round((amount / exchangeRate) * 100) / 100;
}
```

**Settings page exchange rate label:**
```text
"1 {currency} = {exchangeRate} BDT"
// When currency === "BDT", auto-set to 1 and disable input
```

**Files to modify:**
- `src/utils/currencyUtils.ts` -- fix `convertAmount` formula
- `src/utils/__tests__/currencyUtils.test.ts` -- update tests
- `src/hooks/useCompanyCurrency.ts` -- remove `as any` cast
- `src/pages/SettingsPage.tsx` -- improve UI labels, auto-set rate for BDT, fix preview

**Data fix (via insert tool):**
- Update company `2567920a-533b-4b81-bc98-fd82592aad92` to set `exchange_rate = 1` since its currency is BDT

