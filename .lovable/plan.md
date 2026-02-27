

# Fix Payment Rate and Revenue Projection in LifetimeValueBanner

## Root Cause Analysis

### Bug 1: Payment Rate shows 83% instead of ~63%

**Traced data for this student:**
- Student record: `admission_fee_total=0`, `monthly_fee_amount=0` (zeros -- relies on batch defaults)
- Batch record: `default_admission_fee=2500`, `default_monthly_fee=1250`, `course_duration_months=4`
- Total paid (all payments): 2500 + 1250 + 250 + 1000 + 1250 = **6,250**

**Current calculation in `computeLifetimeMetrics`:**
```
totalCourseFee = 2500 + (4 x 1250) = 7,500
paymentRate = round(6250 / 7500 * 100) = 83%
```

**Why it's wrong:** The Financial Summary card correctly computes totalExpected as **10,000** because it counts actual billing months (6 months from `billing_start_month="2026-01"` to `course_end_month="2026-06"` derived from batch), not `course_duration_months` (4). The metrics function only uses `course_duration_months` which undercounts the billing period, inflating the percentage.

**Fix:** Pass `totalExpected` from the parent `StudentProfilePage` as a prop to `LifetimeValueBanner`, and use it as the denominator. This ensures the banner and the Financial Summary card always agree on the same number.

### Bug 2: Revenue Projection shows 0 instead of ~3,750

**Traced calculation:**
- `futureUnpaidPayments` query returns `[]` (all existing payments have `status='paid'`)
- Falls back to time-based calculation:
  - `batchTotalFee = 2500 + (4 x 1250) = 7500`
  - `monthlyFee = 7500 / 4 = 1875` (wrong -- mixes admission into monthly fee)
  - `remainingMonths = 4` (Feb to June 2026)
  - `paidMonths = 5` (counts ALL payments including admission)
  - `unpaidMonths = max(0, 4 - 5) = 0` -- hence projection is 0

**Two bugs in the fallback:**
1. `monthlyFee` includes admission fee divided across months (should be pure monthly fee only)
2. `paidMonths` counts all payments including admission (should only count monthly-type payments)

**Fix:** Use `default_monthly_fee` directly as the monthly rate. Count only `payment_type === "monthly"` payments for paidMonths.

---

## Implementation Plan

### 1. Update `StudentProfilePage.tsx`
- Pass `totalExpected` from the already-computed `summary` object as a new prop to `LifetimeValueBanner`

### 2. Update `LifetimeValueBanner.tsx`
- Add `totalExpected?: number` to the props interface
- Pass it through to `computeLifetimeMetrics` as a new parameter

### 3. Update `computeLifetimeMetrics` in `src/utils/studentMetrics.ts`

**Payment Rate fix:**
- Add optional `totalExpected?: number` parameter
- If provided, use it as the denominator; otherwise fall back to current batch-based calculation

**Revenue Projection fix:**
- Change `monthlyFee` to use `batch.default_monthly_fee` directly (not batchTotalFee / duration)
- Change `paidMonths` to only count payments where `payment_type === "monthly"`
- Calculate `totalRemainingMonths` from batch end_date minus current month
- `unpaidMonths = max(0, totalRemainingMonths - monthlyPaidCount)`
- `revenueProjection = unpaidMonths * monthlyFee + unpaidAdmission`
  - Where `unpaidAdmission = max(0, effectiveAdmissionFee - admissionPaid)`

This ensures the projection accounts for both unpaid monthly fees AND any unpaid admission balance.

