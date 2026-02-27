

# Fix Employee Workflow (Attendance, Performance, Leaves)

## Root Cause

The **attendance calendar** is broken due to a date query bug. The `useEmployeeAttendance` hook queries with `.lte("date", "${month}-31")` -- but months like February don't have 31 days, causing a **400 error** from the database (`date/time field value out of range: "2026-02-31"`).

This cascading failure means:
- Attendance calendar shows no data for Feb (and other short months)
- The attendance tab appears non-functional
- Performance data (which uses a separate, correct query via `useEmployeePerformance`) actually works fine

There is also a minor React warning about `AlertDialog` being given a ref without `forwardRef`.

## Fix

### 1. Fix date range in `useEmployeeAttendance` (`src/hooks/useEmployees.ts`)

**Current (broken):**
```typescript
query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
```

**Fixed:** Use `date-fns` to compute the actual last day of the month:
```typescript
import { endOfMonth, format } from "date-fns";

const lastDay = format(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");
query = query.gte("date", `${month}-01`).lte("date", lastDay);
```

This correctly handles February (28/29 days), April/June/Sep/Nov (30 days), etc.

### 2. Fix AlertDialog ref warning in `EmployeeDetail.tsx`

The `AlertDialog` component in the salary and leaves tables is being rendered inline without proper wrapping. Wrap the `AlertDialogTrigger` pattern correctly to avoid the ref forwarding warning.

## How Performance Score Is Calculated

The performance score (from `useEmployeePerformance.ts`) works as follows:

1. **Working Days**: For each of the last 6 months, count all non-Sunday days (Mon-Sat)
2. **Effective Days**: `days present + (half days x 0.5)`
3. **Attendance %**: `(effective days / working days) x 100`, capped at 100%
4. **Average Attendance**: Mean of the 6 monthly attendance percentages
5. **Salary Score** (if salary visible): `(months with salary paid / total months) x 100`
6. **Overall Score**:
   - If salary is visible: `(attendance x 0.7) + (salary score x 0.3)`
   - If salary is hidden: just the attendance score

So an employee present every working day with all salary months paid scores 100. Sundays are excluded from working days. Leave days and absent days reduce the score. Half days count as 0.5.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useEmployees.ts` | Fix date range query to use actual end-of-month |
| `src/pages/EmployeeDetail.tsx` | Fix AlertDialog ref warning |

