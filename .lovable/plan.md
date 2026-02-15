

## Company Password Change + Show Join Message to Admins

### 1. Company Password Change on Settings Page

Add a new "Security" card to `src/pages/SettingsPage.tsx` that allows admins/ciphers to change the business join password.

Since the password is stored as a bcrypt hash (handled in the `company-join` edge function), we need a new edge function action `change-join-password` to hash the new password server-side before saving.

**Edge Function Changes** (`supabase/functions/company-join/index.ts`):
- Add a new Zod schema `changePasswordSchema` for action `"change-join-password"` with fields: `companyId` (uuid), `newPassword` (string, min 1, max 100)
- Add handler that verifies the user is admin/cipher of the company, hashes the new password with bcrypt, and updates `companies.join_password`

**Settings Page Changes** (`src/pages/SettingsPage.tsx`):
- Add a new Card section titled "Join Password" below the Business Logo card
- Contains a password input field with show/hide toggle for entering a new join password
- A "Change Password" button with loading state
- Calls the new `change-join-password` edge function action
- Shows success/error toast

### 2. Show Join Message More Prominently to Admins

Currently the message column in the join requests table is truncated to 200px. The fix:

**`src/components/CompanyJoinRequests.tsx`**:
- In the pending requests table, expand the message column -- remove the `max-w-[200px] truncate` constraint
- Show the full message text with proper word wrapping
- If message is long, show it in a tooltip or expandable row rather than truncating
- Style the message to be more noticeable (not just muted foreground) when present, so admins clearly see what the user wrote

### Technical Details

**New Zod schema in edge function:**
```typescript
const changePasswordSchema = z.object({
  action: z.literal("change-join-password"),
  companyId: uuidField,
  newPassword: z.string().min(1, "Password required").max(100, "Password too long"),
});
```

**New handler logic:**
- Verify user is cipher or company admin
- Hash `newPassword` with bcrypt
- Update `companies.join_password` where `id = companyId`
- Return success

**Files to modify:**
- `supabase/functions/company-join/index.ts` -- add `change-join-password` action
- `src/pages/SettingsPage.tsx` -- add Join Password card section
- `src/components/CompanyJoinRequests.tsx` -- improve message column visibility

