
# Force Full Dashboard Toggle for Cipher Users

## Problem
If the role guards ever misfire (e.g., a Cipher user has a "moderator" membership row in a company), `isModerator` could become `true` and lock them into the limited quick-actions-only dashboard (line 461 of Dashboard.tsx). We need an escape hatch.

## Solution
Add a "Force Full Dashboard" toggle in the CompanyContext that only Cipher users can activate. When enabled, it overrides `isModerator` to `false` and `isCompanyAdmin` to `true`, ensuring full dashboard access regardless of the membership row.

## Changes

### 1. CompanyContext.tsx -- Add forceFullDashboard state

- Add `forceFullDashboard` boolean state (default: `false`)
- Add `toggleForceFullDashboard` callback
- Modify the derived role flags so that when `isCipher && forceFullDashboard`:
  - `isCompanyAdmin` stays `true` (already true for Cipher, this is a safety net)
  - `isModerator` is forced to `false`
- Expose both values on the context type
- Log activation to console for audit trail

### 2. Dashboard.tsx -- Show toggle UI for Ciphers

- Add a small banner/toggle at the top of the dashboard (only visible to Cipher users)
- When `isCipher` is true, show a Switch with label "Force Full Dashboard"
- Toggling it calls `toggleForceFullDashboard` from context
- Visual indicator: a subtle warning badge when the override is active
- The toggle also gets logged by the existing `useDashboardAccessLogger` since the `isModerator` value will change, triggering a new audit log entry

### 3. useDashboardAccessLogger.ts -- Log override activation

- Add `forceFullDashboard` to the params interface
- When `forceFullDashboard` is true, include it in the log entry so the audit trail captures when the override was used

## Technical Details

### CompanyContext.tsx changes

```
// New state
const [forceFullDashboard, setForceFullDashboard] = useState(false);
const toggleForceFullDashboard = useCallback(() => {
  setForceFullDashboard(prev => {
    const next = !prev;
    if (next) console.warn("[CIPHER OVERRIDE] Force full dashboard activated");
    else console.info("[CIPHER OVERRIDE] Force full dashboard deactivated");
    return next;
  });
}, []);

// Modified guards (lines 197-198)
const isCompanyAdmin = membership?.role === "admin" || isCipher;
const isModerator = membership?.role === "moderator" && !isCompanyAdmin 
  && !(isCipher && forceFullDashboard);
```

Since `isCipher` already makes `isCompanyAdmin = true`, the override is technically redundant in the happy path. But as a defense-in-depth measure against any future refactoring that might break the `isCipher` check, it provides an explicit manual override.

### Dashboard.tsx changes

Add a Cipher-only toggle bar between the page heading and the content:

```text
+--------------------------------------------------+
| [!] Cipher Override: Force Full Dashboard  [ON]  |
+--------------------------------------------------+
```

Only rendered when `isCipher` is true. Uses the existing Switch component.

### Files to Modify

| File | Change |
|------|--------|
| src/contexts/CompanyContext.tsx | Add forceFullDashboard state, toggle, context exposure |
| src/pages/Dashboard.tsx | Add Cipher-only toggle UI |
| src/hooks/useDashboardAccessLogger.ts | Include forceFullDashboard flag in log entry |
