

# Plan: Fix Dashboard Performance — Eliminate Page Blanche & Slow Navigation

## Root Cause Analysis

After reviewing the codebase, I identified **three compounding issues** causing the 3-5 second navigation and page blanche:

1. **`base: "./"` in vite.config.ts** — On deep routes like `/dashboard/marketing/pixels`, the browser resolves CSS/JS assets relative to the current path (e.g., `/dashboard/marketing/assets/index.css`), which returns `index.html` as `text/plain` → page blanche on refresh.

2. **No shared layout route** — Every dashboard page independently wraps in `<ProtectedRoute><DashboardGuard><Page /></DashboardGuard></ProtectedRoute>`. On each navigation, React unmounts and remounts the entire component tree (guards, sidebar, header, hooks). This triggers:
   - Auth check → loading spinner
   - Shop fetch → loading spinner  
   - Page content mount
   - All page-specific queries
   
   Total: 3-5 cascading async waterfalls per navigation.

3. **No global query defaults** — `QueryClient` has no `staleTime`, so every hook refetches on mount even if data was fetched 100ms ago.

4. **`ProductProvider` wraps ALL dashboard routes** — triggers product queries on Marketing, Settings, Customers pages where they're not needed.

## Changes

### 1. Fix Vite base path (fixes page blanche)
**File: `vite.config.ts`**
- Change `base: "./"` to `base: "/"`

**File: `cloudflare-worker/ventou-wildcard-proxy.js`**
- Verify asset proxying handles absolute paths (already does based on memory).

### 2. Create shared dashboard layout route
**File: `src/App.tsx`**
- Replace 30+ individually-wrapped `<ProtectedRoute><DashboardGuard>` routes with a single parent `<Route path="/dashboard" element={<DashboardShell />}>` that renders the guards and layout ONCE, with `<Outlet />` for child routes.
- This means navigating between `/dashboard/products` and `/dashboard/orders` only swaps the inner content — sidebar, header, guards stay mounted. No re-auth, no re-fetch shop.

**File: `src/components/dashboard/DashboardShell.tsx`** (new)
- Combines `ProtectedRoute` + `DashboardGuard` + `DashboardLayout` + `Suspense` into a single wrapper with skeleton fallback.
- Uses React Router `<Outlet />` for child content.

### 3. Add QueryClient global defaults
**File: `src/App.tsx`**
```
staleTime: 30_000,        // 30s — prevent refetch storms
gcTime: 5 * 60 * 1000,    // 5min garbage collection
retry: 1,
refetchOnWindowFocus: false
```

### 4. Guard localStorage in AuthContext
**File: `src/contexts/AuthContext.tsx`**
- Wrap `isSessionExpired()` and `clearSessionFlags()` with `typeof window !== 'undefined'`.

### 5. Move ProductProvider to product routes only
**File: `src/App.tsx`**
- Remove `<ProductProvider>` from wrapping ALL routes. Instead, wrap only `/dashboard/products/*` routes.

### 6. Add dashboard skeleton fallback
**File: `src/components/dashboard/DashboardSkeleton.tsx`** (new)
- A lightweight skeleton (sidebar placeholder + header bar + content area pulses) shown during Suspense instead of a blank spinner.

## Files Modified

| File | Change |
|---|---|
| `vite.config.ts` | `base: "/"` |
| `src/App.tsx` | Nested layout route, QueryClient defaults, ProductProvider scope |
| `src/components/dashboard/DashboardShell.tsx` | New — shared guard+layout wrapper with Outlet |
| `src/components/dashboard/DashboardSkeleton.tsx` | New — skeleton fallback |
| `src/contexts/AuthContext.tsx` | Guard localStorage calls |

## Expected Impact

| Metric | Before | After |
|---|---|---|
| Page blanche on refresh | Yes (deep routes) | No |
| Inter-page navigation | 3-5s (full remount) | <300ms (only content swap) |
| Auth/Shop re-check per nav | Every page | Once on mount |
| Product queries on non-product pages | Yes | No |
| Refetch on every mount | Yes | Only after 30s stale |

