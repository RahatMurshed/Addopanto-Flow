
# Comprehensive Codebase Audit Report

---

## 1. CODE ORGANIZATION & ARCHITECTURE

- **Folder structure**: Logical separation into components, hooks, utils, types, contexts, pages, integrations.
  **Result**: ✅ Pass

- **God components (>300 lines, multiple responsibilities)**:
  - `Dashboard.tsx` — 1,147 lines. Data fetching, charting, filtering, dialogs, exports all in one file.
  - `AuditLog.tsx` — 1,090 lines. Similar sprawl.
  - `StudentProfilePage.tsx` — 812 lines. Fetching, notes CRUD, rendering, dialogs combined.
  - `Students.tsx` — 758 lines. Filtering, selection, bulk ops, dialogs.
  - `CompanyContext.tsx` — 406+ lines of provider logic.
  **Result**: ❌ Fail — 5+ god components identified

- **Duplicate utility functions**: `exportCsv.ts` and `exportUtils.ts` both handle CSV/PDF export. `use-toast.ts` wraps sonner but 17 files import sonner directly anyway.
  **Result**: ⚠️ Warning

- **Types centralization**: Only `src/types/stakeholders.ts` exists. Most types are defined inline within hooks (e.g. `Student` in `useStudents.ts`, `Expense` in `useExpenses.ts`). Not terrible but scattered.
  **Result**: ⚠️ Warning

- **`any` types**: 870 matches of `: any` across 56 files. 731 matches of `as any` across 51 files. Extremely high.
  **Result**: ❌ Fail

- **Naming conventions**: Consistent — PascalCase components, camelCase hooks with `use` prefix, camelCase utils.
  **Result**: ✅ Pass

- **Dead code**: `check-ban` edge function is still present (scheduled for deletion per prior conversation). `days` variable in Dashboard line 320 is declared but unused.
  **Result**: ⚠️ Warning

- **Circular imports**: No evidence found.
  **Result**: ✅ Pass

---

## 2. TYPESCRIPT QUALITY

- **`any` type prevalence**: ~1,600 combined `any`/`as any` occurrences in 56+ files. Major areas:
  - All Supabase queries for tables not in generated types use `.from("table" as any)` — 327 matches in 19 files. This means these tables exist in the DB but types.ts hasn't been regenerated to include them.
  - RPC return types cast as `any` in Dashboard useMemo blocks.
  - All `catch (err: any)` patterns — ~30+ instances.
  **Result**: ❌ Fail

- **`@ts-ignore` / `@ts-expect-error`**: Zero found.
  **Result**: ✅ Pass

- **Props interfaces**: Generally well-defined across components.
  **Result**: ✅ Pass

- **Non-null assertions (`!`)**: Used in mutation hooks (e.g., `user!.id`, `activeCompanyId!`) — these are guarded by `enabled` flags on queries but still unsafe in mutations if called before auth resolves.
  **Result**: ⚠️ Warning

- **Status values**: Raw strings used for student statuses (`"active"`, `"inactive"`, `"graduated"`, `"dropout"`, `"inquiry"`). No TypeScript enum or union type enforced on the frontend.
  **Result**: ⚠️ Warning

---

## 3. REACT BEST PRACTICES

- **useEffect dependency arrays**: No obvious missing dependencies found via search.
  **Result**: ✅ Pass

- **Memory leaks**: Realtime subscriptions in `useRealtimeSync` and `AuthContext` are properly cleaned up. Timer in ErrorBoundary cleaned up on unmount.
  **Result**: ✅ Pass

- **Unnecessary re-renders**: Dashboard component (1,147 lines) with many useState calls will re-render entirely on any state change. No React.memo on child sections.
  **Result**: ⚠️ Warning

- **useMemo/useCallback usage**: Used appropriately in Dashboard, StudentProfilePage. Not overused.
  **Result**: ✅ Pass

- **Direct DOM manipulation**: `exportToPDF` uses `html2canvas` which is expected. WhatsApp links use `window.open` — acceptable.
  **Result**: ✅ Pass

- **Keys in lists**: No evidence of array-index keys on dynamic lists from searches.
  **Result**: ✅ Pass

- **Error boundary coverage**: Three levels: `ErrorBoundary` (root), `SectionErrorBoundary` (layout), `CriticalRouteErrorBoundary` (routes). Good coverage.
  **Result**: ✅ Pass

---

## 4. SUPABASE QUERY OPTIMIZATION

- **`select("*")` usage**: 271 matches in 30 files. Almost every query fetches all columns.
  **Result**: ❌ Fail — significant over-fetching

- **N+1 patterns**: Dashboard fetches revenues and expenses in parallel (good). `Batches.tsx` line 92 filters `allStudents` per batch in a loop but data is already in memory — acceptable.
  **Result**: ✅ Pass

- **Full table fetches without pagination**: `useExpenses`, `useRevenues`, `useStudentPayments` (when no studentId) all fetch ALL rows with manual batching loops. These will scale poorly with thousands of records.
  **Result**: ❌ Fail

- **Realtime cleanup**: Properly handled in AuthContext and useRealtimeSync.
  **Result**: ✅ Pass

- **React Query staleTime**: Configured globally at 30s with per-query overrides (5min for profiles, roles). Reasonable.
  **Result**: ✅ Pass

- **Company_id filtering**: All queries explicitly filter by `company_id` in addition to RLS.
  **Result**: ✅ Pass

---

## 5. SECURITY HARDENING

- **Console logging**: 130 matches across 20 files. Mostly `console.error` in catch blocks (acceptable) and `console.warn` for 404s. No sensitive data logged.
  **Result**: ⚠️ Warning — should be behind a debug flag in production

- **Service role key in frontend**: None found.
  **Result**: ✅ Pass

- **CSV formula injection**: `downloadCsv` in `exportCsv.ts` wraps cells in quotes but does NOT prefix `=`, `+`, `-`, `@` cells with a single quote to prevent formula injection. CSV import (`csvImportUtils.ts`) also does not sanitize.
  **Result**: ❌ Fail

- **WhatsApp URL from user input**: Phone numbers are cleaned via `cleanPhone()` but NOT encoded with `encodeURIComponent`. While phone digits are relatively safe, this is still a gap.
  **Result**: ⚠️ Warning

- **`dangerouslySetInnerHTML`**: Only used in `chart.tsx` for theme CSS — not user-controlled content. Safe.
  **Result**: ✅ Pass

- **PII protection**: Students have a `students_safe` view that hooks select from based on permissions. PII restriction banner exists.
  **Result**: ✅ Pass

- **Hardcoded UUIDs**: `'00000000-0000-0000-0000-000000000000'` used as system user in DB functions — acceptable sentinel value.
  **Result**: ✅ Pass

- **RLS linter**: 1 table has RLS enabled but no policies. 1 extension in public schema.
  **Result**: ⚠️ Warning

- **Edge function CORS**: Dynamically allows lovable.app subdomains and production domains. JWT verification disabled on all 5 edge functions (`verify_jwt = false`) — they do manual auth internally, which is fine.
  **Result**: ✅ Pass

---

## 6. ERROR HANDLING COMPLETENESS

- **Async operations**: Most mutations use try/catch. Supabase queries consistently check `if (error) throw error`.
  **Result**: ✅ Pass

- **Silent failures**: Audit log trigger in DB uses `EXCEPTION WHEN OTHERS THEN RAISE WARNING` — silent but intentional to not block parent ops. Some frontend `console.error` without user-facing feedback (e.g., enrollment sync failures).
  **Result**: ⚠️ Warning

- **Loading state reset**: Mutations use `finally` blocks to reset loading states.
  **Result**: ✅ Pass

- **Race conditions**: No obvious unguarded race conditions. React Query handles deduplication.
  **Result**: ✅ Pass

---

## 7. PERFORMANCE & SCALABILITY

- **Full table loads**: `useExpenses`, `useRevenues`, `useStudentPayments` fetch ALL company data into memory. For companies with 10K+ records this will be slow and memory-heavy.
  **Result**: ❌ Fail

- **Bundle splitting**: Properly configured in `vite.config.ts` with manual chunks for react, recharts, framer-motion, supabase, utils, and UI.
  **Result**: ✅ Pass

- **Lazy loading**: Pages are lazy-loaded (confirmed in App.tsx summary).
  **Result**: ✅ Pass

- **React Query retry**: Global retry set to 2 for queries, 0 for mutations. Does not distinguish 4xx vs 5xx.
  **Result**: ⚠️ Warning — retrying 400/403/404 errors wastes resources

- **Infinite re-render risk**: No patterns found.
  **Result**: ✅ Pass

- **Virtual scrolling**: Not used for any lists. Tables use pagination (good alternative).
  **Result**: ✅ Pass

---

## 8. CODE MAINTAINABILITY

- **Dual toast system**: Both `sonner` (direct) and `@/hooks/use-toast` (wrapper around sonner) are used. 17 files import sonner directly, 43 files use the wrapper. Inconsistent.
  **Result**: ❌ Fail

- **Magic strings**: Student statuses (`"active"`, `"paid"`, `"monthly"`) used as raw strings throughout. Revenue source names like `"Student Fees"` hardcoded in DB triggers and frontend.
  **Result**: ⚠️ Warning

- **Copy-pasted code**: `cleanPhone` defined in `ProfileHeader.tsx` and imported by 2 other files — should be in utils. Phone formatting logic exists separately in `phoneFormat.ts`.
  **Result**: ⚠️ Warning

- **Permission checks**: Centralized through `CompanyContext` booleans and `RoleGuard`/`PermissionGuard` components. Well structured.
  **Result**: ✅ Pass

- **TODO comments**: Zero TODOs found.
  **Result**: ✅ Pass

- **Async consistency**: All async/await. No mixed .then()/.catch() patterns.
  **Result**: ✅ Pass

---

## 9. DEPENDENCY & BUILD AUDIT

- **Dual toast libraries**: Both `sonner` and `@radix-ui/react-toast` are installed. The hooks/use-toast.ts wraps sonner, but the radix toast components still exist in `ui/toast.tsx` and `ui/toaster.tsx`.
  **Result**: ⚠️ Warning — redundant dependency

- **`axe-core` + `vitest-axe`**: Listed as production dependencies but are test-only tools.
  **Result**: ⚠️ Warning

- **`html2canvas` + `jspdf`**: Large libraries (~500KB combined) used only for PDF export. Could be dynamically imported.
  **Result**: ⚠️ Warning

- **Build optimization**: Manual chunks configured. Tree shaking enabled via Vite/ESBuild.
  **Result**: ✅ Pass

---

## 10. PRODUCTION READINESS

- **Console statements**: 130 console.log/warn/error statements. No debug flag to suppress in production.
  **Result**: ⚠️ Warning

- **Error tracking (Sentry)**: Not configured.
  **Result**: ❌ Fail

- **Analytics/monitoring**: Not configured.
  **Result**: ⚠️ Warning

- **Rate limiting**: Implemented via DB function `check_rate_limit` used by edge functions.
  **Result**: ✅ Pass

- **CORS**: Properly scoped to lovable.app and production domains.
  **Result**: ✅ Pass

- **Database migrations**: Versioned in `supabase/migrations/`.
  **Result**: ✅ Pass

- **Supabase types out of sync**: 327 `.from("table" as any)` casts indicate the generated `types.ts` is missing many tables (products, courses, product_categories, audit_logs, etc.). This is the root cause of most `as any` usage.
  **Result**: ❌ Fail

---

## PRIORITIZED FIX LIST

### Critical (Security/Data Risk)
1. **CSV formula injection** — Both export and import lack sanitization for cells starting with `=`, `+`, `-`, `@`. Financial data app makes this high risk.
2. **RLS table with no policies** — Identify and fix the table flagged by the linter.
3. **Regenerate Supabase types** — 327 `as any` casts on `.from()` calls bypass type safety entirely. Regenerating types.ts would eliminate most `any` usage in one step.

### Important (Quality/Scalability)
4. **Full table fetches** — `useExpenses`, `useRevenues`, `useStudentPayments` need server-side pagination or RPC aggregation instead of fetching all rows.
5. **Consolidate toast system** — Pick one (sonner direct) and eliminate the wrapper + radix toast dependency.
6. **Break up god components** — Dashboard (1,147 lines), AuditLog (1,090 lines), StudentProfilePage (812 lines) need extraction into sub-components.
7. **Add error tracking** — Integrate a monitoring service for production error visibility.
8. **React Query retry logic** — Don't retry on 4xx errors (use `retry: (count, error) => error.status >= 500`).
9. **Move `cleanPhone` to utils** — It's defined in a component file but used across 3 files.

### Minor (Maintainability)
10. **Extract status constants** — Create typed union types or const objects for student/payment/batch statuses.
11. **Reduce `select("*")`** — Add explicit column lists to queries, especially on large tables.
12. **Move test deps to devDependencies** — `axe-core` and `vitest-axe` should not be in production deps.
13. **Dynamic import for jsPDF/html2canvas** — Load only when user triggers PDF export.
14. **Production console suppression** — Add a logger utility that respects environment.
15. **Delete `check-ban` edge function** — Already planned from prior conversation.
