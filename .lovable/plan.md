
## Fix: Show meaningful names instead of UUIDs in Audit Log Entity column

### Problem
The Entity column shows truncated UUIDs (e.g., "9f7fc295", "f8cfa7a8") for payment and revenue entries because `getEntityName()` has no handling for `student_payments` or `revenues` tables -- it falls through to `record_id.slice(0, 8)`.

### Solution

**1. Build a student name lookup map**
- Collect all unique `student_id` values from audit log entries where `table_name = 'student_payments'`
- Fetch student names from the `students` table in a single batch query
- Store in a `Map<string, string>` (student_id -> student name)

**2. Update `getEntityName()` to handle payment/revenue tables**
- For `student_payments`: look up the student name from the map using `d.student_id`. Fall back to a label like "Payment" if not found.
- For `revenues`: use `d.description` if available (it already contains human-readable text like "Monthly tuition (2026-02) - Rahat Murshed"). Fall back to "Revenue" if missing.

### Technical Details

**File: `src/pages/AuditLog.tsx`**

- Add a `useMemo` to extract unique `student_id` values from fetched audit logs where `table_name === "student_payments"`.
- Add a `useQuery` to batch-fetch student names: `supabase.from("students").select("id, name").in("id", studentIds)`.
- Build a `studentNameMap: Map<string, string>`.
- Update `getEntityName()` to accept the map as a parameter:
  - `student_payments` -> return `studentNameMap.get(d.student_id)` or "Payment"
  - `revenues` -> return `d.description` (truncated if long) or "Revenue"

This is a safe, additive change -- no existing features are affected.
