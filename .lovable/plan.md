

## Plan : Corrections notifications, temps réel et lien email

### Problemes identifies

1. **Pas de mise a jour temps reel sur le Dashboard** : La page Dashboard utilise `useOrders` sans abonnement Realtime. Les nouvelles commandes n'apparaissent qu'apres rafraichissement.
2. **Badge notifications ne se reinitialise pas au clic** : Le compteur "non lu" se base sur les commandes des dernieres 24h, sans tracking de "derniere consultation".
3. **Lien email "Voir la commande" incorrect** : Le `dashboard_url` dans `notify-order` pointe vers `https://{slug}.ventou.shop/dashboard/orders` (le sous-domaine storefront) au lieu du dashboard vendeur avec l'ID de commande.

### Corrections

#### 1. Temps reel global (useOrders + Dashboard)

Ajouter un abonnement Realtime dans `useOrders.ts` qui invalide automatiquement les queries quand une commande est inseree ou modifiee. Cela couvrira toutes les pages (Dashboard, Orders, etc.) sans duplication.

- Creer un hook `useOrdersRealtime(shopId)` dans `useOrders.ts` qui s'abonne aux `postgres_changes` (INSERT/UPDATE) sur la table `orders` filtree par `shop_id` et invalide les query keys `orders`, `order-counts`, `orders-today`, `notifications-orders`.
- Appeler ce hook dans `DashboardShell.tsx` (layout persistant) pour qu'il soit actif sur toutes les pages dashboard.
- Supprimer l'abonnement duplique dans `Orders.tsx` (lignes 174-193).

#### 2. Notification read state

Modifier `NotificationsPopover.tsx` :
- Stocker un timestamp `lastSeenNotifications` dans `localStorage` (par shop).
- Au clic sur le popover (ouverture), mettre a jour ce timestamp.
- Le compteur "non lu" = commandes creees apres `lastSeen`.
- Le badge se reinitialise immediatement a l'ouverture du popover.
- Utiliser aussi le Realtime pour rafraichir les notifications instantanement.

#### 3. Lien email corrige

Modifier `supabase/functions/notify-order/index.ts` ligne 88 :
- Changer `dashboard_url` de `https://${shop.slug}.ventou.shop/dashboard/orders` vers `https://ventou.shop/dashboard/commandes/${order.id}`
- Cela pointe vers la page de detail de la commande exacte sur le domaine principal.

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/hooks/useOrders.ts` | Ajouter hook `useOrdersRealtime` |
| `src/components/dashboard/DashboardShell.tsx` | Appeler `useOrdersRealtime` |
| `src/pages/Orders.tsx` | Supprimer abonnement Realtime duplique |
| `src/components/dashboard/NotificationsPopover.tsx` | localStorage read state + Realtime |
| `supabase/functions/notify-order/index.ts` | Corriger `dashboard_url` |

