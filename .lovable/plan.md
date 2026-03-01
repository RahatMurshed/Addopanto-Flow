

# A7 — UI/UX, Navigation and Dead Links Audit Report

---

## 1. ROUTING and NAVIGATION

| Check | Status | Notes |
|-------|--------|-------|
| Every route in App.tsx has a page component | ✅ Pass | All 30+ routes map to lazy-loaded components that exist |
| Dead routes (pointing to non-existent components) | ✅ Pass | None found |
| Unreachable pages (no route defined) | ✅ Pass | All pages have routes |
| 404 page implemented | ✅ Pass | `NotFound` at `path="*"`, logs to console |
| `/reset-password` route | ✅ Pass | Defined outside ProtectedRoute, accessible without auth |
| Breadcrumb links correct | ✅ Pass | ProfileBreadcrumb links to `/students`, other pages use similar patterns |
| "Back" buttons navigate correctly | ✅ Pass | StudentProfilePage -> `/students`, CourseDetail -> `/courses`, etc. |
| Sidebar navigation links correct | ✅ Pass | All `href` values match defined routes |
| External links open in new tab | ✅ Pass | WhatsApp link uses `window.open(..., "_blank")` |
| Active route highlighted in sidebar | ✅ Pass | `isActive = location.pathname === item.href` with distinct styling |
| `/batches` redirect to `/courses` | ✅ Pass | `Navigate to="/courses" replace` |
| `/requests` redirect to `/company/members` | ✅ Pass | Legacy redirect in place |

**Sidebar active highlight limitation:**
| Sub-route highlighting | ⚠️ Warning | Visiting `/students/new` or `/courses/123` does NOT highlight the parent nav item because the match is `===` exact. Only the exact path is highlighted. |

---

## 2. BROKEN ACTION BUTTONS and LINKS

| Check | Status | Notes |
|-------|--------|-------|
| "Coming soon" toast buttons | ❌ Fail | **"Export PDF Report"** and **"Manage Tags"** in QuickActionsPanel still show "coming soon" toasts (lines 160, 174) |
| Buttons with no handler/feedback | ✅ Pass | All buttons have onClick handlers or navigation |
| Submit buttons without loading state | ✅ Pass | All form submit buttons show `Loader2` spinner during saving |
| Delete without confirmation | ✅ Pass | All delete actions use `AlertDialog` confirmation |
| Links to blank pages | ✅ Pass | None found |
| Action buttons visible to wrong roles | ✅ Pass | QuickActions gated by `isAdminOrCipher`, sidebar gated by role checks |
| DEO "Add Revenue" button hidden | ✅ Pass | Revenue.tsx: `canAddRevenue && !isDataEntryModerator` |

---

## 3. EMPTY STATES

| Check | Status | Notes |
|-------|--------|-------|
| Students page empty state | ✅ Pass | Shows icon, message, and "Add Student" CTA |
| Courses page empty state | ✅ Pass | "No courses yet" with CTA |
| Batches page empty state | ✅ Pass | Handled |
| Revenue page empty state | ✅ Pass | "No revenue in [period]" with contextual CTA |
| Expenses page empty state | ✅ Pass | Alert for no accounts + empty table state |
| Dashboard with no data | ✅ Pass | Shows zero-value cards, empty charts handled |
| Enrollment Timeline empty state | ✅ Pass | Shows "No enrollments yet" with descriptive text (line 191) |
| Sales Notes empty state | ✅ Pass | Note form is always visible; empty list shows no notes |
| DEO no-permissions empty state | ✅ Pass | Dashboard shows "No permissions assigned" card |
| Traditional Moderator restricted dashboard | ✅ Pass | Shows "Financial Metrics Restricted" with quick actions |
| Filtered results empty state | ✅ Pass | Students shows "No students match your filters" with "Clear all filters" link |
| Empty states are actionable | ✅ Pass | Most include CTAs directing users to next action |

---

## 4. LOADING STATES

| Check | Status | Notes |
|-------|--------|-------|
| Dashboard skeletons | ✅ Pass | `SkeletonCards(5)`, `SkeletonChart`, `SkeletonTable` |
| Student Profile independent skeletons | ✅ Pass | `ProfileSkeleton`, EnrollmentTimeline has own skeleton, FinancialBreakdown has `FinancialSkeleton` |
| Revenue page skeleton | ✅ Pass | Shows `Skeleton` + `SkeletonTable` |
| Expenses page skeleton | ✅ Pass | Shows `Skeleton` + `SkeletonTable` |
| Reports page skeleton | ✅ Pass | `SkeletonCards` + `SkeletonChart` + `SkeletonTable` |
| Khatas page skeleton | ✅ Pass | `SkeletonKhataCards` |
| Students page skeleton | ✅ Pass | Multi-section skeleton with cards, charts, table |
| Form submit loading spinners | ✅ Pass | All dialogs use `Loader2` + disabled state |
| Global page transition loader | ✅ Pass | `Suspense fallback={ContentLoader}` inside CompanyGuard, `BrandedLoader` for auth |
| QuickActionsPanel loading skeleton | ✅ Pass | Renders skeleton when `isLoading` |
| Blank white space during load | ✅ Pass | No instances found - all pages have skeleton fallbacks |

---

## 5. ERROR STATES

| Check | Status | Notes |
|-------|--------|-------|
| Global error boundary | ✅ Pass | `ErrorBoundary` wraps entire app, `SectionErrorBoundary` wraps page content, `CriticalRouteErrorBoundary` for key routes |
| Error boundary auto-retry | ✅ Pass | `ErrorBoundary` retries up to 3 times with delay |
| User-friendly error messages | ✅ Pass | Toast notifications show `err.message`, not raw SQL |
| Form validation errors near fields | ✅ Pass | Zod + react-hook-form with inline `FormMessage` |
| RLS policy blocks | ⚠️ Warning | RLS errors surface as generic Supabase error messages in toasts. Not always user-friendly (e.g., "new row violates RLS policy") |
| Offline handling | ✅ Pass | `OfflineBanner` component listens to `online`/`offline` events, shows fixed banner |
| Failed form submission feedback | ✅ Pass | All mutations catch errors and show destructive toasts |
| Global mutation error handler | ✅ Pass | QueryClient `onError` shows sonner toast for all mutations |
| Unhandled promise rejections | ⚠️ Warning | No global `unhandledrejection` listener. Console errors from error boundaries but no global catch-all for async code outside React |

---

## 6. FORM VALIDATION and UX

| Check | Status | Notes |
|-------|--------|-------|
| Required fields marked | ✅ Pass | Key forms use `*` or Zod required validation |
| Inline validation | ✅ Pass | Forms using react-hook-form + Zod show inline errors via `FormMessage` |
| Form reset after submission | ✅ Pass | Dialogs use `form.reset()` in `useEffect` when `open` changes |
| Unsaved changes protection | ✅ Pass | `NavigationBlockerProvider` + `beforeunload` event handler |
| Date pickers consistent | ✅ Pass | All use `Popover` + `Calendar` pattern from shadcn |
| Currency inputs consistent | ✅ Pass | `useCompanyCurrency` used throughout |
| Multi-step wizard data preservation | ✅ Pass | `AddStudent` saves draft to localStorage between steps |
| Student Wizard edit mode | ✅ Pass | Pre-fills data from student prop |
| Phone formatting | ⚠️ Warning | Phone inputs are plain text `Input` fields with no formatting mask. `cleanPhone` utility exists for display but no input-level formatting |

---

## 7. RESPONSIVE DESIGN and MOBILE

| Check | Status | Notes |
|-------|--------|-------|
| Sidebar collapse on mobile | ✅ Pass | Desktop sidebar hidden `md:flex`, mobile uses overlay slide-in nav |
| Tables horizontal scroll | ⚠️ Warning | Tables use `overflow-x-auto` on card but some wide tables may clip on very small screens (320px) |
| Student Profile stacking | ✅ Pass | `grid-cols-1 lg:grid-cols-10` layout stacks on mobile |
| LifetimeValueBanner mobile | ✅ Pass | Uses responsive grid classes |
| FAB speed dial | ✅ Pass | `QuickActionsPanel` has dedicated mobile FAB at `lg:hidden` with backdrop and animation |
| Dialogs on mobile | ✅ Pass | shadcn `Dialog` is responsive; `DialogContent` has `max-h-[85vh] overflow-y-auto` |
| Touch targets (44px minimum) | ⚠️ Warning | Mobile FAB buttons are `w-12 h-12` (48px) - pass. But some table action icon buttons (`size="icon"` = `h-10 w-10` = 40px) are slightly under 44px |
| Fixed-width layout breaks | ✅ Pass | All pages use responsive grid and flex layouts |
| Sticky header on iOS Safari | ⚠️ Warning | `ProfileStickyBar` uses `fixed top-0` which generally works on iOS Safari, but no `-webkit-sticky` fallback |
| Mobile menu closes on navigation | ✅ Pass | `onClick={() => setMobileOpen(false)}` on all nav links |

---

## 8. CONSISTENCY and POLISH

| Check | Status | Notes |
|-------|--------|-------|
| Orange/Blue theme applied | ✅ Pass | `#FF8C00` and `#1E3A8A` used consistently in FAB, icons, section headers |
| Section headers with orange left-border | ✅ Pass | `SectionHeader` uses `w-1 h-6 rounded-full bg-primary` consistently |
| Status badges consistent | ✅ Pass | Status badges use consistent color mapping across Students, Batches, Courses |
| Card styling consistent | ✅ Pass | All use shadcn `Card` with consistent border-radius and padding |
| Typography consistent | ✅ Pass | `text-2xl font-bold` for page titles, `text-muted-foreground` for descriptions |
| Toast notifications consistent | ✅ Pass | Uses both `useToast` (radix) and Sonner; position and style are consistent |
| Confirmation dialogs consistent | ✅ Pass | All use `AlertDialog` with Cancel/Confirm pattern |
| Loading skeletons consistent | ✅ Pass | `SkeletonCards`, `SkeletonTable`, `SkeletonChart` shared components |
| Company logo/name in sidebar | ✅ Pass | Shows logo + name with company switcher dropdown |
| Icons from same library | ✅ Pass | All icons from `lucide-react` |
| Two toast systems | ⚠️ Warning | App uses both `@radix-ui/react-toast` (via `useToast`) and `sonner` (for global mutation errors). Could cause overlapping toasts |

---

## 9. ACCESSIBILITY

| Check | Status | Notes |
|-------|--------|-------|
| Images have alt text | ✅ Pass | Logo images have `alt="Grammar Addopanto"`, avatar uses fallback |
| Icon-only buttons have aria-labels | ⚠️ Warning | Mobile menu button has no `aria-label`. ThemeToggle and some icon-only buttons may lack explicit labels (tooltips serve as visual but not always `aria-label`) |
| Form inputs labeled | ✅ Pass | Uses `FormLabel` with `htmlFor` via `useFormField` |
| Keyboard navigation | ✅ Pass | `SkipLink` component for skip-to-content, Tab navigation works through sidebar |
| Modal focus trapping | ✅ Pass | Radix `Dialog` and `AlertDialog` auto-trap focus |
| Color contrast | ✅ Pass | Runtime contrast validator (WCAG 2.1 AA) with auto-adjustment |
| Error messages aria-describedby | ✅ Pass | `FormControl` sets `aria-describedby` linking to `formMessageId` |
| WCAG CI enforcement | ✅ Pass | axe-core runs across 22+ routes in CI |

---

## 10. PERFORMANCE and UX PERCEPTION

| Check | Status | Notes |
|-------|--------|-------|
| Slow-loading pages | ⚠️ Warning | Dashboard fetches 7 parallel queries; could feel slow on first load with large datasets |
| Lists paginated | ✅ Pass | Server-side pagination for Students (50/page), client pagination for transactions |
| Images optimized | ✅ Pass | Only logo image used, small PNG |
| Unnecessary re-renders | ✅ Pass | Extensive use of `useMemo`, `useCallback`, and `React.memo` |
| Initial page load | ✅ Pass | Lazy loading via `React.lazy` for all page components |
| Console errors/warnings in production | ⚠️ Warning | 19 files contain `console.error`/`console.warn` statements. Most are in error handlers (appropriate), but `NotFound.tsx` logs to `console.error` on every 404 |
| TODO/placeholder text in UI | ✅ Pass | "placeholder" only appears in form input placeholders (correct usage), not visible as UI text |
| Stale data flash | ✅ Pass | `staleTime: 30_000` prevents immediate refetch, skeletons shown on initial load |
| Dashboard 1000-row query limit | ⚠️ Warning | Dashboard query fetches revenues/expenses with no `.limit()` on aggregate queries (lines 150-151). Will hit 1000-row Supabase limit at scale. Reports uses RPC to avoid this, but Dashboard does not |

---

## PRIORITIZED FIX LIST

### Critical (Fix Now)

1. **Dashboard 1000-row query limit** — Dashboard fetches `revenues` and `expenses` without `.limit()` or RPC aggregation. At scale (>1000 entries), stat cards and charts will show incorrect data. Reports page already uses RPC; Dashboard should do the same.

### Important (Fix Soon)

2. **"Coming soon" toasts** — QuickActionsPanel "Export PDF Report" and "Manage Tags" buttons show placeholder toasts. Either implement the features or hide the buttons with a "planned" indicator.

3. **RLS error messages not user-friendly** — When RLS blocks an action, users see raw Supabase errors like "new row violates RLS policy". Add a middleware/wrapper that translates common RLS errors to friendly messages.

4. **Dual toast system** — Both `@radix-ui/react-toast` and `sonner` are active simultaneously. Risk of overlapping notifications. Consolidate to one system.

5. **Mobile icon button touch targets** — Some table action buttons (`h-10 w-10` = 40px) are under the 44px WCAG minimum. Increase to `h-11 w-11` or add padding.

6. **Sidebar sub-route highlighting** — Visiting `/students/123/profile` doesn't highlight "Students" in sidebar. Use `location.pathname.startsWith(item.href)` instead of exact match.

### Minor (Polish)

7. **Phone input formatting** — No input mask for phone numbers. Consider a formatting utility or mask component for consistency.

8. **Mobile menu aria-label** — Add `aria-label="Open navigation menu"` to the mobile hamburger button.

9. **No global `unhandledrejection` listener** — Async errors outside React components are not caught. Consider adding a global handler.

10. **NotFound console.error** — `console.error` on every 404 is noisy for production. Downgrade to `console.warn` or remove.

11. **iOS Safari sticky positioning** — `ProfileStickyBar` uses `fixed top-0` which works but consider testing on older iOS Safari versions.

