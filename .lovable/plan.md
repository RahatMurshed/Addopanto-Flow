

# Fix: Expense Sort Dropdown State Issue

## Problem

The sort dropdown on the Expenses page behaves erratically -- selecting "Date Oldest" can revert back to a previous value (like "Amount High"), and the default "Date Newest" may appear to show data in the wrong order. The session replay confirms the dropdown selection reverts within ~120ms of the user's click.

## Root Cause

The `sortBy` state is stored as local React state (`useState`). When the `AdvancedDateFilter` component updates URL search params (via `useSearchParams`), it can trigger a re-render cascade in the Expenses component. Combined with the `useEffect` that calls `pagination.resetPage()` on every `sortBy` change, this creates a race condition where the state update from the Select dropdown gets lost during the re-render.

## Fix

**Persist `sortBy` and `accountFilter` in URL search params** instead of local state. This makes them survive re-renders caused by the date filter's search param updates and keeps filter state bookmarkable.

### Changes in `src/pages/Expenses.tsx`:

1. Read `sortBy` and `accountFilter` from URL search params (via `useSearchParams`) instead of `useState`
2. Write updates back to the URL using `setSearchParams` with `replace: true`
3. Remove the `useEffect` that resets pagination on sort/filter change -- instead, reset page inline when the user changes filters
4. This eliminates the re-render race condition since the sort value lives in the URL (the single source of truth), not in ephemeral React state

### Detailed approach:

- Extract `sortBy` from `searchParams.get("sortBy") || "date-desc"` 
- Extract `accountFilter` from `searchParams.get("account") || "all"`
- Create setter functions that update search params: `setSortBy` updates the `sortBy` param and resets page to 1
- Remove the `useEffect` for `pagination.resetPage()` -- handle page reset inside the setter callbacks
- Keep the existing sort logic (`localeCompare` for dates, numeric comparison for amounts) unchanged since it is correct

