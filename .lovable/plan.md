
# Orders System V6 Upgrade — Plan

## Current State Analysis

After reading all relevant files, here is what already exists and what needs to change:

**Already working (keep untouched):**
- Pagination (page 20, prev/next buttons) — `Orders.tsx` lines 469–494
- Status filter tabs — `Orders.tsx` lines 344–369
- Real-time INSERT subscription — `Orders.tsx` lines 262–282
- CSV export + bulk WhatsApp — `Orders.tsx` lines 37–87
- Context menu (right-click/long press) quick status change — `Orders.tsx` lines 90–130
- `OrderDetailPanel` with WhatsApp, phone, Maps, print receipt — fully implemented
- `useUpdateOrderStatus` with `shop_id` security guard — `useOrders.ts` lines 94–99
- Repeat customer badge — `OrderCard` and desktop table

**What needs to be built:**

1. **New order status enum** — add `archived` to `OrderStatus` type + `ORDER_TRANSITIONS`
2. **Soft delete / archive** — add `is_archived` column to `orders` table (SQL migration), hide from default list, add "Archive" action
3. **Order status log table** — `order_status_logs` table (SQL migration) + auto-insert on every status change
4. **"New" badge** — orders < 10 minutes old get a pulsing badge in the list
5. **Seller internal note** — save note to DB via a `seller_note` column on `orders`
6. **Order timeline** — fetch and display `order_status_logs` in `OrderDetailPanel`
7. **Full dropdown workflow** — replace the 2-button system in `OrderDetailPanel` with a proper dropdown that shows all valid next states per status
8. **Updated status colors** — `preparing` → purple (currently orange), `shipping` → brown/amber (currently purple)
9. **WhatsApp icon in list** — show WhatsApp icon for `payment_method = 'whatsapp'` orders

---

## SQL to Run First (Supabase SQL Editor)

```sql
-- 1. Add archived status to the orders status check (if it exists as a check constraint)
-- Add is_archived soft-delete column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_note text;

-- 2. Create order_status_logs table
CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status text NOT NULL,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

-- Vendors can read logs for their shop's orders
CREATE POLICY "owner_read_order_logs" ON public.order_status_logs
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );

-- Vendors can insert logs (triggered on status change from client)
CREATE POLICY "owner_insert_order_logs" ON public.order_status_logs
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order_id
  ON public.order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_archived
  ON public.orders(is_archived);
```

---

## Files to Modify

| File | Changes |
|---|---|
| `src/types/shop.ts` | Add `archived` to `OrderStatus`, update `ORDER_TRANSITIONS` |
| `src/components/dashboard/OrderStatusBadge.tsx` | Add `archived` style, fix `preparing` color (purple), fix `shipping` color (brown) |
| `src/hooks/useOrders.ts` | Filter out archived by default, add `useOrderStatusLog` mutation (inserts log row), add `useOrderTimeline` query, add `useUpdateSellerNote` mutation |
| `src/components/dashboard/OrderDetailPanel.tsx` | Replace 2-button system with dropdown, add timeline section, add seller note field, add "New" badge logic |
| `src/pages/Orders.tsx` | Add "New" badge (< 10 min), add WhatsApp icon for whatsapp orders, add `is_archived` filter, add `archived` tab |
| `src/i18n/locales/fr.json` | Add `archived` status key, `sellerNote`, `timeline` keys |
| `src/i18n/locales/en.json` | Same in English |

---

## Detailed Changes

### 1. `src/types/shop.ts`

Add `'archived'` to `OrderStatus`:
```ts
export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing'
  | 'shipping' | 'delivered' | 'cancelled' | 'archived';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipping'],
  shipping:  ['delivered'],
  delivered: ['archived'],
  cancelled: ['archived'],
  archived:  [],
};
```

### 2. `src/components/dashboard/OrderStatusBadge.tsx`

Corrected color system:
- `pending` → orange (keep)
- `confirmed` → blue (keep)
- `preparing` → **purple** (was orange/red)
- `shipping` → **brown/amber** (was purple)
- `delivered` → green (keep)
- `cancelled` → red (keep)
- `archived` → **gray** (new)

### 3. `src/hooks/useOrders.ts`

- `useOrders` query: add `.eq('is_archived', false)` by default (unless `includeArchived` flag passed)
- `useOrderCounts`: same filter
- `useUpdateOrderStatus` mutation: after status update, insert a row into `order_status_logs` in the same mutation fn
- New `useOrderTimeline(orderId)`: fetches `order_status_logs` for a given order, ordered by `changed_at`
- New `useUpdateSellerNote()`: mutation to update `seller_note` on an order

### 4. `src/components/dashboard/OrderDetailPanel.tsx`

**Replace** the existing 2-button "Mettre à jour le statut" section with a proper action **dropdown**:

```
[ ▼ Actions ] → dropdown showing all valid next statuses
               + "Annuler" if applicable
               + "Archiver" if applicable
```

Each item in the dropdown matches the transitions defined in `ORDER_TRANSITIONS`.

**Add** below the payment section:
- **Seller Note** field: `<Textarea>` pre-filled with `order.seller_note`, saves on blur via `useUpdateSellerNote`
- **Timeline** section: fetches `order_status_logs`, displays a vertical timeline with status name, date/time, and "changed by"

**"New" badge** in the panel header if order is < 10 minutes old.

### 5. `src/pages/Orders.tsx`

- Add `archived` to `STATUS_TABS` array
- In `OrderCard` and desktop table: add a pulsing `NEW` badge if `Date.now() - new Date(order.created_at) < 10 * 60 * 1000`
- In `OrderCard`: add `<MessageCircle className="h-3 w-3 text-green-600" />` icon next to payment badge when `order.payment_method === 'whatsapp'`
- The query already excludes archived by default (from hook change above)

### 6. i18n

Add to `orders.status`:
```json
"archived": "Archivée"
```
Add to `orders.detail`:
```json
"sellerNote": "Note interne",
"sellerNotePlaceholder": "Visible seulement par vous...",
"timeline": "Historique",
"newBadge": "NOUVEAU",
"archive": "Archiver"
```

---

## Implementation Order

```
Step 1: Update src/types/shop.ts — add archived status + transitions
Step 2: Update src/components/dashboard/OrderStatusBadge.tsx — add archived, fix colors
Step 3: Update src/hooks/useOrders.ts — archive filter, log mutation, timeline query, note mutation
Step 4: Update src/components/dashboard/OrderDetailPanel.tsx — dropdown, timeline, seller note
Step 5: Update src/pages/Orders.tsx — NEW badge, WhatsApp icon, archived tab
Step 6: Update i18n fr.json + en.json — new keys
```

---

## What Is NOT Changed

- All existing routes — untouched
- Storefront, checkout, product system — untouched
- Real-time subscription logic — untouched (already works)
- CSV export, bulk WhatsApp — untouched
- Pagination system — untouched
- `useShop`, `AuthContext`, `DashboardGuard` — untouched
- Print receipt — untouched

---

## SQL Required Before Implementation

Please run the SQL above in Supabase (SQL Editor > New Query) to add `is_archived`, `seller_note`, and create `order_status_logs` before clicking Approve. Once confirmed, implementation begins immediately.
