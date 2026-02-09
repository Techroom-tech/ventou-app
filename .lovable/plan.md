

# Implementation du Dashboard Vendeur VENTOU

## Vue d'ensemble

Refonte complete du dashboard vendeur en suivant fidelement les mockups desktop et mobile fournis. Implementation d'une interface SaaS premium avec donnees en temps reel, optimisee pour les vendeurs e-commerce en Afrique de l'Ouest.

---

## Architecture du Dashboard

```text
DESKTOP (>= 1024px)                    TABLET (768-1023px)                MOBILE (< 768px)
+----------+--------------------+      +--------------------+              +------------------+
| Sidebar  |     Header         |      |      Header        |              |     Header       |
| (fixe)   | Avatar+Bell+Shop   |      | Avatar+Bell+Shop   |              | Avatar+Bell      |
|          +--------------------+      +--------------------+              +------------------+
|          |     Overview       |      |     Overview       |              |    Overview      |
| Dashboard|  [KPI] [KPI]       |      |  [KPI] [KPI]       |              | [Total Sales]    |
| Products |                    |      +--------------------+              | [Orders Today]   |
| Orders   | [Add Product CTA]  |      | [Add Product CTA]  |              +------------------+
| Customers| [Share] [Withdraw] |      | [Share] [Withdraw] |              | [Add Product]    |
| Marketing+--------------------+      +--------------------+              +------------------+
| Settings | Recent Orders      |      | Recent Orders      |              | [Share][Withdraw]|
|          | - Order 1          |      | - Order 1          |              +------------------+
|          | - Order 2          |      | - Order 2          |              | Recent Orders    |
|          | - Order 3          |      +--------------------+              +------------------+
+----------+--------------------+                                          | Bottom Nav       |
                                                                           +------------------+
```

---

## Schema de Base de Donnees (Migrations Supabase)

### Tables a creer

#### 1. `shops` - Boutiques vendeur
```sql
- id (uuid, PK)
- owner_id (uuid, FK -> profiles.id)
- name (text) - "Kofi's Electronics"
- slug (text, unique) - "kofis-electronics"
- description (text)
- logo_url (text)
- currency (text) - "GHS" ou "XOF"
- is_verified (boolean)
- created_at, updated_at
```

#### 2. `products` - Produits
```sql
- id (uuid, PK)
- shop_id (uuid, FK -> shops.id)
- name (text) - "Samsung Galaxy A12"
- description (text)
- price (numeric)
- stock_quantity (integer)
- image_url (text)
- is_active (boolean)
- created_at, updated_at
```

#### 3. `orders` - Commandes
```sql
- id (uuid, PK)
- shop_id (uuid, FK -> shops.id)
- order_number (text) - "#ORD-1024"
- customer_name (text)
- customer_phone (text)
- total_amount (numeric)
- status (text) - "PAID", "PENDING", "CANCELLED"
- payment_method (text) - "MoMo", "Wave", "Orange"
- created_at, updated_at
```

#### 4. `order_items` - Articles de commande
```sql
- id (uuid, PK)
- order_id (uuid, FK -> orders.id)
- product_id (uuid, FK -> products.id)
- quantity (integer)
- unit_price (numeric)
```

#### 5. `notifications` - Notifications vendeur
```sql
- id (uuid, PK)
- shop_id (uuid, FK -> shops.id)
- type (text) - "new_order", "payment_confirmed", "security_alert"
- title (text)
- message (text)
- is_read (boolean)
- created_at
```

#### 6. `wallets` - Portefeuilles vendeur
```sql
- id (uuid, PK)
- shop_id (uuid, FK -> shops.id)
- balance (numeric)
- currency (text)
- updated_at
```

---

## Fichiers a Creer

### 1. Types et interfaces
**`src/types/shop.ts`**
- Interfaces TypeScript pour Shop, Product, Order, Notification, Wallet

### 2. Hooks personnalises
**`src/hooks/useShop.ts`**
- Recuperation de la boutique de l'utilisateur connecte

**`src/hooks/useDashboardStats.ts`**
- Total des ventes (somme des commandes PAID)
- Nombre de commandes du jour
- Variation en pourcentage

**`src/hooks/useRecentOrders.ts`**
- Liste des dernieres commandes avec subscription temps reel

**`src/hooks/useNotifications.ts`**
- Notifications avec compteur non-lues et realtime updates

### 3. Composants Dashboard

**`src/components/dashboard/DashboardLayout.tsx`**
- Layout principal avec sidebar desktop / bottom nav mobile

**`src/components/dashboard/DashboardSidebar.tsx`**
- Sidebar bleu profond avec navigation
- Logo Ventou en haut
- Menu: Dashboard, Products, Orders, Customers, Marketing, Settings
- Badge "Verified" en bas

**`src/components/dashboard/DashboardHeader.tsx`**
- Header avec:
  - Message de bienvenue + nom boutique
  - Cloche notifications avec badge rouge
  - Avatar utilisateur

**`src/components/dashboard/MobileBottomNav.tsx`**
- Navigation mobile: Home, Products, Orders, Wallet

**`src/components/dashboard/StatsCard.tsx`**
- Carte KPI reusable (icone, titre, valeur, variation)

**`src/components/dashboard/QuickActions.tsx`**
- CTA "Add New Product" (orange)
- Boutons "Share Shop" et "Withdraw"

**`src/components/dashboard/RecentOrdersList.tsx`**
- Liste des commandes avec realtime
- Image produit, nom, ID, temps relatif, montant, statut, methode

**`src/components/dashboard/NotificationsPopover.tsx`**
- Popover avec liste des notifications

### 4. Page Dashboard refactorisee
**`src/pages/Dashboard.tsx`**
- Integration de tous les composants
- Gestion des etats de chargement
- Empty states UX friendly

---

## Fichiers a Modifier

### 1. `src/App.tsx`
- Ajouter routes pour les sous-pages dashboard:
  - `/dashboard` (overview)
  - `/dashboard/products`
  - `/dashboard/orders`
  - `/dashboard/wallet`

### 2. `src/integrations/supabase/client.ts`
- Ajouter les types pour les nouvelles tables

### 3. `src/i18n/locales/fr.json` et `en.json`
- Ajouter namespace `dashboard` avec toutes les traductions

---

## Design System (Respect strict)

### Couleurs utilisees
| Element | Couleur | Variable CSS |
|---------|---------|--------------|
| Sidebar | Bleu profond | `--ventou-blue` (#1E3A5F) |
| CTA principal | Orange | `--ventou-orange` (#FF6B35) |
| Fond page | Gris tres clair | `--background` |
| Cartes | Blanc | `--card` |
| Statut PAID | Vert | `--ventou-success` |
| Statut PENDING | Orange | `--ventou-warning` |

### Cartes
- Border-radius: `rounded-xl` (12px)
- Ombres: `shadow-sm` par defaut, `shadow-md` au hover
- Padding: `p-4` a `p-6`

### Typographie
- Font: Inter (deja configure)
- Titres: `font-bold text-foreground`
- Sous-titres: `text-muted-foreground`

---

## Realtime Updates (Supabase Channels)

### Subscriptions a implementer

```typescript
// Nouvelles commandes
supabase.channel('orders')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'orders',
    filter: `shop_id=eq.${shopId}`
  }, handleNewOrder)
  .subscribe()

// Notifications
supabase.channel('notifications')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'notifications',
    filter: `shop_id=eq.${shopId}`
  }, handleNewNotification)
  .subscribe()
```

---

## Etats UI

### Loading States
- Skeleton pour les cartes KPI
- Skeleton pour la liste des commandes
- Spinner dans le header pendant le chargement initial

### Empty States
- "Aucune commande aujourd'hui" avec illustration
- "Ajoutez votre premier produit" avec CTA

### Error States
- Message d'erreur avec bouton "Reessayer"
- Toast pour les erreurs reseau

---

## Responsive Breakpoints

| Breakpoint | Comportement |
|------------|--------------|
| < 768px (mobile) | Bottom nav, cartes empilees, header compact |
| 768-1023px (tablet) | Header complet, pas de sidebar, grille 2 colonnes |
| >= 1024px (desktop) | Sidebar fixe + contenu principal |

---

## Securite & Permissions

### RLS Policies
- `shops`: SELECT/UPDATE uniquement pour owner_id = auth.uid()
- `orders`: SELECT uniquement pour shop.owner_id = auth.uid()
- `products`: CRUD pour shop.owner_id = auth.uid()
- `notifications`: SELECT/UPDATE pour shop.owner_id = auth.uid()
- `wallets`: SELECT uniquement pour shop.owner_id = auth.uid()

---

## Resume des Fichiers

### A Creer (15 fichiers)
| Fichier | Description |
|---------|-------------|
| `src/types/shop.ts` | Types TypeScript |
| `src/hooks/useShop.ts` | Hook boutique |
| `src/hooks/useDashboardStats.ts` | Hook statistiques |
| `src/hooks/useRecentOrders.ts` | Hook commandes realtime |
| `src/hooks/useNotifications.ts` | Hook notifications realtime |
| `src/components/dashboard/DashboardLayout.tsx` | Layout principal |
| `src/components/dashboard/DashboardSidebar.tsx` | Sidebar navigation |
| `src/components/dashboard/DashboardHeader.tsx` | Header avec avatar/notifications |
| `src/components/dashboard/MobileBottomNav.tsx` | Navigation mobile |
| `src/components/dashboard/StatsCard.tsx` | Carte KPI |
| `src/components/dashboard/QuickActions.tsx` | Actions rapides |
| `src/components/dashboard/RecentOrdersList.tsx` | Liste commandes |
| `src/components/dashboard/NotificationsPopover.tsx` | Popover notifications |
| `src/components/dashboard/OrderStatusBadge.tsx` | Badge statut commande |
| `src/components/dashboard/EmptyState.tsx` | Composant empty state |

### A Modifier (4 fichiers)
| Fichier | Modification |
|---------|-------------|
| `src/pages/Dashboard.tsx` | Refonte complete |
| `src/integrations/supabase/client.ts` | Ajout types DB |
| `src/i18n/locales/fr.json` | Traductions dashboard |
| `src/i18n/locales/en.json` | Traductions dashboard |

### Migrations Supabase (6 tables)
- `shops`
- `products`
- `orders`
- `order_items`
- `notifications`
- `wallets`

---

## Traductions (Namespace dashboard)

```text
dashboard:
  welcome: "Welcome back,"
  overview: "Overview"
  overviewSubtitle: "Here's what's happening in your shop today."
  stats:
    totalSales: "Total Sales"
    ordersToday: "Orders Today"
  actions:
    addProduct: "Add New Product"
    addProductSubtitle: "Expand your catalog instantly"
    shareShop: "Share Shop"
    shareShopSubtitle: "Get link"
    withdraw: "Withdraw"
    withdrawSubtitle: "Via MoMo"
  orders:
    recent: "Recent Orders"
    viewAll: "View All"
    noOrders: "No orders yet"
    ago: "ago"
  status:
    paid: "PAID"
    pending: "PENDING"
    cancelled: "CANCELLED"
  nav:
    dashboard: "Dashboard"
    products: "Products"
    orders: "Orders"
    customers: "Customers"
    marketing: "Marketing"
    settings: "Settings"
    wallet: "Wallet"
  notifications:
    title: "Notifications"
    empty: "No new notifications"
    newOrder: "New order received"
    paymentConfirmed: "Payment confirmed"
  account:
    verified: "Verified"
```

