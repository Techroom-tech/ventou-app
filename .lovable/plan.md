

# Navigation System Refactor

## Problems Found

1. **"Mon compte" navigates to `/dashboard`** instead of the profile page (DashboardHeader line 64)
2. **"Portefeuille" in mobile nav** points to `/dashboard/wallet` which has no route in App.tsx -- broken link
3. **Desktop and mobile nav configs are completely separate** -- desktop has 6 items (no wallet), mobile has 4 items (with wallet) -- inconsistent
4. **No "Plus" drawer on mobile** -- users cannot access Clients, Marketing, or Settings from mobile
5. **No centralized navigation config** -- nav items are hardcoded in each component separately

## Changes

### 1. Create centralized navigation config
**New file: `src/config/navigation.ts`**

Single source of truth for all navigation items, used by sidebar, mobile nav, and the "Plus" drawer:

```text
Primary items (shown everywhere):
  dashboard  -> /dashboard
  products   -> /dashboard/products
  orders     -> /dashboard/orders

Secondary items (sidebar + "Plus" drawer only):
  customers  -> /dashboard/customers
  marketing  -> /dashboard/marketing
  settings   -> /dashboard/parametres

Onboarding items (when no shop):
  dashboard  -> /dashboard
  createShop -> /dashboard/create-shop
```

Shared `isActive(path, currentPath)` helper function exported from same file.

### 2. Refactor DashboardSidebar
**Modified: `src/components/dashboard/DashboardSidebar.tsx`**

- Import nav items from `src/config/navigation.ts` instead of defining locally
- Use shared `isActive` helper
- Remove wallet, keep: Dashboard, Products, Orders, Customers, Marketing, Settings
- Add left accent bar on active item (2px left border)

### 3. Rebuild MobileBottomNav with "Plus" drawer
**Modified: `src/components/dashboard/MobileBottomNav.tsx`**

Bottom bar shows exactly 4 items:
- Dashboard
- Produits
- Commandes
- Plus (MoreHorizontal icon)

"Plus" opens a Drawer (vaul, already installed) containing:
- Clients
- Marketing
- Parametres
- Mon compte (links to `/dashboard/parametres/profil`)
- Deconnexion (calls signOut)

Each item has 44px min touch target. Clean vertical list with icons.

Remove the `Wallet` import and the `/dashboard/wallet` route entirely.

### 4. Fix "Mon compte" in DashboardHeader
**Modified: `src/components/dashboard/DashboardHeader.tsx`**

Change line 64:
```
navigate('/dashboard')  -->  navigate('/dashboard/parametres/profil')
```

This routes to the existing full profile/account management page (already built with personal info, security, 2FA, sessions, danger zone).

### 5. Update i18n keys
**Modified: `src/i18n/locales/fr.json` and `en.json`**

Add:
- `dashboard.nav.plus`: "Plus" / "More"
- `dashboard.nav.account`: "Mon compte" / "My account"

Remove: No keys deleted (wallet key kept for backward compat, just unused).

### 6. No new routes needed

The user spec mentions `/account` but the profile page already exists at `/dashboard/parametres/profil` with full account management (personal info, security, 2FA, sessions, danger zone). Creating a separate `/account` route would duplicate this. Instead, "Mon compte" everywhere will link to `/dashboard/parametres/profil`.

## Files Summary

| File | Action |
|---|---|
| `src/config/navigation.ts` | CREATE -- centralized nav config |
| `src/components/dashboard/DashboardSidebar.tsx` | MODIFY -- use centralized config, add left accent bar |
| `src/components/dashboard/MobileBottomNav.tsx` | REWRITE -- 4 items + Plus drawer |
| `src/components/dashboard/DashboardHeader.tsx` | MODIFY -- fix Mon compte route |
| `src/i18n/locales/fr.json` | ADD keys |
| `src/i18n/locales/en.json` | ADD keys |

## What is NOT changed

- `App.tsx` -- all routes already exist, no new routes needed
- `DashboardLayout.tsx` -- structure is correct
- `SettingsProfil.tsx` -- already the full account page
- All settings sub-pages -- untouched
- Auth flow -- untouched

