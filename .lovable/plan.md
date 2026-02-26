

# Fix: Sidebar Profile & Logout Buttons Not Visible

## Root Cause

The desktop sidebar nav element (`<nav className="flex-1 space-y-1 p-3">`) has `flex-1` which lets it grow, but it has **no `overflow-y-auto`**. For Cipher users with 15+ nav items, the content overflows the viewport, pushing the footer section (Theme toggle, My Profile, Logout) off-screen.

The same issue exists in the mobile sidebar nav.

## Fix

### File: `src/components/layout/AppLayout.tsx`

**Desktop sidebar nav (line 228):**
Change `className="flex-1 space-y-1 p-3"` to `className="flex-1 space-y-1 p-3 overflow-y-auto"`

**Mobile sidebar nav container (line 307):**
Change `className="flex-1 space-y-1"` to `className="flex-1 space-y-1 overflow-y-auto"`

Also add the missing "My Profile" link to the mobile sidebar footer (before the Logout button, around line 332), matching the desktop version.

## Result

- Nav items scroll independently when they overflow
- Profile and Logout buttons remain pinned at the bottom of the sidebar, always visible
- Mobile sidebar also gets the Profile link and proper scrolling
