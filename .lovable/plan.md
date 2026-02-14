

# Move Join Requests to Company Members Page

## Overview
Move the "Join Requests" tab from the Requests page (`RegistrationRequests.tsx`) to the Company Members page (`CompanyMembers.tsx`), replacing the existing simple requests tab with the full-featured `CompanyJoinRequests` component.

## Changes

### 1. Update Company Members page (`src/pages/CompanyMembers.tsx`)
- Replace the current basic "Requests" tab content (which uses inline approve/reject with no permissions modal) with the `CompanyJoinRequests` component
- Import `CompanyJoinRequests` component
- Remove the now-unnecessary inline join request queries, approve/reject mutations, and related code that are duplicated from the component
- Update the pending requests badge to use a count query instead of loading all requests inline

### 2. Clean up Registration Requests page (`src/pages/RegistrationRequests.tsx`)
- Remove the "Join Requests" tab and the `CompanyJoinRequests` import
- Remove the top-level tabs wrapper (registration vs join-requests) since only registration requests remain
- Remove the `pendingJoinCount` query
- Simplify back to just showing registration requests directly

### 3. No changes to `CompanyJoinRequests.tsx`
The component is already self-contained with its own data fetching, approve/reject modals with permission toggles, rejected requests tab, and ban expiry display. It will work as-is when embedded in the Members page.

## Technical Details

**CompanyMembers.tsx changes:**
- Remove: `joinRequests` query, `requestProfiles` query, `approveRequestMutation`, `rejectRequestMutation`, `pendingRequests` filter
- Add: `pendingJoinCount` query (count-only, for the tab badge)
- Add: `import CompanyJoinRequests from "@/components/CompanyJoinRequests"`
- Replace the "Requests" `TabsContent` body with `<CompanyJoinRequests />`

**RegistrationRequests.tsx changes:**
- Remove `CompanyJoinRequests` import and `useCompany` import
- Remove `activeCompanyId` usage and `pendingJoinCount` query
- Remove outer Tabs wrapper (registration vs join-requests), keep only the inner registration request tabs (pending/approved/rejected)
- Remove the `activeTab` state

