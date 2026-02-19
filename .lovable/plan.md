
# Orders V6 — Dedicated Page + Stitch Premium UI

## Current State

The order detail is rendered as a `Sheet` (slide-over panel) on the right side of the `Orders.tsx` page. The user wants it replaced with:
- A **dedicated full-page route** `/dashboard/commandes/:orderId`
- The **exact Stitch HTML layout** converted to React — mobile-first, no overlays, no sheets

All existing logic (status update, timeline, notes, CSV export, real-time, pagination) is preserved. Only the detail **presentation layer** changes.

---

## What Changes

| Item | Current | New |
|---|---|---|
| Order detail UI | `<Sheet>` slide-over | Dedicated page `/dashboard/commandes/:orderId` |
| Route | Only `/dashboard/orders` exists | Add `/dashboard/commandes/:orderId` |
| Navigation | `setSelectedOrder(order)` state | `navigate('/dashboard/commandes/' + order.id)` |
| Detail panel file | `OrderDetailPanel.tsx` (Sheet-based) | New `OrderDetailPage.tsx` full-page component |
| Orders list | Opens sheet on row click | Navigates to detail page |
| Header | Inside sheet | Sticky breadcrumb + order number + badge + print + 3-dots |
| Timeline | Horizontal bubble row | Stitch-style: numbered circles, connector lines, EN ATTENTE at step 1 |
| CTA Buttons | Mixed inside card | Large primary CTA "Confirmer la commande" + WhatsApp + Appeler below timeline |
| Articles | Table inside sheet | Card with product list (icon, name, variant, qty, total) |
| Notes | Notes list + add input | Yellow sticky-note style cards + input at bottom |
| Financials | Basic list | Sous-total / Livraison (badge) / Remise / Total bold / Marge estimée |
| Customer card | Small card | Avatar initials + Verified badge + Client Fidèle + stats grid + contact items |
| History | Vertical timeline | Compact action list "Note ajoutée", "Commande créée" with times |

---

## SQL Required (run before or it already exists)

The `order_status_logs` and `seller_note` column were already created in the previous migration. No new SQL is needed for this phase.

---

## Files to Create / Modify

### New File: `src/pages/OrderDetail.tsx`

Full-page order detail in the Stitch premium style. Built with:
- `useParams` to get `orderId`
- Data fetched from Supabase: order by id, `useOrderTimeline`, `useRepeatCustomers`
- All real actions: status transitions, notes, WhatsApp, print

**Layout structure:**
```text
<DashboardLayout>
  ├── Sticky Header (breadcrumb + order# + badge + print + 3-dots)
  ├── Horizontal Timeline (EN_ATTENTE → CONFIRMÉE → PRÉPARATION → LIVRAISON → LIVRÉE)
  ├── Action Buttons Row (primary CTA + WhatsApp + Appeler + Maps)
  ├── Articles Card (table: product icon, name/variant, qty, total)
  ├── Notes Internes Card (yellow notes list + add input)
  ├── Détails Financiers Card (subtotal, delivery, discount, total bold, marge)
  ├── Customer Card (avatar, badges, stats grid 2col, phone/email/address)
  └── Historique Card (vertical event list)
```

**Mobile:** All sections stack vertically, CTA is sticky at bottom on mobile.

**Desktop:** All sections in a single column with generous padding (max-w-3xl centered).

### Modified: `src/App.tsx`

Add new route:
```tsx
<Route
  path="/dashboard/commandes/:orderId"
  element={
    <ProtectedRoute><DashboardGuard>
      <OrderDetail />
    </DashboardGuard></ProtectedRoute>
  }
/>
```

### Modified: `src/pages/Orders.tsx`

- Import `useNavigate` from `react-router-dom`
- Replace `setSelectedOrder(order)` calls with `navigate('/dashboard/commandes/' + order.id)`
- Remove `selectedOrder` state, `<OrderDetailPanel>` render at the bottom
- Keep everything else untouched (tabs, search, pagination, CSV, bulk WA, real-time, context menu)

### Keep Untouched

- `src/components/dashboard/OrderDetailPanel.tsx` — kept but no longer rendered from Orders.tsx. Can be removed later if desired, but not touched now.
- All hooks: `useOrders`, `useOrderTimeline`, `useUpdateOrderStatus`, `useUpdateSellerNote`, `useRepeatCustomers`
- All types in `src/types/shop.ts`
- Storefront, product system, auth — zero changes

---

## Component Details: `OrderDetail.tsx`

### Data Loading

```tsx
const { orderId } = useParams();
// fetch order from supabase by id (with shop_id guard matching user's shop)
// fetch timeline via useOrderTimeline(orderId)
// fetch repeat customer status via useRepeatCustomers(shopId)
// loading skeleton while fetching
// error state if order not found or not authorized
```

### Status Timeline (Stitch style)

- Steps: `EN_ATTENTE (1)` → `CONFIRMÉE (2)` → `PRÉPARATION (3)` → `LIVRAISON (4)` → `LIVRÉE (5)`
- Active step: orange filled circle + orange label + timestamp below
- Past steps: green with checkmark icon
- Future steps: gray numbered circle
- Connecting lines between dots
- If `cancelled`: show red alternative bar
- Each step is a `<button>` — clicking the **next valid step** triggers status update

### Primary CTA Button

Dynamically rendered based on `ORDER_TRANSITIONS[order.status]`:
- `pending` → "✓ Confirmer la commande" (orange fill)
- `confirmed` → "📦 Mettre en préparation" (orange fill)
- `preparing` → "🚚 Marquer en livraison" (orange fill)
- `shipping` → "✓ Marquer livrée" (orange fill)
- `delivered` / `archived` → no primary CTA
- Always show "Annuler" as secondary if allowed by transitions

### Notes System

Each note stored in `seller_note` via the `[ISO_DATE] text\n---\n` format already implemented. UI shows:
- Yellow card per note: text in quotes, "Par [shop name] · Date HH:mm"
- Input row at bottom with orange send icon

### Financial Card

- Sous-total: computed from items
- Livraison: `LIVRAISON` badge + fee (or "—" if unknown)
- Remise: `-0 CFA` (placeholder until discount system exists)
- **TOTAL À PAYER** in large bold
- Marge estimée (eye-off icon, seller-only): `+ XX,XXX CFA` in green

### Customer Card

- Large initials avatar (orange bg)
- Name + verified checkmark
- `CLIENT FIDÈLE` badge (green) or `NOUVEAU CLIENT` badge
- Stats grid: `Commandes: N` | `Dépensé: X.XM`
- Contact rows: Phone (with `>` arrow), Email, Address + notes in italic
- Google Maps embed placeholder + "Voir la carte" button if `location_url` exists

### History Section

- "Commande créée — Via Boutique en ligne — HH:mm"
- Each `order_status_logs` entry: "Statut mis à jour → [new status] — HH:mm"
- Each note event (if stored separately in future)
- "Voir tout l'historique" expander

---

## Implementation Order

1. Create `src/pages/OrderDetail.tsx` — full Stitch-style page
2. Modify `src/App.tsx` — add the `/dashboard/commandes/:orderId` route
3. Modify `src/pages/Orders.tsx` — replace panel with `navigate()` calls

---

## What is NOT Changed

- Storefront checkout, product management, auth — zero changes
- `useOrders`, `useOrderTimeline`, `useUpdateOrderStatus`, `useUpdateSellerNote` hooks — untouched
- `OrderStatusBadge`, `OrderContextMenu`, CSV export, bulk WhatsApp — untouched
- Pagination, search, real-time subscription — untouched
- `OrderDetailPanel.tsx` — not deleted (can coexist), just not rendered
