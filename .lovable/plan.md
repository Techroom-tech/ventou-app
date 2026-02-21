

# Super Admin System for Ventou — Implementation Plan

## Scope Assessment

This is the largest feature request in the project so far. It introduces an entirely separate admin application alongside the existing vendor dashboard, requiring new database tables, a role system, new routes, new layouts, and new pages.

### What exists today:
- Single vendor dashboard at `/dashboard/*`
- `ProtectedRoute` checks auth, `DashboardGuard` checks shop ownership
- No role system — no `user_roles` table, no admin concept
- `shops.owner_id` has a unique constraint (1 user = 1 shop)
- No subscription/plan tables
- No reports/moderation tables
- No admin audit logs

### What needs to be built:
- Role-based access control (user_roles table + RLS helper function)
- Admin route tree at `/admin/*` with its own layout
- 8 admin pages (Dashboard, Vendors, Stores, Products, Reports, Subscriptions, Users, Settings)
- Multi-store support (remove unique constraint on `shops.owner_id`, add plan limits)
- Subscription system (plans table, vendor_subscriptions table)
- Report/moderation system (reports table)
- Badge system (automated via DB triggers or client logic)
- Admin audit log table
- Admin guard component

---

## Phase 1: Database Foundation

### Migration: Role System (CRITICAL - follows security guidelines)

```sql
-- Role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'support', 'vendor');

-- Roles table (separate from profiles, as required)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience: check if user is any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'manager', 'support')
  )
$$;

-- RLS: users can read their own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: super_admins can manage all roles
CREATE POLICY "Super admins manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
```

### Migration: Subscription System

```sql
-- Plans reference table
CREATE TABLE public.subscription_plans (
  id text PRIMARY KEY, -- 'free', 'pro', 'business'
  name text NOT NULL,
  max_stores integer NOT NULL DEFAULT 1,
  max_products integer NOT NULL DEFAULT 50,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  requires_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Seed plans
INSERT INTO public.subscription_plans (id, name, max_stores, max_products, price_monthly, requires_approval) VALUES
  ('free', 'Gratuit', 1, 50, 0, false),
  ('pro', 'Pro', 3, 500, 9900, false),
  ('business', 'Business', 10, 5000, 29900, true);

-- Vendor subscriptions
CREATE TABLE public.vendor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id text REFERENCES public.subscription_plans(id) NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '7 days'),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;
```

### Migration: Multi-Store Support

```sql
-- Remove unique constraint on owner_id (allow multiple shops per vendor)
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_owner_id_key;

-- Add vendor-level fields
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason text;
```

### Migration: Reports / Moderation

```sql
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('product', 'store')),
  target_id uuid NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'ignored', 'actioned')),
  admin_note text,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (reporter_id, target_type, target_id) -- one report per user per target
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
```

### Migration: Admin Audit Log

```sql
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,
  target_type text, -- 'vendor', 'store', 'plan', 'settings'
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write logs
CREATE POLICY "Admins can read logs"
ON public.admin_audit_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert logs"
ON public.admin_audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
```

### RLS Policies for Admin Tables

```sql
-- vendor_subscriptions: vendors read own, admins read all
CREATE POLICY "Vendors read own subscription"
ON public.vendor_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage subscriptions"
ON public.vendor_subscriptions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- reports: admins can read/update all
CREATE POLICY "Admins manage reports"
ON public.reports FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- reports: authenticated users can insert (submit a report)
CREATE POLICY "Users can submit reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- shops: admins can read ALL shops (override existing owner-only policy)
CREATE POLICY "Admins can read all shops"
ON public.shops FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all shops"
ON public.shops FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- orders: admins can read all orders
CREATE POLICY "Admins can read all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- products: admins can read all products
CREATE POLICY "Admins can read all products"
ON public.products FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- profiles: admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
```

---

## Phase 2: Frontend Architecture

### New Files to Create

```
src/
  config/
    adminNavigation.ts          -- Admin sidebar nav config
  components/
    admin/
      AdminLayout.tsx           -- Sidebar + header + main area
      AdminSidebar.tsx          -- Fixed left sidebar (desktop)
      AdminHeader.tsx           -- Top bar with avatar/logout
      AdminGuard.tsx            -- Role check wrapper
      AdminMobileNav.tsx        -- Drawer sidebar for mobile
  hooks/
    useAdminRole.ts             -- Check current user's admin role
    useAdminStats.ts            -- Platform-wide KPIs
    useAdminVendors.ts          -- Vendor list + actions
    useAdminStores.ts           -- Store list + actions
    useAdminReports.ts          -- Reports/moderation
    useAdminSubscriptions.ts    -- Subscription management
    useAdminAuditLog.ts         -- Write audit entries
  pages/
    admin/
      AdminDashboard.tsx        -- Platform KPIs + charts
      AdminVendors.tsx          -- Vendor table with actions
      AdminVendorDetail.tsx     -- Single vendor profile
      AdminStores.tsx           -- All stores table
      AdminProducts.tsx         -- All products table
      AdminReports.tsx          -- Moderation center
      AdminSubscriptions.tsx    -- Plan management
      AdminUsers.tsx            -- User/role management
      AdminSettings.tsx         -- Platform settings
  types/
    admin.ts                    -- Admin-specific types
```

### AdminGuard Component

```tsx
// Checks user has admin role via useAdminRole hook
// Uses has_role() server-side function via Supabase RPC
// Redirects non-admins to /dashboard
// Shows loading spinner while checking
// Supports role-level: super_admin sees everything,
//   manager sees everything except Settings,
//   support sees read-only + reports
```

### Admin Navigation Config (`src/config/adminNavigation.ts`)

```ts
export const adminNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/admin' },
  { key: 'vendors',   icon: Users,           path: '/admin/vendors' },
  { key: 'stores',    icon: Store,           path: '/admin/stores' },
  { key: 'products',  icon: Package,         path: '/admin/products' },
  { key: 'reports',   icon: Flag,            path: '/admin/reports' },
  { key: 'subscriptions', icon: CreditCard,  path: '/admin/subscriptions' },
  { key: 'users',     icon: Shield,          path: '/admin/users' },
  { key: 'settings',  icon: Settings,        path: '/admin/settings',
    roles: ['super_admin'] }, // Only super_admin
];
```

### Route Registration in App.tsx

Add lazy-loaded admin routes wrapped in `ProtectedRoute` + `AdminGuard`:

```tsx
<Route path="/admin" element={<ProtectedRoute><AdminGuard><AdminDashboard /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/vendors" element={<ProtectedRoute><AdminGuard><AdminVendors /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/vendors/:id" element={<ProtectedRoute><AdminGuard><AdminVendorDetail /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/stores" element={<ProtectedRoute><AdminGuard><AdminStores /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/products" element={<ProtectedRoute><AdminGuard><AdminProducts /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/reports" element={<ProtectedRoute><AdminGuard><AdminReports /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/subscriptions" element={<ProtectedRoute><AdminGuard><AdminSubscriptions /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/users" element={<ProtectedRoute><AdminGuard><AdminUsers /></AdminGuard></ProtectedRoute>} />
<Route path="/admin/settings" element={<ProtectedRoute><AdminGuard role="super_admin"><AdminSettings /></AdminGuard></ProtectedRoute>} />
```

---

## Phase 3: Admin Pages (Key Details)

### Admin Dashboard
- 7 stat cards: Total Vendors, Active Subscriptions, Stores, Products, Pending Reports, Subscription Revenue, Expiring Soon
- Revenue chart (subscription-based, not per-order)
- Subscription growth chart (new subs over time)
- Top vendors by order count
- All data from real Supabase queries with `is_admin()` RLS

### Vendor Management Page
- Searchable/filterable table: email, plan, trial status, stores count, products count, orders count, report count (last 6 months), risk score
- Risk score = `report_count_6m >= 20 ? 'high' : report_count_6m >= 5 ? 'medium' : 'low'`
- Actions per vendor: Suspend, Reactivate, Change Plan, Reset Trial, View Stores, View Reports
- All actions write to `admin_audit_logs`

### Store Management Page
- Table of all stores across all vendors
- Columns: name, vendor email, status, product count, order count, report count
- Actions: Suspend store, Reactivate store, View products
- Suspension sets `shops.is_suspended = true`

### Reports / Moderation Center
- Table with filters: status (pending/reviewed/ignored/actioned), type (product/store)
- Each row: type, target name, reporter, date, reason
- Detail panel: full report history, admin actions (Ignore, Warn, Suspend Store, Disable Vendor)
- Rolling 6-month window filter on queries
- Automation thresholds displayed as badges:
  - 5+ reports: "Warning threshold"
  - 20+ reports: "Auto-suspend threshold"
  - 100+ reports: "Account disable threshold"

### Subscription Management
- View all vendor subscriptions
- Filter by plan, status (trial/active/expired)
- Actions: Change plan, Reset trial, Cancel
- Display: expiring within 7 days highlighted
- Plan downgrade logic (when implemented via edge function):
  - Excess stores set to `is_active = false`
  - Excess products set to `status = 'hidden'`

### Admin Settings
- Organized in sections matching the spec: General, Branding, Subscriptions, Notifications, Security, Legal, Maintenance
- Maintenance mode: toggle stored in a `platform_settings` table (key-value)
- Only `super_admin` role can access

---

## Phase 4: Multi-Store Vendor Changes

### Impact on existing vendor code:
1. `useShop` currently returns a single shop — must be updated to support multiple shops
2. `DashboardGuard` assumes 1 shop — needs a "shop selector" concept
3. `CreateShop` currently blocks if shop exists — must check plan limit instead

### Changes:
- **`useShop`**: Returns all shops for the vendor, plus a `selectedShop` (stored in localStorage or URL param)
- **`DashboardGuard`**: If vendor has 0 shops -> onboarding. If 1+ shops -> load selected shop
- **`CreateShop`**: Check `vendor_subscriptions.plan.max_stores` vs current store count. Disable button if limit reached
- Add a **shop switcher** dropdown in `DashboardHeader` (only shown if vendor has 2+ stores)

---

## Phase 5: Badge System

### Logic (computed, not stored):
- **Verified Vendor**: `user.email_confirmed_at IS NOT NULL` OR auth provider is Google
- **Top Vendor**: `SELECT COUNT(*) FROM orders WHERE shop_id IN (vendor shops) AND status = 'delivered'` >= 100

Badges displayed on vendor profile, store pages, and admin vendor detail. Computed client-side from real data.

---

## i18n Keys

New namespace `admin` added to both `fr.json` and `en.json`:

```json
"admin": {
  "nav": {
    "dashboard": "Tableau de bord",
    "vendors": "Vendeurs",
    "stores": "Boutiques",
    "products": "Produits",
    "reports": "Signalements",
    "subscriptions": "Abonnements",
    "users": "Utilisateurs",
    "settings": "Paramètres"
  },
  "stats": { ... },
  "vendors": { ... },
  "reports": { ... },
  "subscriptions": { ... }
}
```

---

## Files Summary

| File | Action |
|---|---|
| `supabase/functions/db-migrate/index.ts` | ADD migrations (roles, subscriptions, reports, audit logs, multi-store, RLS) |
| `src/config/adminNavigation.ts` | CREATE |
| `src/types/admin.ts` | CREATE |
| `src/hooks/useAdminRole.ts` | CREATE |
| `src/hooks/useAdminStats.ts` | CREATE |
| `src/hooks/useAdminVendors.ts` | CREATE |
| `src/hooks/useAdminStores.ts` | CREATE |
| `src/hooks/useAdminReports.ts` | CREATE |
| `src/hooks/useAdminSubscriptions.ts` | CREATE |
| `src/hooks/useAdminAuditLog.ts` | CREATE |
| `src/components/admin/AdminLayout.tsx` | CREATE |
| `src/components/admin/AdminSidebar.tsx` | CREATE |
| `src/components/admin/AdminHeader.tsx` | CREATE |
| `src/components/admin/AdminGuard.tsx` | CREATE |
| `src/components/admin/AdminMobileNav.tsx` | CREATE |
| `src/pages/admin/AdminDashboard.tsx` | CREATE |
| `src/pages/admin/AdminVendors.tsx` | CREATE |
| `src/pages/admin/AdminVendorDetail.tsx` | CREATE |
| `src/pages/admin/AdminStores.tsx` | CREATE |
| `src/pages/admin/AdminProducts.tsx` | CREATE |
| `src/pages/admin/AdminReports.tsx` | CREATE |
| `src/pages/admin/AdminSubscriptions.tsx` | CREATE |
| `src/pages/admin/AdminUsers.tsx` | CREATE |
| `src/pages/admin/AdminSettings.tsx` | CREATE |
| `src/App.tsx` | ADD admin routes |
| `src/hooks/useShop.ts` | MODIFY for multi-store |
| `src/components/DashboardGuard.tsx` | MODIFY for multi-store |
| `src/components/dashboard/DashboardHeader.tsx` | ADD shop switcher |
| `src/pages/CreateShop.tsx` | MODIFY plan limit check |
| `src/types/shop.ts` | ADD is_suspended, suspended_reason |
| `src/i18n/locales/fr.json` | ADD admin keys |
| `src/i18n/locales/en.json` | ADD admin keys |

## What is NOT changed
- Existing vendor dashboard pages (Dashboard, Products, Orders, Settings) — untouched except multi-store selector
- Auth flow — untouched (role check is additive)
- Storefront — untouched
- Landing page — untouched
- No wallet logic, no commission logic, no Stripe references

## Security Guarantees
- Roles stored in separate `user_roles` table (never in profiles)
- `has_role()` is SECURITY DEFINER — no RLS recursion
- Admin RLS policies use `is_admin()` function — server-validated
- No client-side role checks for data access — all enforced via RLS
- Audit log captures all admin actions
- AdminGuard validates role before rendering any admin page

## Important Note
To bootstrap the first super_admin, you will need to run this SQL manually in your Supabase SQL editor after creating the tables:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_UUID_HERE', 'super_admin');
```

This is a one-time setup step. After that, the super_admin can manage other roles from the Admin Users page.

