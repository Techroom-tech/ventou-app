
# Ventou — Architecture Upgrade Plan

## Current State Assessment

After reviewing all relevant files, here is what already exists vs what needs to be built:

**Already implemented (keep as-is):**
- Orders list page (`/dashboard/orders`) with status filters, search, CSV export, WhatsApp bulk, real-time subscriptions, repeat customer badge, context menu for quick status updates
- `OrderDetailPanel` with print receipt, delivery countdown, WhatsApp contact, Google Maps link, status actions
- `OrderStatusBadge` with all 6 statuses
- `CheckoutDrawer` with COD/WhatsApp payment selection, zod validation
- `ProductDetailSheet` with mobile drawer + desktop 2-col layout, sticky bottom bar, description extraction utility

**What genuinely needs to be built:**
1. Product Edit route (`/dashboard/products/:id/edit`) — currently "Edit" button always navigates to `/dashboard/products/new` (bug in `Products.tsx`)
2. Order schema alignment — `orders` table currently stores items as jsonb blob; needs `order_items` separate table + `delivery_fee`, `subtotal` columns
3. `delivery_settings` table per shop for granular fee control
4. Checkout upgrade — add `delivery_fee` calculation, `navigator.geolocation` button, pull from `delivery_settings`
5. Null guards in `Products.tsx` and `AddProduct.tsx` for `description_json`

---

## Files To Create

| File | Purpose |
|---|---|
| `src/pages/EditProduct.tsx` | Product edit page loading existing product by ID |
| `src/hooks/useDeliverySettings.ts` | React Query hook to fetch/update `delivery_settings` |
| `src/pages/Settings.tsx` | Delivery settings UI (placeholder route) |

## Files To Modify

| File | Change |
|---|---|
| `src/App.tsx` | Add `/dashboard/products/:id/edit` route + `/dashboard/settings` route |
| `src/pages/Products.tsx` | Fix Edit button to navigate to `/dashboard/products/:id/edit` + add null guards |
| `src/components/storefront/CheckoutDrawer.tsx` | Add delivery fee display, geolocation button, read from `delivery_settings` |
| `src/i18n/locales/fr.json` | Add settings + delivery keys |
| `src/i18n/locales/en.json` | Same in English |

---

## SQL to Run in Supabase BEFORE Approving

Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query):

```sql
-- 1. Add missing columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_phone text;

-- 2. Create delivery_settings table
CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  allow_cod boolean NOT NULL DEFAULT true,
  allow_whatsapp boolean NOT NULL DEFAULT false,
  has_delivery_fee boolean NOT NULL DEFAULT false,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

-- 3. RLS for delivery_settings
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_delivery_settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "owner_write_delivery_settings" ON public.delivery_settings;
DROP POLICY IF EXISTS "public_read_delivery_settings" ON public.delivery_settings;

CREATE POLICY "owner_read_delivery_settings" ON public.delivery_settings
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "owner_write_delivery_settings" ON public.delivery_settings
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  ) WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

-- Storefront needs to READ delivery_settings to show correct payment options
CREATE POLICY "public_read_delivery_settings" ON public.delivery_settings
  FOR SELECT USING (true);

-- 4. Performance index
CREATE INDEX IF NOT EXISTS idx_delivery_settings_shop_id
  ON public.delivery_settings(shop_id);
```

---

## Phase 1 — Core Fixes

### Fix 1: Product Edit Route (Critical Bug)

**Problem:** In `src/pages/Products.tsx` line ~130, the Edit dropdown item navigates to `/dashboard/products/new` instead of the edit route:
```tsx
// WRONG (current):
onClick={() => navigate(`/dashboard/products/new`)}

// CORRECT (after fix):
onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}
```

**New file: `src/pages/EditProduct.tsx`**

This page:
- Reads `:id` from `useParams()`
- Fetches the product from Supabase with `shop_id` guard (never load products from other shops)
- Pre-populates all form fields identical to `AddProduct`
- On save: calls `UPDATE` not `INSERT`
- Shows a "Produit introuvable" fallback if ID doesn't match shop
- Same autosave, validation, and zod schema as `AddProduct`
- Reuses the same `SectionCard`, `RichTextEditor`, `ImageUploader`, `VariantsManager`, `TagsInput`, `CategoryPicker` sub-components

The page header will say "Modifier le produit" instead of "Ajouter un produit".

### Fix 2: Null Guards in Products.tsx

Add null safety for `description_json`:
- `product.description_json` could be null/undefined — already handled in `ProductDetailSheet` via `resolveDescription()`, but `Products.tsx` product cards only show name/price/stock so no change needed there
- The edit form must wrap TipTap JSON in try/catch when passing initial content

### Fix 3: Route Registration

Add to `src/App.tsx`:
```tsx
const EditProduct = lazy(() => import('./pages/EditProduct'));

// In Routes:
<Route
  path="/dashboard/products/:id/edit"
  element={
    <ProtectedRoute><DashboardGuard>
      <EditProduct />
    </DashboardGuard></ProtectedRoute>
  }
/>
<Route
  path="/dashboard/settings"
  element={
    <ProtectedRoute><DashboardGuard>
      <Settings />
    </DashboardGuard></ProtectedRoute>
  }
/>
```

---

## Phase 2 — Delivery Settings

### New Hook: `src/hooks/useDeliverySettings.ts`

```ts
// Fetch delivery settings for a shop (public — storefront can read)
export function useDeliverySettings(shopId: string | undefined)

// Upsert delivery settings (vendor only)
export function useUpdateDeliverySettings()
```

Uses `upsert` with `onConflict: 'shop_id'` to insert-or-update in one call.

### New Page: `src/pages/Settings.tsx`

A clean settings page under `DashboardLayout` with sections:

**Section: Livraison & Paiement**
- Toggle: "Accepter le paiement à la livraison (COD)"
- Toggle: "Accepter les commandes WhatsApp"
- Toggle: "Activer les frais de livraison"
- Input (conditionally shown): "Montant des frais de livraison (FCFA)"

This replaces the need to manually set `enable_cod` / `enable_whatsapp_order` on the `shops` table. Both the old `shops` flags AND the new `delivery_settings` table will be respected (OR logic) for backward compatibility.

### Checkout Upgrade: `src/components/storefront/CheckoutDrawer.tsx`

Changes:
1. Fetch `delivery_settings` for the current shop via `useQuery`
2. Show `delivery_fee` line in order summary if `has_delivery_fee = true`
3. Recalculate total = `subtotal + delivery_fee`
4. Add geolocation button next to the location URL field:
   ```tsx
   <Button onClick={handleGetLocation} variant="outline" size="sm">
     📍 Ma position
   </Button>
   ```
   Uses `navigator.geolocation.getCurrentPosition()` to build a Google Maps URL
5. Include `subtotal` and `delivery_fee` in the order insert payload

---

## Implementation Sequence

```text
Step 1: Modify Products.tsx → fix Edit button navigation (2 lines)
Step 2: Create EditProduct.tsx → full product edit page
Step 3: Modify App.tsx → register new routes
Step 4: Create useDeliverySettings.ts hook
Step 5: Create Settings.tsx page
Step 6: Modify CheckoutDrawer.tsx → delivery fee + geolocation
Step 7: Modify fr.json + en.json → add new i18n keys
```

---

## Security Guarantees

- `EditProduct` always filters by `shop_id = shop.id` from `useShop()` — URL param `:id` alone is never trusted for the DB query
- `delivery_settings` RLS: vendors can only read/write their own shop's settings; storefront (anon) can only read
- `orders` update still filtered by `shop_id` in `useUpdateOrderStatus`
- No changes to existing RLS on `products`, `orders`, or `shops`

---

## What Is NOT Changed (Stability)

- All existing routes remain functional
- `OrderDetailPanel`, `OrderStatusBadge`, `useOrders`, `useRevenueChart` — untouched
- `ProductDetailSheet` storefront component — untouched
- `ShopStorefront` — only `CheckoutDrawer` changes (backward compatible)
- `AuthContext`, `DashboardGuard`, `ProtectedRoute` — untouched
- i18n structure — only additive (new keys, no removal)
