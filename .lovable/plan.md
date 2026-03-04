

# Plan: Fix Multi-Tenant Tracking System

## Root Cause

The `tracking_settings` table has RLS that only allows authenticated shop owners to read. Public storefront visitors (anonymous) cannot query tracking settings, so pixels are never injected on `test.ventou.shop`.

## Changes

### 1. Add public SELECT RLS policy on `tracking_settings`

SQL migration:
```sql
CREATE POLICY "public_read_tracking_settings"
ON public.tracking_settings
FOR SELECT
TO anon, authenticated
USING (true);
```

This allows the storefront to fetch pixel IDs for any shop. The data is non-sensitive (pixel IDs are public by nature — they're meant to be in page source).

### 2. Refactor `useStorefrontTracking.ts` — Unified tracker + event_id deduplication

- Add `event_id` (crypto.randomUUID) to every event call for CAPI deduplication
- Create `window.VentouTracker` global object with methods: `trackPageView`, `trackViewContent`, `trackAddToCart`, `trackInitiateCheckout`, `trackPurchase`
- Each method fires fbq + ttq + gtag with unique event_id
- Sanitize custom_scripts: strip `<iframe>`, `eval(`, `document.write` before injection
- Remove the `container.innerHTML = scripts` XSS vector — parse and only allow `<script src="...">` or inline text content after sanitization

### 3. Refactor `CheckoutDrawer.tsx` — Add `trackPurchase` on order success

After successful order insert, call `window.VentouTracker.trackPurchase()` with order value, currency, content_ids, and event_id.

### 4. Create Edge Function `supabase/functions/track-event/index.ts` — Server-side CAPI

- Receives: `event_name`, `event_id`, `shop_id`, `user_data` (hashed), `custom_data`
- Fetches `tracking_settings` for the shop using service role
- If `facebook_pixel` exists: POST to `https://graph.facebook.com/v18.0/{pixel_id}/events` with the CAPI token (stored in a new `facebook_capi_token` column)
- If `tiktok_pixel` exists: POST to TikTok Events API
- Returns success/failure
- Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS

### 5. Add `facebook_capi_token` column to `tracking_settings`

SQL migration:
```sql
ALTER TABLE tracking_settings ADD COLUMN IF NOT EXISTS facebook_capi_token text;
```

### 6. Update `MarketingPixels.tsx` — Save CAPI token

The fbApiToken state already exists but isn't persisted. Wire it to the new `facebook_capi_token` column in the save handler and load it from settings.

### 7. Update `supabase/config.toml` — Register edge function

Add `[functions.track-event]` with `verify_jwt = false` (called from storefront without auth).

## Files Modified

| File | Change |
|---|---|
| Migration SQL | Add public read policy + `facebook_capi_token` column |
| `src/hooks/useStorefrontTracking.ts` | Unified VentouTracker, event_id dedup, XSS sanitization |
| `src/components/storefront/CheckoutDrawer.tsx` | Call trackPurchase on success |
| `src/pages/marketing/MarketingPixels.tsx` | Persist CAPI token |
| `src/hooks/useTrackingSettings.ts` | Add facebook_capi_token field |
| `supabase/functions/track-event/index.ts` | Server-side CAPI relay |
| `supabase/config.toml` | Register track-event function |

## What stays the same

- DB table structure (tracking_settings) — just adding 1 column + 1 policy
- Subdomain detection (lib/subdomain.ts) — already works correctly
- App.tsx routing — already renders ShopStorefront for subdomain hosts
- StorefrontContext — already resolves slug from hostname

## Security

- CAPI token never exposed client-side (only used in edge function)
- Custom scripts sanitized (no iframe, eval, document.write)
- Pixel IDs are inherently public (visible in page source on any website)
- Edge function validates input with zod before forwarding to Meta/TikTok APIs

