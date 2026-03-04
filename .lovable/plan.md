

# Plan: Edge Function Cache for Storefront Queries

## Problem
Every storefront visit triggers 2 direct DB queries (shop by slug + products list). At scale with thousands of concurrent visitors, this creates unnecessary DB load since shop/product data changes infrequently.

## Solution
Create a Supabase Edge Function `storefront-cache` that acts as a caching proxy with **in-memory TTL cache** at the Deno isolate level. The storefront client calls the edge function instead of Supabase directly.

## Changes

### 1. New Edge Function: `supabase/functions/storefront-cache/index.ts`

Handles two actions via POST body:
- `{ action: "shop", slug: "my-shop" }` — returns shop data, cached 5 minutes
- `{ action: "products", shop_id: "uuid" }` — returns products list, cached 2 minutes

In-memory `Map<string, { data, expiry }>` provides zero-latency cache hits within the same isolate. Cache misses query Supabase with the service role key and populate the cache.

### 2. Update `supabase/config.toml`

Add `[functions.storefront-cache]` with `verify_jwt = false` (public storefront, no auth needed).

### 3. Update `src/pages/ShopStorefront.tsx`

Replace the two direct `supabase.from()` queries with calls to the edge function via `supabase.functions.invoke('storefront-cache', ...)`. Keep the same `useQuery` wrappers with `staleTime: 60_000` for client-side caching on top.

## Technical Details

| Layer | TTL | Purpose |
|---|---|---|
| Edge Function in-memory | 5min (shop) / 2min (products) | Reduce DB queries across all visitors |
| React Query `staleTime` | 60s | Reduce edge function calls per user session |

The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (read-only, public data only — active shops + active products). No sensitive data is exposed.

### Files Modified

| File | Change |
|---|---|
| `supabase/functions/storefront-cache/index.ts` | New edge function with in-memory cache |
| `supabase/config.toml` | Add function config |
| `src/pages/ShopStorefront.tsx` | Call edge function instead of direct DB |

