

## View User Profile Details from Management Pages

### What will change

Add a "View Profile" action to both the **Platform Users** page (cipher only) and the **Business Members** page (admin/cipher). Clicking it opens a side sheet showing the user's full profile information (phone, address, city, country, department, employee ID, date of birth, bio). Cipher profiles remain hidden from admin users -- the view button simply won't appear for cipher users on the members page.

### Approach

Create a reusable `UserProfileSheet` component that displays profile details in a read-only sheet (slide-out panel). Both pages will import it and trigger it on row click or a dedicated "view" button.

### Implementation Details

**1. New component: `src/components/UserProfileSheet.tsx`**
- Accepts `userId`, `open`, and `onOpenChange` props
- Fetches full profile from `user_profiles` table for the given `userId`
- Displays: avatar, full name, email, phone, alt phone, address, city, country, department, employee ID, date of birth, bio, and join date
- Read-only presentation using labels and values in a clean layout
- Uses the existing Sheet component from the UI library

**2. Update `src/pages/UserManagement.tsx` (Platform Users - cipher only)**
- Add an "eye" icon button in the Actions column next to the delete button
- Clicking opens the `UserProfileSheet` for that user
- Available for all users (cipher can view everyone)

**3. Update `src/pages/CompanyMembers.tsx` (Business Members - admin/cipher)**
- Add an "eye" icon button in the Actions column
- Cipher users already hidden from the members list, so no extra filtering needed
- Admin can view profiles of all visible members (moderators, DEOs, viewers)

### Access Control Summary

| Viewer | Can see profiles of |
|---|---|
| Cipher | All users (platform + company) |
| Admin | All company members except cipher (cipher already hidden from list) |
| Moderator/DEO/Viewer | No profile viewing (no action button shown) |

### Files to create/modify

- **New**: `src/components/UserProfileSheet.tsx` -- reusable profile viewer
- **Edit**: `src/pages/UserManagement.tsx` -- add view button + sheet
- **Edit**: `src/pages/CompanyMembers.tsx` -- add view button + sheet

