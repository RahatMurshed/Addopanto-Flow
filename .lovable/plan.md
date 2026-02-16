

# Real-Time Dashboard Access Audit for Ciphers

## Overview
Create a new Cipher-only page that shows a live audit trail of dashboard/page access events across all companies, with anomaly detection (e.g., a Cipher routed to moderator view, unusual access patterns, or role mismatches).

## What Gets Built

### 1. New `dashboard_access_logs` Table
A lightweight table to record every dashboard page load, replacing the current console-only logging:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | Who accessed |
| user_email | text | Cached for display |
| company_id | uuid | Which company context |
| membership_role | text | Role in that company |
| is_cipher | boolean | Platform superadmin flag |
| view_path | text | "full" or "moderator" |
| is_anomaly | boolean | True if role/view mismatch |
| anomaly_reason | text | Description of the anomaly |
| created_at | timestamptz | When it happened |

RLS: Only Cipher users can SELECT. INSERT allowed for authenticated users (own records only).

Realtime enabled on this table so the audit dashboard updates live.

### 2. Hook: `useDashboardAccessLogger`
A small hook used in `Dashboard.tsx` that:
- Replaces the current `console.error`/`console.info` useEffect
- Inserts a row into `dashboard_access_logs` on every dashboard mount
- Flags anomalies automatically (Cipher seeing moderator view, Admin seeing moderator view, role mismatch between membership and computed flags)

### 3. Hook: `useDashboardAccessAudit`
A query + realtime subscription hook for the new audit page:
- Fetches recent access logs with pagination
- Subscribes to realtime inserts for live updates
- Supports filtering by anomaly-only, user email, company

### 4. New Page: `/access-audit` (Cipher-only)
A dedicated dashboard with:

**Summary Cards:**
- Total accesses (last 24h)
- Unique users (last 24h)
- Anomalies detected (last 24h) -- highlighted in red if > 0
- Active companies accessed

**Anomaly Alert Banner:**
- Shows at the top if any unresolved anomalies exist in the last 24h
- Lists each anomaly with user, company, timestamp, and reason

**Access Log Table (real-time):**
- Columns: Time, User, Company, Role, View, Anomaly
- Anomaly rows highlighted in red/destructive
- Auto-updates via realtime subscription
- Pagination + email search filter
- "Anomalies only" toggle filter

### 5. Route & Navigation
- Add `/access-audit` route in `App.tsx`, protected by `RoleGuard` for Cipher only
- Add nav link in sidebar (visible to Ciphers only)

## Anomaly Detection Rules
1. **Cipher in moderator view**: `is_cipher === true && view_path === "moderator"` -- should never happen
2. **Admin in moderator view**: `isCompanyAdmin === true && view_path === "moderator"` -- should never happen
3. **Role mismatch**: membership role is "admin" but computed `isModerator` is true

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/useDashboardAccessLogger.ts` | Logs access on dashboard mount |
| `src/hooks/useDashboardAccessAudit.ts` | Fetches + subscribes to access logs |
| `src/pages/AccessAuditDashboard.tsx` | The Cipher-only audit UI |

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replace console audit useEffect with `useDashboardAccessLogger` hook |
| `src/App.tsx` | Add `/access-audit` route with Cipher RoleGuard |
| `src/components/layout/AppLayout.tsx` | Add sidebar nav link for Ciphers |

### Database Migration
- Create `dashboard_access_logs` table with indexes on `created_at`, `user_id`, `is_anomaly`
- Enable RLS with Cipher-only SELECT and self-INSERT policies
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_access_logs`

