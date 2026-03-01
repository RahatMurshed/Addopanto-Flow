

# Sentry Error Tracking Integration

## Overview
Install `@sentry/react`, initialize it in `main.tsx`, integrate with existing error boundaries, and add PII scrubbing to protect sensitive student data.

## Changes

### 1. Install dependency
- Add `@sentry/react` to `package.json`

### 2. Create Sentry configuration module
**New file: `src/lib/sentry.ts`**
- Initialize Sentry with `Sentry.init()` reading DSN from `import.meta.env.VITE_SENTRY_DSN`
- Only initialize when DSN is present (skip in dev when left empty)
- Set `tracesSampleRate: 0.1` (10% of transactions)
- Configure `beforeSend` callback to scrub PII fields:
  - Strip `phone`, `email`, `address`, `guardian_name`, `guardian_phone`, `name`, `student_name` from event `extra`, `contexts`, and breadcrumb data
  - Replace matched values with `[REDACTED]`
- Export a `captureException` wrapper for use across the app

### 3. Update `src/main.tsx`
- Import `src/lib/sentry.ts` at the top (side-effect import triggers init)
- Replace `console.warn` in unhandled rejection handler with `Sentry.captureException`

### 4. Update `src/components/layout/ErrorBoundary.tsx`
- Add `Sentry.captureException(error, { contexts: { react: { componentStack } } })` inside `componentDidCatch`
- This sends every caught error to Sentry alongside the existing logger + toast

### 5. Update `src/components/layout/CriticalRouteErrorBoundary.tsx`
- Same pattern: add `Sentry.captureException(error)` in `componentDidCatch`

### 6. Update `src/components/layout/SectionErrorBoundary.tsx`
- Same pattern: add `Sentry.captureException(error)` in `componentDidCatch`

### 7. Environment variable
- Add `VITE_SENTRY_DSN=""` to `.env.example` as documentation
- In production, set the real DSN value. When empty, Sentry silently does nothing.

## Technical Details

**PII scrubbing (`beforeSend`):**
```text
const PII_KEYS = new Set([
  "phone", "email", "address", "name", "student_name",
  "guardian_name", "guardian_phone", "guardian_email",
  "date_of_birth"
]);

function scrubPii(obj) {
  // recursively walk obj keys, replace any PII_KEYS values with "[REDACTED]"
}
```

**No Sentry.ErrorBoundary wrapper needed** -- the existing custom `ErrorBoundary` already catches all errors. Adding `Sentry.captureException` inside `componentDidCatch` achieves the same result without replacing the custom UI.

### Files modified
| File | Action |
|---|---|
| `package.json` | Add `@sentry/react` dependency |
| `src/lib/sentry.ts` | New -- init + PII scrubbing config |
| `src/main.tsx` | Import sentry init, capture unhandled rejections |
| `src/components/layout/ErrorBoundary.tsx` | Add captureException |
| `src/components/layout/CriticalRouteErrorBoundary.tsx` | Add captureException |
| `src/components/layout/SectionErrorBoundary.tsx` | Add captureException |
| `.env.example` | Add VITE_SENTRY_DSN |

