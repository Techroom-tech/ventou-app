

## Analysis

The current codebase **already has most of the subdomain multi-tenancy infrastructure**:

- `src/lib/subdomain.ts` → `getSubdomain()` extracts slug from `*.ventou.shop`
- `src/App.tsx` → renders `<ShopStorefront slug={subdomain} />` directly when subdomain detected (no redirect, no Router needed)
- Fallback routes `/boutique/:slug` and `/shop/:slug` exist

### Gaps to fix

1. **Hardcoded domain** — `getSubdomain()` only supports `ventou.shop`. Should support any custom domain pattern for future scalability.
2. **No BrowserRouter in subdomain branch** — storefront rendered via subdomain has no Router, so any internal links or `useNavigate` will crash.
3. **No dedicated StoreNotFound component** — the 404 is inline JSX inside `ShopStorefront`, not a reusable component.
4. **No store context** — slug resolution is ad-hoc; no shared context for "current storefront slug" that prioritizes hostname > route param.
5. **Hardcoded `https://ventou.shop`** in the storefront "back" button — should use relative path or configurable origin.

---

## Implementation Plan

### 1. Refactor `src/lib/subdomain.ts`
- Rename function to `getStoreSlugFromHostname()` (keep `getSubdomain` as alias for backward compat)
- Use generic hostname splitting: split by `.`, if 3+ parts and first part is not `www`, return first part
- Skip localhost, IPs, `*.lovable.app`, and configurable main domains
- Export a `MAIN_DOMAINS` constant for easy future updates

### 2. Create `src/contexts/StorefrontContext.tsx`
- New context providing `{ slug: string; source: 'hostname' | 'route' }`
- Resolves slug with priority: hostname first, then route param fallback
- Wraps the storefront rendering in both App.tsx branches

### 3. Create `src/components/storefront/StoreNotFound.tsx`
- Dedicated production-quality 404 page for stores not found
- No hardcoded URLs — uses relative paths
- Translatable via i18next

### 4. Update `src/App.tsx`
- Wrap subdomain branch in `<BrowserRouter>` so storefront internal routing works
- Use `StorefrontProvider` in both subdomain and route-based storefront rendering
- Ensure catch-all `*` route exists (already present)

### 5. Update `src/pages/ShopStorefront.tsx`
- Replace inline "not found" JSX with `<StoreNotFound />` component
- Remove hardcoded `https://ventou.shop` link
- Ensure all asset/API paths are relative (audit `src=` and `href=` attributes)

### 6. Update `src/pages/ShopStorefrontRoute.tsx`
- Wrap with `StorefrontProvider` using route param as slug source

---

## Files Changed

| File | Action |
|------|--------|
| `src/lib/subdomain.ts` | Refactor to generic hostname logic |
| `src/contexts/StorefrontContext.tsx` | **New** — storefront slug context |
| `src/components/storefront/StoreNotFound.tsx` | **New** — 404 store page |
| `src/App.tsx` | Add BrowserRouter to subdomain branch, integrate context |
| `src/pages/ShopStorefront.tsx` | Use StoreNotFound component, remove hardcoded URLs |
| `src/pages/ShopStorefrontRoute.tsx` | Integrate StorefrontProvider |

