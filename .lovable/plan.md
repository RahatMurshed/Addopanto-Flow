
# Dedicated Critical Route Error Boundary

## Problem / Motivation

The app currently uses a generic top-level `ErrorBoundary` and a lightweight `SectionErrorBoundary`. Critical routes that handle financial data (Dashboard, Khatas, Revenue, Expenses, Reports) and sensitive student records deserve a specialized error boundary that provides more context, stricter retry limits, and a graceful degradation path instead of a generic "something went wrong" screen.

## Current State

- `src/components/layout/ErrorBoundary.tsx` -- top-level, 3 auto-retries, full-screen fallback
- `src/components/layout/SectionErrorBoundary.tsx` -- inline, 2 auto-retries, minimal fallback
- `src/App.tsx` -- wraps all protected route content in a single `SectionErrorBoundary` inside `CompanyGuard`

There is no distinction between a crash on the Dashboard (critical, financial data) vs. a crash on the Profile page (low-impact).

## Solution

Create a new `CriticalRouteErrorBoundary` component tailored for high-value routes. It will have a lower retry limit (2 retries with exponential backoff), a richer fallback UI showing the route name and a "return to safety" option, and persistent toast notifications. Then wrap the critical routes in `App.tsx` with this boundary.

## Changes

### 1. `src/components/layout/CriticalRouteErrorBoundary.tsx` -- New file

- Class component extending `Component` with error boundary lifecycle
- Props: `children`, `routeName` (display label like "Dashboard"), `fallbackPath` (safe route to navigate to, defaults to `/dashboard`)
- State: `hasError`, `error`, `retryCount`, `lastErrorTime`
- **Auto-retry**: max 2 retries with exponential backoff (1s, then 2s)
- **Toast**: fires a destructive toast on each caught error with the route name in the title
- **Fallback UI**: card-based layout showing:
  - Route name that failed (e.g., "Dashboard failed to load")
  - Error message (truncated)
  - Number of retry attempts made
  - Timestamp of last error
  - "Try Again" button (resets retry counter)
  - "Go to Dashboard" / safe route button (navigates away from broken page)
  - "Reload Page" button (hard reload)
- Timeout cleanup in `componentWillUnmount`

### 2. `src/App.tsx` -- Wrap critical routes

- Import `CriticalRouteErrorBoundary`
- Wrap the following routes individually with `CriticalRouteErrorBoundary` (inside `ProtectedRoute`, around the page component):
  - `/dashboard` with `routeName="Dashboard"`
  - `/khatas` with `routeName="Accounts"`
  - `/revenue` with `routeName="Revenue"`
  - `/expenses` with `routeName="Expenses"`
  - `/reports` with `routeName="Reports"`
  - `/students` with `routeName="Students"`
- The existing `SectionErrorBoundary` in `CompanyGuard` remains as a catch-all for non-critical routes

## Technical Details

- **Exponential backoff**: retry delays are `RETRY_DELAY * 2^retryCount` (1000ms, 2000ms) to avoid hammering a broken component
- **Safe navigation**: the "Go to safety" button uses `window.location.href` (not React Router navigate) to ensure a clean re-mount, avoiding stale error state
- **No PII in error display**: error messages are truncated to 120 chars and only the `.message` property is shown (no stack traces in production)
- **Toast deduplication**: each toast includes the route name so the user knows which section failed
- **Patterns**: follows the same class component pattern as the existing `ErrorBoundary` and `SectionErrorBoundary`

## Testing Checklist

| # | Test | Expected Result | Pass |
|---|------|----------------|------|
| 1 | Trigger error on Dashboard | Shows "Dashboard failed to load" fallback after 2 retries | |
| 2 | Click "Try Again" on fallback | Resets retry counter, re-renders children | |
| 3 | Click "Go to Dashboard" from Revenue error | Navigates to /dashboard cleanly | |
| 4 | Toast fires on error | Destructive toast shows with route name | |
| 5 | Non-critical route error | Falls through to SectionErrorBoundary, not CriticalRouteErrorBoundary | |

## Files Modified

- `src/components/layout/CriticalRouteErrorBoundary.tsx` (new)
- `src/App.tsx`

## Rollback Notes

- Delete `src/components/layout/CriticalRouteErrorBoundary.tsx`
- Remove the `CriticalRouteErrorBoundary` wrappers from the routes in `App.tsx`; the existing `SectionErrorBoundary` in `CompanyGuard` will continue to catch all errors
