

# Phase 1: Student Profile 360 Dashboard — Foundation Shell

## Overview

Restructure the existing `StudentProfilePage.tsx` (709 lines) into a modular 2-column layout with a redesigned header card, sticky scroll bar, breadcrumb navigation, and proper loading/error/access states. All existing functionality (notes, financial summary, info cards) is preserved but moved into sub-components.

## File Structure

New folder: `src/components/students/profile/`

| File | Purpose |
|------|---------|
| `ProfileHeader.tsx` | Student header card (avatar, name, status, WhatsApp, edit button, bottom info row) |
| `ProfileStickyBar.tsx` | Compact sticky top bar on scroll with IntersectionObserver |
| `ProfileBreadcrumb.tsx` | Back button + breadcrumb row |
| `ProfileAccessGate.tsx` | DEO ownership check + permission gate |
| `ProfileSkeleton.tsx` | Full skeleton loading state matching the real layout |
| `ProfilePlaceholder.tsx` | Placeholder cards for left/right/bottom columns |

Refactored: `src/pages/StudentProfilePage.tsx` — becomes a thin orchestration shell

## Detailed Changes

### 1. `src/pages/StudentProfilePage.tsx` — Restructure as orchestration shell

- Keep all existing data fetching hooks and state at the top
- Add UUID validation for `studentId` param before querying
- Add `ProfileAccessGate` check before rendering content
- Restructure JSX into the 2-column layout:

```text
<div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8">
  <ProfileBreadcrumb />
  <ProfileHeader ref={headerRef} />        -- observed by IntersectionObserver
  <ProfileStickyBar visible={!headerVisible} />
  
  <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
    <div className="lg:col-span-7">       -- LEFT COLUMN
      Personal Info Card
      Family/Guardian Card
      Academic Card
      Financial Summary Card
      (future: Enrollment Timeline, Product Cards, Financial Tabs)
    </div>
    <div className="lg:col-span-3">       -- RIGHT COLUMN
      Placeholder: "Quick actions panel will load here"
      (future: Quick Actions, Financial Mini, Tags, Recent Activity)
    </div>
  </div>
  
  <div>                                    -- BOTTOM FULL-WIDTH
    Sales & Follow-up Notes (existing)
    (future: Full Activity Timeline)
  </div>
</div>
```

- Move existing info cards (Personal, Family, Academic, Financial) into the left column
- Move notes section to the bottom full-width section
- Page background: `bg-[#F8FAFC]` applied via wrapper div

### 2. `ProfileBreadcrumb.tsx`

- Back button: `ghost` variant, `ChevronLeft` icon, "Back" text, navigates to `/students`
- Breadcrumb: "Students" (link) > "[Student Name]" (current page)
- Shows skeleton `w-48 h-4` while loading
- Styled: `text-sm text-slate-600`

### 3. `ProfileHeader.tsx`

Props: student data, permissions, navigate function, forwardRef for IntersectionObserver

- **Avatar**: `w-20 h-20` circle, `ring-4 ring-white shadow-md`, orange `#FF8C00` background with white initials for fallback, shows `photo_url` if available
- **Name**: `text-2xl font-bold text-[#1E3A8A]`
- **Student ID pill**: `bg-slate-100 text-slate-600 text-xs font-mono px-3 py-1 rounded-full`
- **Phone + WhatsApp button**: Phone as plain text, green `#25D366` round button beside it. Phone cleaning logic handles 880/0/raw digit formats. Hidden if no phone.
- **Status badge**: Prominent `rounded-full` badge with colored dot prefix. Colors per status: active=green, inactive=red, graduated=blue, on_hold=yellow. Added `on_hold` mapping (current code doesn't have it).
- **Edit button**: Outlined `border-[#1E3A8A]`, hover fills blue. Visible for Cipher/Admin or Moderators with edit permission. Hidden (not disabled) for DEO.
- **Bottom row**: Divider line, then email + address + "Added on [date]" with icons, truncated with tooltips.
- **Tags placeholder**: Empty div with comment for future prompt.

### 4. `ProfileStickyBar.tsx`

- `position: sticky`, `top: 0`, `z-index: 50`
- Background: `#1E3A8A`, height 56px, subtle bottom shadow
- Contents: Small avatar (w-8 h-8 orange), name (white), compact status badge, spacer, WhatsApp button, Edit button
- Visibility controlled by `visible` prop (boolean from IntersectionObserver)
- Animate: `transition-all duration-200` on transform and opacity
- Mobile: Hide Edit button, show avatar + name + status + WhatsApp only
- IntersectionObserver setup in the parent page component, watching the header card ref

### 5. `ProfileAccessGate.tsx`

- DEO users: If `student.user_id !== currentUserId`, show AccessDeniedState (lock icon in `#1E3A8A`, "Access Restricted" heading, message, back button to `/students`)
- This replaces the existing `AccessGuard` rule at the route level with a more granular per-student ownership check
- Cipher and Admin always pass through

### 6. `ProfileSkeleton.tsx`

- Full page skeleton matching the 2-column layout
- Breadcrumb skeleton line
- Header card skeleton: circle + rectangles for name/id/info
- Left column: 3 skeleton cards
- Right column: 1 skeleton card
- Uses `animate-pulse` with `bg-slate-200`

### 7. Design Token Updates

Apply across all profile components:
- Section headers: 4px left border in `#FF8C00`, bold text in `#1E3A8A`
- Card styling: `bg-white rounded-xl shadow-sm border border-slate-200 p-6`
- Info labels: `text-xs uppercase tracking-wide text-slate-500`
- Info values: `text-sm font-medium text-slate-800`

### 8. Students List Table — Already correct

The existing Students list (line 588) already navigates to `/students/${s.id}/profile` with the View/Eye button, and has a separate CreditCard button for payments. No changes needed.

### 9. Routing — Already correct

Route `/students/:studentId/profile` already exists in `App.tsx` (line 185) with the proper `AccessGuard`. No changes needed.

## Technical Notes

- **UUID validation**: Check `studentId` matches UUID regex before firing query. If invalid, render "not found" immediately.
- **IntersectionObserver**: Create ref on header card, observe in useEffect, track `isHeaderVisible` state. Clean up observer on unmount.
- **Existing functionality preserved**: All notes, financial summary, info cards remain — they just move into the new column layout.
- **No new database tables or migrations** — this is purely a frontend restructure.
- **Print styles**: Add `@media print` rules to `src/index.css` to hide buttons/sidebars/sticky bar.

## Files Modified

| File | Action |
|------|--------|
| `src/components/students/profile/ProfileBreadcrumb.tsx` | Create |
| `src/components/students/profile/ProfileHeader.tsx` | Create |
| `src/components/students/profile/ProfileStickyBar.tsx` | Create |
| `src/components/students/profile/ProfileAccessGate.tsx` | Create |
| `src/components/students/profile/ProfileSkeleton.tsx` | Create |
| `src/pages/StudentProfilePage.tsx` | Refactor into 2-column layout shell |
| `src/index.css` | Add print styles |

