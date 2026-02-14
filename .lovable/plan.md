

# Fix Join Loading, UI Redesign, Cipher Invisibility, and Login Redirect

## 1. Fix Join Button Loading State (JoinCompany.tsx)

**Problem**: A single `loading` boolean is shared across all company cards. When a cipher clicks "Join" on one company, every card's button shows a spinner.

**Fix**: Replace the single `loading` state with a `joiningCompanyId` state (`string | null`) that tracks which specific company is being joined. Only the card with a matching ID shows the spinner; others remain interactive.

## 2. Login Redirect Fix (Auth.tsx)

**Problem**: After login, users are redirected to `/companies`. But if the user has no companies, they should land on the Join Company page instead of seeing the "No Companies" screen with a redundant "Join a Company" button.

**Fix**: After successful login, navigate to `/companies`. In `CompanySelection.tsx`, when the user has zero companies and is not a cipher, automatically redirect to `/companies/join` instead of showing the `NoCompaniesSection`. Keep the `NoCompaniesSection` only for pending/rejected registration states.

## 3. UI Redesign for Company Pages

Based on the screenshots, the current design is functional but plain. The redesign will polish the Company Selection, Join Company, and Create Company pages with:

### Company Selection Page
- Add a subtle gradient or pattern background behind the header
- Improve company cards with a more prominent hover effect, a right-arrow indicator, and better spacing
- Style the action buttons in a cleaner row with better visual hierarchy (primary for Join, outline for Create, ghost for Sign Out)
- Add a welcome message with the user's name if available

### Join Company Page
- Improve the tab section with larger icons and better spacing
- Add a "No results" illustration when search returns nothing
- Better card hover states with smooth transitions

### Create Company Page
- Minor polish -- already in good shape from previous updates

## 4. Cipher Invisibility System

**Current state**: `CompanyMembers.tsx` already fetches cipher user IDs and filters them out for non-cipher users (lines 41-74). This is working correctly.

**Enhancements needed**:
- **Member count exclusion**: In `CompanySelection.tsx`, the member count query fetches all active memberships. Filter out cipher users from the count for non-cipher users so the displayed number matches what they see on the Members page.
- **Cipher self-badge**: When a cipher views the Members page, show a special "Cipher" badge next to their own name (visible only to cipher users) to indicate elevated privileges.
- **Members page count**: The Members tab header shows `Members (X)` -- this already uses the filtered `members` array, so it correctly excludes ciphers for non-cipher users. No change needed.

## Technical Changes

### Files to Modify

**`src/pages/JoinCompany.tsx`**
- Replace `const [loading, setLoading] = useState(false)` with `const [joiningCompanyId, setJoiningCompanyId] = useState<string | null>(null)`
- Update `handleCipherJoin` to set `joiningCompanyId` to the specific company ID
- Update the button's disabled/spinner check to compare against `joiningCompanyId === company.id`
- Keep `loading` for password join and invite flows (those are single-action contexts)

**`src/pages/CompanySelection.tsx`**
- When `companies.length === 0` and user is not pending/rejected/cipher, auto-redirect to `/companies/join`
- Add cipher filtering to member count query (fetch cipher IDs, subtract from counts for non-cipher users)
- Add cipher self-indicator badge in `getRoleBadge`
- Visual polish: better card styling, hover effects, action button layout

**`src/pages/CompanyMembers.tsx`**
- Add cipher badge: When `isCipher` is true and the member row is the current user, show a "Cipher" badge with a distinct color (e.g., purple/indigo) alongside any company role badge

**`src/pages/CreateCompany.tsx`**
- Minor visual improvements only

