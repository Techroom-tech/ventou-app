

# Plan: Mode traitement rapide + Simplification statuts + Suppression commandes annulées

## Changements

### 1. Simplifier les statuts (`src/types/shop.ts`)
- Supprimer `preparing`, `shipping`, `archived` du type `OrderStatus`
- Nouveau type : `'pending' | 'confirmed' | 'delivered' | 'cancelled'`
- Nouvelles transitions :
  - `pending → confirmed | cancelled`
  - `confirmed → delivered | cancelled`
  - `delivered → []` (terminal)
  - `cancelled → []` (terminal)

### 2. Supprimer les styles inutiles (`src/components/dashboard/OrderStatusBadge.tsx`)
- Retirer `preparing`, `shipping`, `archived` du mapping `statusStyles`

### 3. Mode traitement rapide (`src/pages/Orders.tsx`)
- Ajouter un state `quickMode` (boolean)
- Bouton "Mode rapide" dans le header
- Quand activé : filtre automatiquement sur `status = 'pending'`, masque la recherche/les pills, affiche uniquement une liste simplifiée avec nom + montant + **gros bouton vert "Confirmer"** par ligne
- Retirer `preparing`, `shipping` des STATUS_TABS → garder `['all', 'pending', 'confirmed', 'delivered', 'cancelled']`
- Retirer les actions inline `canShip` (shipping)
- Ajouter un bouton "Supprimer" (icône Trash) pour les commandes au statut `cancelled`
- Supprimer l'action batch "archived"

### 4. Ajouter la suppression de commandes annulées (`src/hooks/useOrders.ts`)
- Nouveau hook `useDeleteOrders` : mutation `DELETE FROM orders WHERE id = X AND shop_id = Y AND status = 'cancelled'`
- Nécessite une **migration DB** pour ajouter une policy RLS `DELETE` sur la table `orders` restreinte au owner + status cancelled

### 5. Migration Supabase
```sql
CREATE POLICY "owner_delete_cancelled_orders" ON public.orders
FOR DELETE TO authenticated
USING (
  status = 'cancelled'
  AND shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
);
```

### 6. Page détail (`src/pages/OrderDetail.tsx`)
- Supprimer `preparing`, `shipping`, `archived` de `STATUS_LABELS` et `CTA_MAP`
- CTA simplifié : `pending → confirmed`, `confirmed → delivered`
- Ajouter bouton "Supprimer" si `status === 'cancelled'`

### 7. i18n
- Ajouter clés `orders.quickMode`, `orders.delete`, `orders.deleteConfirm` dans `fr.json` et `en.json`

## Fichiers impactés
| Fichier | Action |
|---|---|
| `src/types/shop.ts` | Simplifier OrderStatus + transitions |
| `src/components/dashboard/OrderStatusBadge.tsx` | Retirer statuts supprimés |
| `src/pages/Orders.tsx` | Mode rapide + suppression + nettoyage statuts |
| `src/pages/OrderDetail.tsx` | Nettoyage statuts + bouton supprimer |
| `src/hooks/useOrders.ts` | Nouveau hook useDeleteOrders |
| `src/i18n/locales/fr.json` | Nouvelles clés |
| `src/i18n/locales/en.json` | Nouvelles clés |
| Migration SQL | Policy DELETE pour commandes annulées |

