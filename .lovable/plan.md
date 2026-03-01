

# Fix: Data Not Updating After Changes (Missing Query Invalidation)

## Problem
After performing actions like removing a student from a batch, the UI doesn't update until a manual page reload. This regression was introduced because several operations call the database directly (via `supabase.rpc()`) without invalidating the React Query cache afterward.

## Root Cause
The `handleRemoveFromBatch` function in `BatchDetail.tsx` calls `supabase.rpc("remove_student_from_batch")` directly, but never calls `queryClient.invalidateQueries()` after success. The same pattern likely affects other direct RPC/mutation calls across the app.

Additionally, the `useRealtimeSync` hook doesn't subscribe to the `batch_enrollments` table, so even realtime changes won't trigger a cache refresh for enrollment data.

## Fix Strategy

### 1. Add query invalidation to `handleRemoveFromBatch` in BatchDetail.tsx
After the RPC call succeeds, invalidate the relevant query keys:
- `batch_enrollments`
- `students`
- `student_payments`
- `revenues`
- `batches`
- `dashboard`
- `reports`

This requires getting `queryClient` via `useQueryClient()`.

### 2. Add `batch_enrollments` to the realtime sync hook
Update `useRealtimeSync.ts` to subscribe to `batch_enrollments` changes and invalidate `batch_enrollments`, `students`, `batches`, and `dashboard` queries.

### 3. Audit other direct RPC calls for missing invalidation
Check `handleSetInactive` and any other direct database calls in the codebase to ensure they also invalidate caches properly.

## Technical Details

**BatchDetail.tsx changes:**
- Add `const queryClient = useQueryClient()` at the top of the component
- After successful `handleRemoveFromBatch`, add invalidation calls for all affected query keys
- Same for `handleSetInactive` (though it uses `updateStudentMutation` which should already invalidate, we should verify)

**useRealtimeSync.ts changes:**
- Add `batch_enrollments` to `TABLE_INVALIDATION_MAP` with keys: `["batch_enrollments", "students", "batches", "dashboard"]`
- Add `batch_enrollments` to `TABLE_LABELS` as `"Enrollments"`
- Add `.on("postgres_changes", ...)` subscription for `batch_enrollments`

