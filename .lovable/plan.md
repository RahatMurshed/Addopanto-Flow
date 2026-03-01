

# Fix: Expense Sort Order Tiebreaker

## Problem

When sorting by "Date Newest" or "Date Oldest", expenses with the same date appear in random/unstable order because the sort only compares the `date` field (a date-only string like "2026-03-03"). Many expenses share the same date, so without a secondary sort key, the browser's sort algorithm produces inconsistent ordering that can appear reversed.

## Solution

Add `created_at` as a tiebreaker in the sort logic in `src/pages/Expenses.tsx`. When two expenses have the same date, the one created more recently should appear first for "Date Newest" and last for "Date Oldest".

### Change in `src/pages/Expenses.tsx` (lines 165-172)

**Current:**
```typescript
result = [...result].sort((a, b) => {
  switch (sortBy) {
    case "date-asc": return a.date.localeCompare(b.date);
    case "date-desc": return b.date.localeCompare(a.date);
    case "amount-desc": return Number(b.amount) - Number(a.amount);
    case "amount-asc": return Number(a.amount) - Number(b.amount);
    default: return b.date.localeCompare(a.date);
  }
});
```

**Updated:**
```typescript
result = [...result].sort((a, b) => {
  switch (sortBy) {
    case "date-asc":
      return a.date.localeCompare(b.date) || (a.created_at ?? "").localeCompare(b.created_at ?? "");
    case "date-desc":
      return b.date.localeCompare(a.date) || (b.created_at ?? "").localeCompare(a.created_at ?? "");
    case "amount-desc":
      return Number(b.amount) - Number(a.amount);
    case "amount-asc":
      return Number(a.amount) - Number(b.amount);
    default:
      return b.date.localeCompare(a.date) || (b.created_at ?? "").localeCompare(a.created_at ?? "");
  }
});
```

This ensures a stable, deterministic sort order by using `created_at` (a full timestamp) as a tiebreaker when expenses share the same date.

## Files affected
- `src/pages/Expenses.tsx` -- update sort comparator (~8 lines changed)
