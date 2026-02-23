
# Enhance Error Boundaries with Retry Logic and Toast Notifications

## Current State
The project has two error boundaries already:
- **ErrorBoundary** (top-level, full-screen fallback) -- used in `App.tsx`
- **SectionErrorBoundary** (inline, per-section fallback) -- not currently used anywhere

Both are basic: they catch errors, show a message, and offer a manual retry. Neither has automatic retry, retry counting, or toast notifications.

## Changes

### 1. `src/components/layout/ErrorBoundary.tsx` -- Add retry counter, auto-retry, and toast

- Track `retryCount` in state (max 3 automatic retries)
- On error, if `retryCount < 3`, wait 1 second then auto-retry (reset `hasError`)
- After 3 failed auto-retries, show the full-screen fallback UI with the retry count displayed
- On manual "Try Again", reset the retry counter to 0
- Fire a toast notification via the `toast()` function (imported from `@/hooks/use-toast`) each time an error is caught, showing the error message. Since `toast()` is a standalone function (not a hook), it can be called from `componentDidCatch` in a class component

### 2. `src/components/layout/SectionErrorBoundary.tsx` -- Add retry counter and toast

- Track `retryCount` in state (max 2 automatic retries)
- On error, if under the limit, auto-retry after 500ms
- After exhausting retries, show the inline fallback with retry count
- Fire a `toast()` notification on each caught error
- Manual "Retry" button resets the counter

### 3. `src/App.tsx` -- Wrap lazy-loaded routes with SectionErrorBoundary

- Wrap each `Suspense` fallback route group inside `<SectionErrorBoundary>` so that a single page crash does not take down the entire app. The top-level `ErrorBoundary` remains as the last-resort catch-all.

## Technical Details

**Toast from class components:** The `toast()` function from `@/hooks/use-toast` is a standalone module-level function, so it can be called directly inside `componentDidCatch` without needing React hooks.

**Auto-retry timing:**
- Top-level: 1s delay, max 3 retries
- Section-level: 500ms delay, max 2 retries

**State shape changes:**
```
interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}
```

**Files modified:**
- `src/components/layout/ErrorBoundary.tsx`
- `src/components/layout/SectionErrorBoundary.tsx`
- `src/App.tsx`
