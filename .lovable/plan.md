

# Plan: Cache Invalidation for Storefront Edge Function

## Approach

Add an `invalidate` action to the existing `storefront-cache` edge function, then call it from the client whenever a vendor modifies their shop or products.

## Changes

### 1. Update `supabase/functions/storefront-cache/index.ts`

Add a third action handler:
```
{ action: "invalidate", shop_id: "uuid", slug?: "string" }
```
This clears all cache entries matching the shop: `shop:{slug}`, `products:{shop_id}:*`. Since we may not always have the slug when invalidating, also accept `shop_id` and iterate the cache map to find matching keys.

### 2. Create helper `src/lib/invalidateStorefrontCache.ts`

A small utility function that calls `supabase.functions.invoke('storefront-cache', { body: { action: 'invalidate', shop_id, slug } })`. Fire-and-forget (no await needed in most cases).

### 3. Call invalidation from mutation sites

| Location | Trigger |
|---|---|
| `src/contexts/ProductContext.tsx` — `addProduct`, `updateProduct`, `deleteProduct`, `duplicateProduct`, `toggleVisibility` | After successful product mutation, call `invalidateStorefrontCache(shop.id, shop.slug)` |
| `src/pages/settings/SettingsIdentite.tsx` — save handler | After successful shop update |
| `src/pages/settings/SettingsApparence.tsx` — save handler | After successful shop update |

All calls are fire-and-forget — they don't block the UI or affect the vendor's save flow.

### Files Modified

| File | Change |
|---|---|
| `supabase/functions/storefront-cache/index.ts` | Add `invalidate` action that clears matching cache entries |
| `src/lib/invalidateStorefrontCache.ts` | New utility — single function wrapping the edge function call |
| `src/contexts/ProductContext.tsx` | Call invalidation after product mutations |
| `src/pages/settings/SettingsIdentite.tsx` | Call invalidation after shop identity save |
| `src/pages/settings/SettingsApparence.tsx` | Call invalidation after appearance save |

