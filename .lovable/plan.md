

## Plan: Rendre tous les tris fonctionnels avec de vrais filtres

### Probleme actuel
- `best_selling` et `popular` sont convertis en `score` dans le hook -- ils ne trient pas reellement par ventes
- `rating` trie par note mais n'exclut pas les produits sans avis
- Aucun filtre strict n'est applique

### Solution

**1. Migration SQL -- Mettre a jour le RPC `get_marketplace_products`**

Ajouter 2 nouveaux parametres au RPC:
- `_min_rating numeric DEFAULT NULL` -- pour filtrer les produits avec note >= 4
- `_min_orders bigint DEFAULT NULL` -- pour filtrer les produits avec ventes > 0

Ajouter `best_selling` dans le ORDER BY (`ps.order_count DESC`).

Ajouter les conditions WHERE:
- `(_min_rating IS NULL OR avg_rating >= _min_rating)`
- `(_min_orders IS NULL OR order_count >= _min_orders)`

**2. Hook `useInfiniteMarketplaceProducts.ts`**

- Supprimer le remapping `best_selling -> score`
- Quand `sort === "rating"`: passer `_min_rating: 4`
- Quand `sort === "best_selling"` ou `sort === "popular"`: passer `_min_orders: 1`
- Passer `best_selling` directement au RPC

**3. Supprimer `popular` du toolbar**

`popular` et `best_selling` font la meme chose. Garder uniquement `best_selling` ("Plus vendus") pour eviter la confusion.

### Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| Migration SQL | Ajouter `_min_rating`, `_min_orders` params + `best_selling` sort |
| `useInfiniteMarketplaceProducts.ts` | Passer les vrais params, supprimer remapping |
| `MarketplaceToolbar.tsx` | Supprimer doublon "Populaires" |

