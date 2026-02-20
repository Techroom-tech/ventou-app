
# Dashboard Refactor — Intelligent Business Control Center

## Codebase Audit Summary

### Current State — Critical Problems:

| Issue | Impact |
|---|---|
| `RecentOrdersList` uses `mockOrders` — hardcoded fake data | Users see wrong data |
| `StatsCard` uses `mockStats` — hardcoded 257 000 / 4 orders | KPIs never change |
| `QuickActions` is a large dashed orange block — visually dominant | Feels decorative, not functional |
| `RevenueSparkline` — hardcoded to 7 days, no toggle | Missing 30/90 day views |
| Revenue chart uses `total_amount` column which **does not exist** (confirmed by network errors in the context) | Chart fails with 400 error |
| No smart alerts system | No actionable intelligence |
| No top products section | Missing conversion insight |
| No i18n in Dashboard KPI strings — some text is hardcoded in French | Breaks when user switches to English |

### What Already Works (Keep):
- `useShop` hook — correct, connected to real DB
- `useOrders` hook — correct, real paginated data
- `useOrderCounts` — correct, real status counts
- `useRevenueChart` — correct logic, BUT uses `total_amount` column. The DB uses `total` column (confirmed by the network error response). **Fix: remove `total_amount` from select, use only `total`**
- `OrderStatusBadge` — correct, i18n-ready
- `DashboardLayout`, `DashboardSidebar`, `DashboardHeader` — keep intact
- i18n system — works, `fallbackLng: 'fr'`, detects from localStorage. Language toggle already exists.

---

## Architecture of the New Dashboard

### New Hooks to Create:

**1. `src/hooks/useDashboardKPIs.ts`**
Fetches today's and yesterday's aggregated data from `orders` table:
```ts
// Today: SELECT count(*), sum(total) FROM orders WHERE shop_id=? AND date(created_at)=current_date
// Yesterday: same with date = current_date - 1
// Returns: { revenueToday, ordersToday, avgOrderValue, revenueYesterday, ordersYesterday }
// %change computed in hook: (today - yesterday) / yesterday * 100
```
Note: The `order_items` table is needed for "products sold today". But from the network responses, we can only confirm `orders` and `products` tables exist. We'll compute "products sold" by summing `items` array quantities from today's orders (items is a JSONB column in orders, confirmed by `items` in `useCreateOrder` insert payload).

**2. `src/hooks/useDashboardAlerts.ts`**  
Detects alerts from real data without requiring a new DB table:
- **Pending > 2h**: Query orders with `status='pending'` and `created_at < now() - 2 hours`
- **Out of stock**: Query products with `stock_quantity = 0` and `track_stock = true`

This avoids the migration requirement while being 100% functional. The `dashboard_alerts` table proposed in the spec is overkill for client-side detection — we compute alerts from existing data.

**3. `src/hooks/useTopProducts.ts`**
Fetches recent delivered/confirmed orders, extracts items array, groups by product_id, sums quantities and revenue. Returns top 3.

### Modified Hooks:

**`useRevenueChart.ts`** — Fix the `total_amount` bug:
```ts
// Replace:
.select('created_at, total, total_amount, status')
// With:
.select('created_at, total, status')
// And in the aggregation:
map[key].revenue += (row.total ?? 0);
```

---

## i18n Strategy

All new dashboard text must use `t()`. New translation keys needed in both `fr.json` and `en.json`:

```json
// dashboard section additions:
"dashboard": {
  "summary": {
    "todayRevenue": "Aujourd'hui votre boutique a généré {{amount}} grâce à {{count}} commande(s)",
    "noActivity": "Aucune activité aujourd'hui. Partagez votre boutique pour recevoir des commandes.",
    "vsYesterday": "vs. hier"
  },
  "kpis": {
    "revenueToday": "Revenus aujourd'hui",
    "ordersToday": "Commandes aujourd'hui",
    "productsSold": "Produits vendus",
    "avgOrder": "Panier moyen"
  },
  "alerts": {
    "title": "Alertes",
    "pendingOld": "{{count}} commande(s) en attente depuis plus de 2h",
    "outOfStock": "{{count}} produit(s) en rupture de stock",
    "viewOrders": "Voir les commandes",
    "viewProducts": "Gérer les stocks"
  },
  "actions": {
    "addProduct": "Ajouter un produit",
    "addProductSub": "Élargissez votre catalogue",
    "shareShop": "Partager la boutique",
    "shareSub": "Copier le lien",
    "viewAnalytics": "Voir les stats",
    "analyticsSub": "Revenus et tendances",
    "createPromo": "Créer une promo",
    "promoSub": "Codes de réduction"
  },
  "chart": {
    "title": "Revenus",
    "days7": "7 jours",
    "days30": "30 jours",
    "days90": "90 jours",
    "noData": "Aucune donnée pour cette période"
  },
  "topProducts": {
    "title": "Top produits",
    "units": "unités",
    "noData": "Données insuffisantes"
  }
}
```

English equivalents will be added to `en.json` accordingly.

---

## Files to Create / Modify

### 1. `src/hooks/useDashboardKPIs.ts` — NEW
```ts
// Queries orders for today and yesterday
// Computes:
// - revenueToday (sum of total where date = today, status != cancelled)
// - ordersToday (count where date = today)
// - productsSoldToday (sum of item quantities from today's orders items JSONB)
// - avgOrderValue (revenueToday / ordersToday or 0)
// - revenueChange, ordersChange (% vs yesterday)
// staleTime: 60_000
```

The `items` column is a JSONB array stored directly in the `orders` table (confirmed by `useCreateOrder` which inserts `items` as a JSON array). So to count products sold today, we fetch today's orders and sum `item.quantity` for each item in each order's `items` array.

### 2. `src/hooks/useDashboardAlerts.ts` — NEW
```ts
// Alert 1: Stale pending orders
const { data: stalePending } = supabase
  .from('orders')
  .select('id, order_number, customer_name, created_at')
  .eq('shop_id', shopId)
  .eq('status', 'pending')
  .lt('created_at', new Date(Date.now() - 2 * 3600000).toISOString());

// Alert 2: Out of stock products  
const { data: outOfStock } = supabase
  .from('products')
  .select('id, name')
  .eq('shop_id', shopId)
  .eq('track_stock', true)
  .eq('stock_quantity', 0)
  .eq('is_active', true);

// Returns: Alert[]
// interface Alert { type: 'pending_stale' | 'out_of_stock'; severity: 'warning' | 'critical'; count: number; actionUrl: string; }
```

### 3. `src/hooks/useTopProducts.ts` — NEW
```ts
// Fetch last 30 days orders (delivered/confirmed/shipping)
// Extract items array from each order (JSONB column)
// Group by product name (no product_id join needed — name is stored in items)
// Sum quantities and revenue
// Return top 3 sorted by revenue
// staleTime: 300_000 (5 min — doesn't need to be real-time)
```

### 4. Fix `src/hooks/useRevenueChart.ts`
Remove `total_amount` from the select — it doesn't exist in the DB. Use only `total`:
```ts
// Change line 22:
.select('created_at, total, status')
// Change line 44:
map[key].revenue += (row.total ?? 0);
```

### 5. `src/pages/Dashboard.tsx` — COMPLETE REWRITE
Replace the entire page with 7 sections:

**Section 1 — Smart Summary Banner**
- Compact banner (not a card — just a subtle `bg-muted/40 rounded-xl p-4` strip)
- Dynamic sentence using `t('dashboard.summary.todayRevenue', { amount, count })`
- If `ordersToday === 0` → show `t('dashboard.summary.noActivity')`
- Revenue change badge: `+12%` in green or `-8%` in red

**Section 2 — KPI Cards (4)**
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  <KpiCard title={t('dashboard.kpis.revenueToday')} value={formatCurrency(kpi.revenueToday, currency)} change={kpi.revenueChange} icon={DollarSign} />
  <KpiCard title={t('dashboard.kpis.ordersToday')} value={kpi.ordersToday} change={kpi.ordersChange} icon={ShoppingCart} />
  <KpiCard title={t('dashboard.kpis.productsSold')} value={kpi.productsSold} change={null} icon={Package} />
  <KpiCard title={t('dashboard.kpis.avgOrder')} value={formatCurrency(kpi.avgOrderValue, currency)} change={null} icon={TrendingUp} />
</div>
```

New `KpiCard` component — compact version of `StatsCard`:
- Compact: `p-4` max, `text-xl font-bold` value, `text-xs` label
- No large icon background — small inline icon on the right
- `grid-cols-2` mobile → `grid-cols-4` desktop

**Section 3 — Smart Alerts (conditional)**
```tsx
{alerts.length > 0 && (
  <div className="space-y-2">
    {alerts.map(alert => <AlertCard key={alert.type} alert={alert} />)}
  </div>
)}
```
`AlertCard`: `bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between` for warnings. Red variant for critical. Hidden completely when `alerts.length === 0`.

**Section 4 — Quick Actions**
Replace the large dashed orange block with a clean horizontal 4-button grid:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <QuickActionBtn icon={Plus} label={t('dashboard.actions.addProduct')} sub={t('dashboard.actions.addProductSub')} to="/dashboard/products/new" />
  <QuickActionBtn icon={Share2} label={t('dashboard.actions.shareShop')} sub={t('dashboard.actions.shareSub')} onClick={handleShare} />
  <QuickActionBtn icon={BarChart2} label={t('dashboard.actions.viewAnalytics')} sub={t('dashboard.actions.analyticsSub')} to="/dashboard/orders" />
  <QuickActionBtn icon={Tag} label={t('dashboard.actions.createPromo')} sub={t('dashboard.actions.promoSub')} to="/dashboard/parametres/codes-promo" />
</div>
```
`QuickActionBtn`: `Card` with `p-4 h-auto flex flex-col items-start gap-1.5 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer`. No dashed border, no accent bg, no orange.

**Section 5 — Revenue Chart (with toggle)**
```tsx
<Card className="p-4 sm:p-5">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold text-sm">{t('dashboard.chart.title')}</h3>
    <div className="flex gap-1">
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => setChartDays(d)} className={cn('text-xs px-2.5 py-1 rounded-md', chartDays === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
          {t(`dashboard.chart.days${d}`)}
        </button>
      ))}
    </div>
  </div>
  <div className="h-[220px] sm:h-[260px]">
    <ResponsiveContainer>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        ...
      </AreaChart>
    </ResponsiveContainer>
  </div>
</Card>
```

**Section 6 — Recent Orders (real data)**
Replace `mockOrders` with real `useOrders({ shopId, page: 0 })` limited to 5:
```tsx
const { data: ordersData } = useOrders({ shopId: shop?.id });
const recentOrders = (ordersData?.orders ?? []).slice(0, 5);
```
Row format: `customer_name | #order_number · time ago | amount | StatusBadge | payment_method`
"View all" button navigates to `/dashboard/orders`.

**Section 7 — Top Products (conditional)**
```tsx
{topProducts.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-semibold">{t('dashboard.topProducts.title')}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      {topProducts.map((p, i) => (
        <div key={p.name} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
          <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.units} {t('dashboard.topProducts.units')}</p>
          </div>
          <span className="text-sm font-semibold">{formatCurrency(p.revenue, currency)}</span>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

**Desktop Layout (2-column bottom):**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-2">
    <RecentOrdersSection />
  </div>
  <div>
    <TopProductsSection />
  </div>
</div>
```

### 6. i18n files — `src/i18n/locales/fr.json` and `src/i18n/locales/en.json`
Add new `dashboard` sub-keys for all new strings. The language toggle already works — `i18nextLng` is stored in localStorage, the LanguageDetector reads it on init, `useTranslation()` reactively updates when `i18n.changeLanguage()` is called. No changes to the i18n infrastructure are needed.

### 7. Deprecate `QuickActions.tsx` and `RecentOrdersList.tsx`
These components become inline sections in the new `Dashboard.tsx`. No need for separate files since they are dashboard-specific and the new logic is tightly coupled to the KPI hooks. The files can be kept but will no longer be imported from Dashboard.

---

## Component Structure

```text
src/pages/Dashboard.tsx (main)
  ├── SmartSummaryBanner    (inline component)
  ├── KpiCard               (inline component, replaces StatsCard)
  ├── AlertCard             (inline component)
  ├── QuickActionBtn        (inline component, replaces QuickActions)
  ├── RevenueChart          (inline component, replaces RevenueSparkline)
  ├── RecentOrdersSection   (inline, uses useOrders — replaces RecentOrdersList)
  └── TopProductsSection    (inline, uses useTopProducts)

New hooks:
  src/hooks/useDashboardKPIs.ts
  src/hooks/useDashboardAlerts.ts
  src/hooks/useTopProducts.ts

Fixed hook:
  src/hooks/useRevenueChart.ts  (remove total_amount)

Updated i18n:
  src/i18n/locales/fr.json  (add dashboard sub-keys)
  src/i18n/locales/en.json  (add dashboard sub-keys)
```

---

## No Database Migration Required

- All KPI data is computed from the existing `orders` table using `total` column (not `total_amount`)
- Alerts are detected from existing `orders` and `products` tables
- Top products are computed from the `items` JSONB column in `orders`
- The proposed `dashboard_alerts` DB table is not needed — client-side detection is sufficient and real-time via React Query

---

## What Is NOT Changed

- `DashboardLayout`, `DashboardSidebar`, `DashboardHeader`, `MobileBottomNav` — untouched
- `useShop`, `useOrders`, `useOrderCounts` hooks — untouched (except `useRevenueChart` fix)
- All other dashboard pages (Products, Orders, Settings) — untouched
- i18n infrastructure (`src/i18n/index.ts`) — untouched, already correct
- `OrderStatusBadge` — untouched, already i18n-ready
- Auth flow — untouched

---

## Summary of Files

| File | Action |
|---|---|
| `src/hooks/useDashboardKPIs.ts` | CREATE |
| `src/hooks/useDashboardAlerts.ts` | CREATE |
| `src/hooks/useTopProducts.ts` | CREATE |
| `src/hooks/useRevenueChart.ts` | FIX (remove `total_amount`) |
| `src/pages/Dashboard.tsx` | REWRITE |
| `src/i18n/locales/fr.json` | ADD keys |
| `src/i18n/locales/en.json` | ADD keys |
| `src/components/dashboard/RecentOrdersList.tsx` | KEEP (unused from Dashboard) |
| `src/components/dashboard/QuickActions.tsx` | KEEP (unused from Dashboard) |
| `src/components/dashboard/StatsCard.tsx` | KEEP (used elsewhere potentially) |
