

# Landing Page for Addopanto Flow

## Overview

Create a professional, conversion-focused landing page that visitors see when they open the app URL. Authenticated users will be redirected to the dashboard as before. The page will use the existing orange/blue brand palette and support both light and dark themes.

## Routing Changes

**File: `src/App.tsx`**

- Add a new lazy-loaded `LandingPage` component
- Change the `/` route from `ProtectedRoute > Dashboard` to a new `LandingOrDashboard` component that:
  - Shows the landing page if the user is NOT logged in
  - Redirects to `/dashboard` if the user IS logged in
- Add a new `/dashboard` route pointing to `ProtectedRoute > Dashboard`
- Update the `ProtectedRoute` redirect (when no user) from `/auth` to `/` so unauthenticated users see the landing page instead of the auth page directly

## New Landing Page

**File: `src/pages/LandingPage.tsx`**

A single-page component with these sections:

1. **Navbar** -- Logo, product name, theme toggle, "Login" and "Get Started" buttons linking to `/auth`
2. **Hero Section** -- Bold headline ("Smart Revenue Allocation for Educational Institutions"), subtitle explaining the value, two CTA buttons ("Get Started" and "Learn More"), and a decorative gradient accent using the brand orange/blue
3. **Features Grid** -- 6 feature cards highlighting:
   - Revenue Allocation
   - Expense Tracking
   - Student Management
   - Multi-Company Support
   - Real-time Reports
   - Team Collaboration
4. **How It Works** -- 3-step visual flow (Create Company -> Add Revenue/Expenses -> Track Profit)
5. **CTA Section** -- Final call-to-action with "Start Managing Your Finances" and a button to `/auth`
6. **Footer** -- Logo, copyright, minimal links

## Theme Support

- Uses existing CSS variables (`--background`, `--foreground`, `--primary`, `--secondary`, etc.) so light/dark mode works automatically
- The navbar includes the existing `ThemeToggle` component
- No new CSS variables needed

## Technical Details

### Files to Create
- `src/pages/LandingPage.tsx` -- The full landing page component

### Files to Modify
- `src/App.tsx` -- Add landing page route, add `/dashboard` route, update redirect logic

### Dependencies
- No new dependencies needed
- Uses existing lucide-react icons, Button, Card components, and ThemeToggle

### Navigation Flow
```text
Unauthenticated user visits "/" --> LandingPage
User clicks "Get Started"       --> /auth (login/signup)
Authenticated user visits "/"   --> redirected to /dashboard
All existing internal nav links  --> updated from "/" to "/dashboard" where needed
```

### Internal Link Updates
- `AppLayout.tsx`: Dashboard nav link href stays `/` (since authenticated users get redirected to `/dashboard` anyway) -- actually needs to change to `/dashboard`
- `Auth.tsx`: Post-login navigate stays `/` which will redirect to `/dashboard`
- No other files reference the dashboard route directly besides the nav

