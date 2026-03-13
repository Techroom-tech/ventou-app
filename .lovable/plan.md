

## Plan : Marketplace publique Ventou

Ce projet est massif et necessite une implementation en plusieurs phases. Voici le plan complet.

---

### Phase 1 — Base de donnees et infrastructure

**Nouvelles tables :**

| Table | Colonnes cles |
|-------|--------------|
| `marketplace_categories` | id, name, slug, icon, image_url, banner_url, banner_title, banner_link, position, is_active |
| `marketplace_banners` | id, image_url, title, description, button_text, button_link, starts_at, ends_at, priority, is_active |
| `sponsored_products` | id, product_id, shop_id, placement (homepage/category/search/native), budget, spent, starts_at, ends_at, is_active |

**Modifications existantes :**

| Table | Modification |
|-------|-------------|
| `products` | Ajouter `show_in_marketplace boolean DEFAULT true`, `marketplace_category_id uuid REFERENCES marketplace_categories(id)` |

RLS : les categories et banners sont lisibles publiquement, gerees par admin. Les sponsored_products sont gerables par le owner de la boutique et lisibles publiquement.

---

### Phase 2 — Pages marketplace (frontend)

**3 nouvelles pages :**

1. **`/marketplace`** — Homepage marketplace
   - Hero banner slider (Embla carousel, donnees depuis `marketplace_banners`)
   - Grille categories (depuis `marketplace_categories`)
   - Section "Produits populaires" (score = avis + ventes)
   - Section "Nouveautes" (tries par date)
   - Section "Top vendeurs" (boutiques avec le plus de ventes)
   - Barre de recherche globale avec auto-suggestions

2. **`/marketplace/:categorySlug`** — Listing par categorie
   - Banner categorie en haut
   - Grille produits filtrable
   - Sidebar filtres (desktop) / Drawer filtres (mobile)

3. **`/marketplace/search?q=...`** — Resultats recherche

**Composants partages :**
- `MarketplaceProductCard` — image, nom, prix, reduction, badge boutique, pays, note, badge "Sponsored"
- `MarketplaceFilters` — prix range, pays, categorie, promo, tri (populaire/nouveau/prix)
- `MarketplaceHero` — slider banners
- `MarketplaceCategoryGrid` — grille categories avec icones
- `MarketplaceSearch` — barre recherche avec debounce + suggestions

**Responsive :**
- Desktop : 4 colonnes, sidebar filtres
- Tablet : 2 colonnes, filtres collapsibles
- Mobile : 1 colonne, filtres drawer, hero swipe

---

### Phase 3 — Scoring et algorithme

Hook `useMarketplaceProducts` avec calcul de score :

```text
score = (orders_count * 3) + (avg_rating * 2) + (is_sponsored * 10) + (recency_bonus)
```

Tri cote serveur via une fonction RPC `get_marketplace_products` qui joint products, orders (count), reviews (avg), sponsored_products et retourne les produits pagines avec score.

---

### Phase 4 — Admin marketplace

Nouvelles pages admin :

| Route | Page |
|-------|------|
| `/admin/marketplace/categories` | CRUD categories marketplace |
| `/admin/marketplace/banners` | Gestion banners hero |
| `/admin/marketplace/sponsored` | Vue sponsored products |

---

### Phase 5 — Integration vendeur

- **AddProduct / EditProduct** : ajouter toggle "Publier dans la marketplace" + selecteur categorie marketplace
- **Page profil boutique** : `/shop/:slug` existe deja, ajouter badge "Verified Seller" si abonnement premium

---

### Fichiers crees/modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer 3 tables + modifier products |
| `src/pages/marketplace/MarketplaceHome.tsx` | Creer |
| `src/pages/marketplace/MarketplaceCategory.tsx` | Creer |
| `src/pages/marketplace/MarketplaceSearch.tsx` | Creer |
| `src/components/marketplace/MarketplaceProductCard.tsx` | Creer |
| `src/components/marketplace/MarketplaceFilters.tsx` | Creer |
| `src/components/marketplace/MarketplaceHero.tsx` | Creer |
| `src/components/marketplace/MarketplaceCategoryGrid.tsx` | Creer |
| `src/components/marketplace/MarketplaceSearch.tsx` | Creer |
| `src/components/marketplace/MarketplaceLayout.tsx` | Creer (header + footer shared) |
| `src/hooks/useMarketplaceProducts.ts` | Creer |
| `src/hooks/useMarketplaceCategories.ts` | Creer |
| `src/hooks/useMarketplaceBanners.ts` | Creer |
| `src/pages/admin/AdminMarketplaceCategories.tsx` | Creer |
| `src/pages/admin/AdminMarketplaceBanners.tsx` | Creer |
| `src/pages/AddProduct.tsx` | Modifier (toggle marketplace + categorie) |
| `src/pages/EditProduct.tsx` | Modifier (toggle marketplace + categorie) |
| `src/App.tsx` | Ajouter routes marketplace + admin |

### Implementation

Je propose d'implementer les **phases 1 et 2** maintenant (DB + pages marketplace fonctionnelles avec produits reels), puis les phases 3-5 dans des iterations suivantes.

