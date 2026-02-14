

## Show Sidebar During Page Loading

### Problem
Currently, when a page is loading (either via lazy-load Suspense or company data loading), the entire screen is replaced by a full-screen spinner, hiding the sidebar. This feels jarring.

### Solution
Keep the `AppLayout` (sidebar) visible and only show a spinner in the main content area.

### Changes

**1. Create a content-area spinner component (`src/App.tsx`)**
- Add a new `ContentLoader` component -- a centered spinner that fits inside the main content area (no `min-h-screen`, just flex-centered with padding).

**2. Update `CompanyGuard` (`src/App.tsx`)**
- When `isLoading` is true but the route is NOT a `/companies` route, render `<AppLayout><ContentLoader /></AppLayout>` instead of the full-screen `BrandedLoader`.
- This requires the company context to have enough data to render the sidebar even during loading. Since `isLoading` in the company context means companies are still being fetched, the sidebar may not have company data yet. To handle this gracefully, show the `AppLayout` shell with the spinner inside.

**3. Wrap `Suspense` inside `AppLayout` (`src/App.tsx`)**
- Move the `<Suspense>` boundary so it wraps only the page content inside `AppLayout`, not the entire layout. This way, when a lazy-loaded page is loading, the sidebar stays visible and only the content area shows the fallback spinner.
- Specifically, in `CompanyGuard`, change from `<AppLayout>{children}</AppLayout>` to `<AppLayout><Suspense fallback={<ContentLoader />}>{children}</Suspense></AppLayout>`.

**4. Keep full-screen `BrandedLoader` for auth-level loading**
- The `ProtectedRoute` auth check (`loading` from `useAuth`) and `PublicRoute` will continue using the full-screen `BrandedLoader` since the sidebar cannot be shown before authentication is confirmed.

### Result
- Auth loading: full-screen spinner (no sidebar available yet)
- Company loading: sidebar visible, spinner in content area
- Page lazy-load: sidebar visible, spinner in content area
- Page transitions: sidebar stays stable, only content swaps
