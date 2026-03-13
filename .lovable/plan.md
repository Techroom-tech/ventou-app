

## Plan: Amelioration marketplace Ventou

### Changements

**1. Bouton "Commander" sur chaque carte produit**
- Ajouter un bouton visible sous le prix avec icone `ShoppingCart` qui redirige vers `/marketplace/product/:id?from=marketplace`
- Remplacer le hover overlay "Voir le produit" par ce bouton permanent et visible
- Fichier: `MarketplaceProductCard.tsx`

**2. Navigation avec `?from=marketplace`**
- Tous les liens produit dans `MarketplaceProductCard` ajoutent `?from=marketplace`
- Dans `MarketplaceProductPage.tsx`, detecter `from=marketplace` et afficher un bouton retour qui utilise `navigate(-1)` pour conserver les filtres
- Fichiers: `MarketplaceProductCard.tsx`, `MarketplaceProductPage.tsx`

**3. Amelioration filtres sidebar**
- Les filtres tri (plus vendus, mieux notes, nouveautes, prix) sont deja dans le toolbar sort dropdown -- les deplacer aussi dans la sidebar comme "raccourcis de tri" pour une meilleure visibilite
- Ajouter bouton "Appliquer" en bas de la sidebar (desktop et mobile drawer)
- Le bouton "Reset filtres" existe deja -- le rendre plus visible (toujours affiche)
- Fichier: `MarketplaceSidebarFilters.tsx`

**4. Grille responsive**
- Modifier: `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4` (mobile = 2 colonnes au lieu de 1)
- Fichier: `MarketplaceHome.tsx`, `MarketplaceSearch.tsx`

**5. Toolbar sticky**
- Ajouter `sticky top-[64px] z-20 bg-background` au toolbar pour qu'il reste visible au scroll
- Fichier: `MarketplaceToolbar.tsx`

### Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `MarketplaceProductCard.tsx` | Bouton "Commander" visible, liens avec `?from=marketplace` |
| `MarketplaceSidebarFilters.tsx` | Raccourcis tri, boutons Reset/Appliquer toujours visibles |
| `MarketplaceToolbar.tsx` | Sticky toolbar |
| `MarketplaceHome.tsx` | Grille 2 cols mobile |
| `MarketplaceSearch.tsx` | Grille 2 cols mobile |
| `MarketplaceProductPage.tsx` | Bouton retour marketplace |

