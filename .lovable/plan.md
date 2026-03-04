

## Diagnostic: Architecture Stability Assessment

After thorough review of the codebase, **most of the 14 items you listed are already implemented and working**. Here is the honest status:

### Already Implemented (No Work Needed)

| Feature | Status |
|---------|--------|
| Multi-tenant subdomain routing | Done -- `getStoreSlugFromHostname()` + Cloudflare Worker proxy |
| Data isolation by shop_id | Done -- RLS policies on all tables filter by `shop_id` via `owner_id` |
| Public storefront page | Done -- `ShopStorefront.tsx` (banner, logo, name, WhatsApp, products) |
| Product detail page | Done -- `ProductDetailSheet` (gallery, price, description, cart, WhatsApp) |
| Order system (COD/WhatsApp) | Done -- `CheckoutDrawer` with name, phone, city, quartier, notes, maps |
| Vendor orders dashboard | Done -- `Orders.tsx` with statuses, quick actions, bulk ops, CSV export |
| Vendor analytics | Done -- `Dashboard.tsx` KPIs + `MarketingAnalytics` page |
| Marketing coupons & promos | Done -- `MarketingCoupons`, `MarketingPromos`, `flash_promotions` table |
| Tracking pixels (FB, TikTok, GTM) | Done -- `useStorefrontTracking` with sanitized injection + CAPI relay |
| Edge cache layer | Done -- `storefront-cache` function with in-memory TTL |
| Mobile-first UX | Done -- responsive layouts, mobile bottom nav, touch-friendly buttons |
| Input sanitization & XSS | Done -- DOMPurify, script sanitizer, rate limiting on slug check |
| Audit logging | Done -- `admin_audit_logs` table, shop creation diagnostic panel |

### Real Gaps Worth Addressing

After analyzing what is genuinely missing or fragile, here are the improvements that would make the architecture production-ready:

---

### Plan: 5 Targeted Stabilization Tasks

#### 1. Add `deleted_at IS NULL` filter to `useShop` hook
The `useShop` hook fetches all shops for a vendor but does not exclude soft-deleted shops. A vendor who soft-deletes a shop will still see it in their dashboard switcher.

**Change**: Add `.is('deleted_at', null)` to the query in `src/hooks/useShop.ts`.

#### 2. Add `deleted_at IS NULL` filter to storefront cache
The `storefront-cache` edge function fetches shops by slug with `is_active = true` but does not check `deleted_at`. A soft-deleted shop could still be served publicly.

**Change**: Add `.is('deleted_at', null)` to the shop query in `supabase/functions/storefront-cache/index.ts`.

#### 3. Add `status = 'published'` filter to storefront product query
The storefront cache fetches products with `is_active = true` but ignores the `status` column. Draft products could appear on the public storefront.

**Change**: Add `.eq('status', 'published')` to the products query in the storefront cache function.

#### 4. Harden RLS: add `deleted_at IS NULL` to public shop visibility policy
The current `Public can view active shops` policy only checks `is_active = true`. Soft-deleted shops remain publicly visible.

**Change**: SQL migration to update the policy: `USING (is_active = true AND deleted_at IS NULL)`.

#### 5. Fix `useShop` to exclude suspended shops from vendor dashboard
The `is_suspended` field exists on the `Shop` type but the `useShop` query does not filter it. A suspended shop should show a warning, not operate normally.

**Change**: Add `.or('is_suspended.is.null,is_suspended.eq.false')` to the query, or display a suspension banner in the dashboard when detected.

---

### What This Does NOT Include (Already Working)

These are explicitly excluded because they are already solid:
- Subdomain middleware (Cloudflare Worker + `getStoreSlugFromHostname`)
- RLS isolation per shop_id (all tables have appropriate policies)
- Cart persistence per shop (`ventou-cart-{shopId}`)
- Pixel injection with sanitization
- Order lifecycle (pending -> confirmed -> delivered -> cancelled)
- Cache invalidation on product/shop changes
- Rate limiting on slug validation

### Summary

5 targeted fixes to close soft-delete and status gaps across the query layer and RLS policies. No architectural rewrite needed -- the foundation is solid.

