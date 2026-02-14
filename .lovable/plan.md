

# Production Readiness Audit: Multi-Company Student Revenue Management System

## Executive Summary

After a thorough audit of the entire codebase (18 pages, 19 hooks, 30+ components, 3 edge functions, 12 database tables with RLS), this plan identifies **41 actionable improvements** across 5 phases. The system has a solid foundation -- proper RLS, dual-layer roles, company isolation via `active_company_id` -- but several issues must be addressed before production at scale.

---

## Phase 1: Critical Bugs and Security Fixes (Priority: Immediate)

### 1.1 SQL Injection via `.ilike` in Student Search
**File:** `src/hooks/useStudents.ts` line 66
The search input is interpolated directly into a PostgREST filter string:
```
query.or(`name.ilike.%${search}%,student_id_number.ilike.%${search}%`)
```
Special characters (e.g., `%`, `_`, `\`) can manipulate the LIKE pattern. Must sanitize by escaping these characters before interpolation.

### 1.2 N+1 Query: Member Profiles (CompanyMembers.tsx)
**File:** `src/pages/CompanyMembers.tsx` lines 65-75
The profile query fetches ALL `user_profiles` rows instead of filtering by member user IDs:
```typescript
const { data } = await supabase.from("user_profiles").select("user_id, email");
```
Fix: Add `.in("user_id", members.map(m => m.user_id))` filter.

### 1.3 N+1 Query: Company Member Counts (CompanySelection.tsx)
**File:** `src/pages/CompanySelection.tsx` lines 17-32
Runs a separate count query for each company in a `for` loop. Replace with a single query or use a database function.

### 1.4 Race Condition in Student Payment Revenue Creation
**File:** `src/hooks/useStudentPayments.ts` lines 107-136
After inserting a revenue, retrieves the "last revenue" by `created_at DESC` to create allocations. Under concurrent writes, this could link allocations to the wrong revenue. Fix: use the `id` returned from the revenue insert directly.

### 1.5 Company Join Password Stored in Plaintext
**File:** `supabase/functions/company-join/index.ts` line 137
Password comparison is direct string equality. Should hash with bcrypt or similar.

### 1.6 Check-Ban Endpoint Has No Rate Limiting
**File:** `supabase/functions/check-ban/index.ts`
This endpoint has `verify_jwt = false` (config.toml) and accepts any email. Could be used for email enumeration or DoS. Add basic rate limiting or at minimum require a JWT.

### 1.7 Missing Company ID Scoping in Queries
Several hooks query without company filtering -- RLS handles it, but queries return cross-company cached data:
- `useRevenues()` -- no company_id in queryKey
- `useExpenses()` -- no company_id in queryKey  
- `useStudentPayments()` -- no company_id in queryKey
- `useAccountBalances()` -- no company_id in queryKey

When switching companies, stale data from the previous company may briefly display. Fix: include `activeCompanyId` in all query keys.

### 1.8 5-Second Polling Interval in AuthContext
**File:** `src/contexts/AuthContext.tsx` lines 67-100
A 5-second `setInterval` makes 2-3 database queries per tick for every logged-in user. At 10,000 users, this is 120,000-180,000 queries/minute. Increase to 60 seconds minimum and rely on Realtime for immediate feedback.

---

## Phase 2: Performance and Scalability (Priority: High)

### 2.1 Database Indexing Strategy
Add composite indexes for the most common query patterns:
```sql
-- Revenue/expense date-range queries
CREATE INDEX idx_revenues_company_date ON revenues(company_id, date);
CREATE INDEX idx_expenses_company_date ON expenses(company_id, date);

-- Student lookups
CREATE INDEX idx_students_company_status ON students(company_id, status);
CREATE INDEX idx_students_company_name ON students(company_id, name);

-- Payment lookups by student
CREATE INDEX idx_student_payments_student ON student_payments(student_id, payment_type);
CREATE INDEX idx_student_payments_company ON student_payments(company_id, payment_date);

-- Allocation lookups
CREATE INDEX idx_allocations_revenue ON allocations(revenue_id);
CREATE INDEX idx_allocations_account ON allocations(expense_account_id);

-- Membership lookups
CREATE INDEX idx_memberships_user_company ON company_memberships(user_id, company_id, status);
CREATE INDEX idx_join_requests_company_status ON company_join_requests(company_id, status);

-- Registration lookups
CREATE INDEX idx_registration_email_status ON registration_requests(email, status);
```

### 2.2 Dashboard Query Optimization
**File:** `src/pages/Dashboard.tsx` lines 86-94
The dashboard fetches ALL revenues and ALL expenses (no date filter, no limit beyond 50 for recent), then filters client-side. For a company with 10,000+ transactions:
- Add server-side date filtering to only fetch the visible range
- Use aggregation queries (SUM with GROUP BY) instead of fetching raw rows
- Consider a database view or function for dashboard metrics

### 2.3 Reports Page: Full Table Scans
**File:** `src/pages/Reports.tsx` lines 59-65
Fetches `SELECT *` on 5 tables with no filters. Same fix as Dashboard -- push date filtering and aggregation to the server.

### 2.4 Student List: Fetching ALL Payments
**File:** `src/pages/Students.tsx` line 41
`useStudentPayments()` fetches every payment for every student to compute summaries client-side. Create a database view or RPC function that returns per-student aggregates.

### 2.5 React Query Cache Strategy
Standardize stale times and add proper cache invalidation:
- Financial data: 30s stale time (already partially done)
- Role/permission data: 5min stale time (done)
- Add `activeCompanyId` to ALL financial query keys for proper cache isolation
- Use `queryClient.removeQueries()` on company switch instead of just `invalidateQueries()`

### 2.6 Reduce AuthContext Polling
Change the validation interval from 5s to 60s. The Realtime subscription already handles immediate logout on role deletion. The polling is just a fallback.

---

## Phase 3: UX and UI Improvements (Priority: Medium)

### 3.1 Missing Confirmation Dialogs
- Member removal (CompanyMembers.tsx line 251) has no confirmation -- a single click deletes
- Company join password entry should show/hide password toggle

### 3.2 Empty States Consistency
Some pages have well-designed empty states (Students), others don't (Revenue, Expenses). Add consistent empty state cards with action CTAs.

### 3.3 Mobile Responsiveness Gaps
- CompanyMembers table hides 5 columns on mobile, leaving only Member name and Actions
- Permission switches are invisible on small screens -- consider a mobile-friendly card layout for member management

### 3.4 Loading State for Delete Actions
- `removeMemberMutation` in CompanyMembers has no loading indicator on the delete button
- No optimistic updates -- user sees no feedback until the network round-trip completes

### 3.5 Form Validation
- Student form: no max length on name/notes fields
- Company join password: no minimum length enforcement
- Email fields: rely on HTML5 validation only, no Zod schema validation

### 3.6 Error Boundary
No React Error Boundary exists. An unhandled error in any component crashes the entire app. Add a root-level `ErrorBoundary` component.

### 3.7 Keyboard Shortcuts
Add common shortcuts:
- `Ctrl+K` for global search
- `Escape` to close modals (already works via Radix)
- `N` for "New" actions when no input is focused

### 3.8 Company Switcher UX
After switching companies, all data reloads but there's no loading indicator on the main content area -- just a brief flash of stale data. Add a transition loading state.

---

## Phase 4: Architecture and Code Quality (Priority: Medium)

### 4.1 Duplicate Permission Systems
The codebase has TWO parallel permission systems:
1. **RoleContext** (global: `user_roles` + `moderator_permissions`)
2. **CompanyContext** (company-level: `company_memberships`)

Some components use `useRole()`, others use `useCompany()`. The Students page uses `useRole()` for permissions but data is company-scoped. Consolidate to use only CompanyContext for company-scoped pages.

### 4.2 Student Payment Revenue Duplication
**File:** `src/hooks/useStudentPayments.ts`
Student payments are inserted into BOTH `student_payments` AND `revenues` tables. Updating/deleting a student payment does NOT update/delete the corresponding revenue entry, causing data inconsistency. Fix: either use a database trigger to sync, or remove the dual-insert and use a view.

### 4.3 Edge Function Consolidation
Three edge functions (`admin-users`, `check-ban`, `company-join`) use identical boilerplate for CORS, auth, and client setup. Extract shared utilities into a `_shared` module.

### 4.4 Type Safety
Multiple `as any` casts in mutation hooks (e.g., `useCreateStudent`, `useCreateStudentPayment`). These bypass TypeScript's type checking. Fix by properly typing the insert payloads.

### 4.5 QueryClient Instantiation
**File:** `src/App.tsx` line 29
`QueryClient` is created inside the component module scope but outside the component. This is fine for single-instance apps but should include default error handling:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});
```

---

## Phase 5: Monitoring, Audit, and Compliance (Priority: Low)

### 5.1 Audit Log Table
Create an `audit_logs` table to track critical operations:
- User role changes
- Member additions/removals
- Financial record modifications (create/update/delete)
- Company settings changes

### 5.2 Error Tracking
Integrate error reporting (e.g., via a global error handler or an edge function that logs errors) to catch production issues.

### 5.3 Data Export Improvements
Current CSV export works well. Add:
- Date range in exported filename
- Company name in exported data headers
- PDF export with company branding/logo

### 5.4 Backup and Restore
The `DataManagementSection` component exists but only handles client-side JSON backup. For production, document the database backup schedule (handled by the backend automatically).

### 5.5 Rate Limiting on Auth Endpoints
The `check-ban` function is publicly accessible. Add rate limiting via a counter in the database or an in-memory cache.

---

## Implementation Priority Matrix

| Priority | Items | Estimated Effort |
|----------|-------|-----------------|
| **Immediate** | 1.1-1.8 (Security + Critical Bugs) | 2-3 sessions |
| **High** | 2.1-2.6 (Performance) | 3-4 sessions |
| **Medium** | 3.1-3.8 (UX) + 4.1-4.5 (Architecture) | 4-5 sessions |
| **Low** | 5.1-5.5 (Monitoring) | 2-3 sessions |

---

## Technical Implementation Notes

### Files requiring changes (Phase 1 + 2):
- `src/hooks/useStudents.ts` -- sanitize search input
- `src/hooks/useStudentPayments.ts` -- fix race condition, fix revenue duplication
- `src/hooks/useRevenues.ts` -- add companyId to queryKey
- `src/hooks/useExpenses.ts` -- add companyId to queryKey, same for all hooks
- `src/contexts/AuthContext.tsx` -- increase polling interval
- `src/pages/CompanyMembers.tsx` -- fix profile query filter
- `src/pages/CompanySelection.tsx` -- batch member count query
- `src/pages/Dashboard.tsx` -- server-side aggregation
- `src/pages/Reports.tsx` -- server-side filtering
- `supabase/functions/company-join/index.ts` -- hash passwords
- `supabase/functions/check-ban/index.ts` -- add rate limiting
- New migration for database indexes

### What NOT to change:
- RLS policies are solid and well-structured
- The dual-layer role hierarchy (global + company) is correct for the multi-tenant model
- Edge function auth patterns (user JWT validation + service role for admin ops) are secure
- The Radix UI component library and Tailwind setup are clean

