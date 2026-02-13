

# Add Company Members Page with Invite Code and Cipher Visibility

## What's Missing

The `CompanyMembers.tsx` page already exists with full functionality (invite code generation, member management, join requests), but it has no route in the app and no navigation link. Additionally, cipher users should be hidden from admin/moderator views.

## Changes

### 1. Add route for Company Members page

**File: `src/App.tsx`**
- Import `CompanyMembers` from `src/pages/CompanyMembers`
- Add route: `/company/members` inside `ProtectedRoute`

### 2. Add "Members" navigation link

**File: `src/components/AppLayout.tsx`**
- Add a "Members" nav item with `Users` icon, visible to admin and cipher users (those with `canManageMembers`)
- Place it after the existing admin-only nav items

### 3. Filter out cipher members from non-cipher users

**File: `src/pages/CompanyMembers.tsx`**

Currently all members are shown to everyone who can access the page. Update the member list so:
- **Cipher users** see all members (admin, moderator, viewer -- including other ciphers)
- **Admin users** cannot see members who are cipher-level users

This requires knowing which member user_ids have a cipher role in `user_roles`. Add a query to fetch cipher user_ids, then filter them out of the displayed member list when the current user is not cipher.

### Technical Details

**CompanyMembers.tsx cipher filtering:**
- Add a query: `SELECT user_id FROM user_roles WHERE role = 'cipher'` (only runs if user is not cipher, to filter out cipher members)
- If the current user is NOT cipher, filter out any members whose `user_id` appears in the cipher list
- This means admin users will never see cipher users in the members table, requests, etc.
- Cipher users see everyone with no filtering

**App.tsx:** Add `<Route path="/company/members" element={<ProtectedRoute><CompanyMembers /></ProtectedRoute>} />`

**AppLayout.tsx:** Add `{ label: "Members", href: "/company/members", icon: Users }` to the conditional nav items for admin/cipher users
