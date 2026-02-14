

# GA-LOGO Branding and Theme Overhaul

## Overview

Rebrand the entire Addopanto Flow application using the uploaded GA-LOGO.png ("Grammar Addopanto") as the primary identity. Extract the orange/amber and deep blue from the logo to create a cohesive color theme across all pages, navigation, buttons, cards, and interactive elements.

---

## Phase 1: Asset Setup and Color System

### 1.1 Copy Logo to Project
- Copy `user-uploads://GA-LOGO.png` to `src/assets/GA-LOGO.png` for component imports
- Copy to `public/GA-LOGO.png` for favicon and HTML meta usage

### 1.2 Update CSS Color Variables (`src/index.css`)
Replace the current blue-based primary palette with the logo-derived orange/blue theme:

**Light mode:**
- `--primary`: Orange/amber (~30 100% 50%) for CTAs, active states, highlights
- `--ring`: Match primary orange
- `--sidebar-background`: Deep blue (~217 70% 18%) 
- `--sidebar-foreground`: White
- `--sidebar-primary`: Orange for active nav items
- Keep `--success`, `--warning`, `--destructive` as-is (already good)

**Dark mode:**
- Adjusted shades of orange/blue for dark backgrounds
- Sidebar stays deep blue (slightly lighter for dark mode)

### 1.3 Update `tailwind.config.ts`
No structural changes needed -- colors flow through CSS variables automatically.

---

## Phase 2: Logo Placement

### 2.1 Sidebar Header (`AppLayout.tsx`)
- Replace the `Building2` icon fallback and company name area with the GA-LOGO imported from `@/assets/GA-LOGO.png`
- Logo max-width 140px in expanded sidebar
- Keep company switcher dropdown functional below/beside the logo

### 2.2 Mobile Header (`AppLayout.tsx`)
- Replace the `TrendingUp` icon + "KhataFlow" text with a smaller GA-LOGO (max-height 32px)

### 2.3 Auth Pages (`Auth.tsx`)
- Replace the blue `TrendingUp` icon and "KhataFlow" text with GA-LOGO centered (max-width 200px)
- Update all "KhataFlow" text references to "Addopanto Flow" or "Grammar Addopanto"

### 2.4 Company Selection (`CompanySelection.tsx`)
- Replace `Building2` header icon with GA-LOGO

### 2.5 Registration Success screen
- Replace icon and "KhataFlow" title with GA-LOGO

### 2.6 Favicon and HTML Meta
- Update `index.html`: add `<link rel="icon" href="/GA-LOGO.png">`, update `<title>` to "Addopanto Flow"
- Update OG meta tags with new branding name

---

## Phase 3: Navigation and Sidebar Polish

### 3.1 Desktop Sidebar Styling (`AppLayout.tsx` + `index.css`)
- Deep blue background via `--sidebar-background`
- White text for nav items
- Orange left-border (3px) + orange text for active menu item
- Smooth hover transitions (0.2s)

### 3.2 Mobile Navigation
- Orange hamburger menu button color
- Slide-in panel with same blue/orange theme

---

## Phase 4: Button and Interactive Element Polish

### 4.1 Button Enhancements (`button.tsx` + `index.css`)
- Primary buttons: orange background, white text
- Hover: slightly darker orange shade (0.2s transition)
- Active: `scale(0.98)` press effect
- Disabled: 0.5 opacity
- All loading buttons already show spinners (existing pattern maintained)

### 4.2 Form Input Focus States
- Orange focus ring (2px) via `--ring` variable update
- Already flows through existing Input component styles

### 4.3 Cards
- Add subtle shadow upgrade via CSS: `shadow-sm hover:shadow-md transition-shadow`
- Orange accent borders on key metric cards in Dashboard

---

## Phase 5: Page-Specific Polish

### 5.1 Dashboard (`Dashboard.tsx`)
- Metric card icons use orange accent color
- Chart colors: keep existing CHART_COLORS but make first color the brand orange

### 5.2 Status Badges
- Paid/Approved: orange badge
- Pending: amber
- Overdue/Rejected: red
- Inactive: gray
(Most already exist, just ensure consistency)

### 5.3 Tables
- Selected row: light orange background
- Hover: subtle gray
- Already have sticky headers from existing implementation

### 5.4 Modals/Dialogs
- Dialog headers with blue background, white text (via CSS override on DialogHeader)
- Primary action buttons already orange through primary color change

---

## Phase 6: Loading and Misc

### 6.1 App Loading Screen (`App.tsx` or `main.tsx`)
- Add a simple branded loading screen with GA-LOGO and pulse animation while auth initializes

### 6.2 NotFound Page (`NotFound.tsx`)
- Add GA-LOGO and brand colors

### 6.3 Toast Notifications
- Already themed through CSS variables -- orange ring for success toasts will come automatically

---

## Files Modified

| File | Change |
|------|--------|
| `src/assets/GA-LOGO.png` | New - copied from upload |
| `public/GA-LOGO.png` | New - for favicon/meta |
| `index.html` | Favicon, title, meta tags |
| `src/index.css` | Color variables (orange primary, blue sidebar) |
| `src/components/AppLayout.tsx` | Logo in sidebar + mobile header, nav styling |
| `src/pages/Auth.tsx` | Logo + branding text |
| `src/pages/CompanySelection.tsx` | Logo in header |
| `src/pages/Dashboard.tsx` | Orange accent on metric cards |
| `src/pages/NotFound.tsx` | Logo + brand colors |
| `src/App.tsx` | Branded loading screen |

## What Will NOT Change
- All existing functionality, data flow, API calls, and security remain intact
- TypeScript types unchanged
- No new dependencies required
- Backend/database untouched

