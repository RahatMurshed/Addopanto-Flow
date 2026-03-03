

## Plan: Add Demo Credentials on Login Page

Add a visible demo credentials banner on the login page so clients and recruiters can quickly log in without needing to create an account.

### Implementation

**File: `src/pages/Auth.tsx`**

Add a styled info card below the login form (after the "Forgot password?" button, around line 221) containing:
- A heading like "Demo Credentials"
- Email: `admin@addopantoflowdemo.com`
- Password: `Admin.30@`
- A "Use Demo Credentials" button that auto-fills the login form fields

The button will set `loginEmail` and `loginPassword` state values, making it one-click to populate and then submit.

### UI Design
- Subtle dashed border card with a muted background
- Copy-friendly display of email and password
- Single "Use Demo Credentials" button that fills the form instantly

### Files Modified
- `src/pages/Auth.tsx` — add demo credentials section inside the login tab

