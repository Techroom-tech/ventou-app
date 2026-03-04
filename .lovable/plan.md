

## Full Campaign Attribution System

This is a major feature spanning database, edge functions, storefront tracking, and a new analytics dashboard. Here is the implementation plan.

---

### Phase 1: Database Schema

Create two new tables:

**`campaign_clicks`** -- records every click on a campaign link with visitor metadata:
- `id` (uuid, PK)
- `link_id` (uuid, FK -> tracked_links)
- `shop_id` (uuid, FK -> shops)
- `visitor_id` (text) -- anonymous session ID stored in localStorage
- `ip_address` (text)
- `country` (text)
- `city` (text)
- `device` (text) -- mobile/desktop/tablet
- `browser` (text)
- `fbclid` (text, nullable)
- `ttclid` (text, nullable)
- `clicked_at` (timestamptz, default now())

**`campaign_events`** -- records funnel events (view_product, add_to_cart, checkout_started, purchase):
- `id` (uuid, PK)
- `click_id` (uuid, FK -> campaign_clicks)
- `link_id` (uuid, FK -> tracked_links)
- `shop_id` (uuid)
- `visitor_id` (text)
- `event_type` (text) -- view_product | add_to_cart | checkout_started | purchase
- `product_id` (uuid, nullable)
- `order_id` (uuid, nullable)
- `revenue` (numeric, nullable)
- `created_at` (timestamptz, default now())

RLS: Public INSERT (for storefront visitors), owner SELECT (shop owner reads their data).

Add indexes on `link_id`, `shop_id`, `visitor_id`, `event_type`.

Update `tracked_links.source` values to include: `facebook_ads`, `tiktok_ads`, `whatsapp`, `instagram`, `influencer`, `direct`.

---

### Phase 2: Edge Function -- `track-link-click` (upgrade)

Upgrade the existing edge function to:
1. Accept extended payload: `{ ref_code, ip_address, country, city, device, browser, fbclid, ttclid, visitor_id }`
2. Insert a row into `campaign_clicks`
3. Continue incrementing `tracked_links.clicks` and `last_clicked_at`
4. Return `{ click_id, link_id }` so the client can store it for subsequent event tracking

---

### Phase 3: New Edge Function -- `track-campaign-event`

Public endpoint (verify_jwt = false) that accepts:
```json
{
  "visitor_id": "...",
  "link_id": "...",
  "click_id": "...",
  "shop_id": "...",
  "event_type": "view_product | add_to_cart | checkout_started | purchase",
  "product_id": "...",
  "order_id": "...",
  "revenue": 0
}
```
Inserts into `campaign_events`.

---

### Phase 4: Storefront Client-Side Tracking

**On link click landing (`ShopStorefront.tsx`)**:
- When `?ref=` is detected, extract `fbclid`, `ttclid` from URL params
- Detect device/browser from `navigator.userAgent`
- Generate/retrieve `visitor_id` from localStorage (`ventou-visitor-{shopId}`)
- Call upgraded `track-link-click` with full metadata
- Store `{ click_id, link_id, visitor_id }` in localStorage as `ventou-campaign-{shopId}`

**On product view** (when `ProductDetailSheet` opens):
- If campaign session exists in localStorage, fire `track-campaign-event` with `event_type: 'view_product'`

**On add to cart** (in `CartContext.addToCart`):
- Fire `track-campaign-event` with `event_type: 'add_to_cart'`

**On checkout started** (when `CheckoutDrawer` opens):
- Fire `track-campaign-event` with `event_type: 'checkout_started'`

**On purchase** (after order is inserted in `CheckoutDrawer`):
- Fire `track-campaign-event` with `event_type: 'purchase'`, `order_id`, `revenue`

Create a helper module `src/lib/campaignTracking.ts` to centralize all this logic.

---

### Phase 5: Campaign Link Redirect

Campaign links should go directly to the product page. Currently the `target_url` already points to `/produit/{slug}`. No change needed for product-destination links. For the shortlink format `/l/{ref_code}`:
- Not implementing a server redirect (would need a separate service). Instead, the existing `?ref=` mechanism already lands on the product page since `target_url` is the product URL.

---

### Phase 6: Update Source Options in Create Dialog

In `MarketingLinks.tsx`, update the source dropdown to use the new values: `facebook_ads`, `tiktok_ads`, `whatsapp`, `instagram`, `influencer`, `direct`.

---

### Phase 7: Campaign Analytics Dashboard

**New page: `src/pages/marketing/CampaignDetail.tsx`** (`/dashboard/marketing/liens/:linkId`)

Shows for a single campaign link:
- KPI cards: Clicks, Add to Cart, Purchases, Conversion Rate (purchases/clicks), Revenue
- Top countries (from campaign_clicks)
- Event log table: Time, Country, Device, Action (event_type)

**Update `MarketingLinks.tsx`**:
- Make each link row clickable to navigate to the detail page
- Add summary stats columns: Conversions, Revenue

**New route** in `App.tsx`: `marketing/liens/:linkId`

---

### Phase 8: Hooks

- `src/hooks/useCampaignAnalytics.ts` -- fetches aggregated stats for a link (clicks, events by type, top countries)
- `src/hooks/useCampaignEvents.ts` -- fetches event log for the detail view

---

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `campaign_clicks` + `campaign_events` tables with RLS |
| `supabase/functions/track-link-click/index.ts` | Upgrade to insert `campaign_clicks` |
| `supabase/functions/track-campaign-event/index.ts` | New edge function |
| `supabase/config.toml` | Add `track-campaign-event` config |
| `src/lib/campaignTracking.ts` | New -- client-side campaign session + event helpers |
| `src/pages/ShopStorefront.tsx` | Upgrade ref detection to full attribution |
| `src/components/storefront/ProductDetailSheet.tsx` | Fire `view_product` event |
| `src/components/storefront/CartContext.tsx` | Fire `add_to_cart` event |
| `src/components/storefront/CheckoutDrawer.tsx` | Fire `checkout_started` + `purchase` events |
| `src/pages/marketing/MarketingLinks.tsx` | Update sources, add clickable rows + stats |
| `src/pages/marketing/CampaignDetail.tsx` | New analytics detail page |
| `src/hooks/useCampaignAnalytics.ts` | New hook |
| `src/hooks/useCampaignEvents.ts` | New hook |
| `src/App.tsx` | Add route for campaign detail |

