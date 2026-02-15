

## Fix: Merge Duplicate "Request New Business" and "Create Business" Buttons

### Problem

On the company selection page, Cipher users see two confusing buttons:
- **"Request New Business"** -- for regular users, submits a request to Cipher for approval
- **"Create Business"** -- for Cipher users, creates a company directly

Both navigate to `/companies/create`, making them redundant for Cipher. Non-Cipher users should never see "Create Business".

### Solution

In `src/pages/CompanySelection.tsx`, consolidate into a single button:
- **Cipher users**: Show only "Create Business" (primary/filled style) -- navigates to `/companies/create` where they can create directly
- **Non-Cipher users**: Show only "Request New Business" (outline style) -- navigates to `/companies/create` where they submit a request

### Technical Change

In `src/pages/CompanySelection.tsx`, replace the current three-button section (Join Business + Request New Business + Create Business for Cipher) with:
- "Join Business" button (always shown)
- Single create/request button that changes label based on `isCipher`:
  - Cipher: "Create Business" (primary variant)
  - Others: "Request New Business" (outline variant)
- "Sign Out" button (always shown)

This is a single-line change in the buttons section at the bottom of the component.

