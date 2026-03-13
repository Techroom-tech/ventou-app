

## Plan: Corrections marketplace et page produit

### Problemes identifies

1. **Couleurs CTA cassees** — Le `ProductPage` utilise `shop.button_color` et `shop.primary_color` directement en `style`. Quand un vendeur met une couleur orange sur fond blanc, le bouton "Ajouter au panier" (variant outline) a du texte orange illisible et une bordure invisible. Il faut utiliser des couleurs fixes et neutres pour les CTA, independamment de la personnalisation vendeur.

2. **X et Telegram dans ShareButtons** — A supprimer completement.

3. **Clic produit marketplace mene a la boutique** — Le `MarketplaceProductCard` linke vers `/boutique/:slug/p/:productSlug`, qui charge `ShopStorefront` complet (header boutique, etc.). Il faut creer une page produit marketplace standalone qui affiche le produit dans le layout marketplace sans naviguer vers la boutique.

4. **Performance lente** — Les requetes `useMarketplaceProducts` font 2 appels sequentiels (categories + RPC). La homepage fait 2 appels paralleles mais chacun attend la resolution du slug. Le hook doit etre optimise.

5. **Produits populaires/nouveautes pas directement visibles** — Deja affiches en homepage. Le probleme est qu'il n'y a pas de bouton filtre visible a cote de la barre de recherche dans le header marketplace.

### Corrections

| Fichier | Changement |
|---------|-----------|
| `src/components/storefront/ProductPage.tsx` | Remplacer les couleurs CTA vendor par des couleurs fixes et lisibles (primary/outline standard). Garder la personnalisation uniquement pour la boutique standalone, pas quand accede depuis marketplace |
| `src/components/storefront/ShareButtons.tsx` | Supprimer X et Telegram, garder Facebook et WhatsApp |
| `src/components/marketplace/MarketplaceProductCard.tsx` | Lier vers `/marketplace/product/:productId` au lieu de `/boutique/:slug/p/:productSlug` |
| `src/pages/marketplace/MarketplaceProductPage.tsx` | **Creer** — Page produit standalone dans le layout marketplace, reutilisant les composants existants (gallery, reviews, related) mais avec un design neutre |
| `src/App.tsx` | Ajouter route `/marketplace/product/:productId` dans le layout marketplace |
| `src/components/marketplace/MarketplaceLayout.tsx` | Ajouter un bouton "Filtres" a cote de la barre de recherche dans le header |
| `src/hooks/useMarketplaceProducts.ts` | Optimiser en evitant le double appel sequentiel quand pas de categorySlug |
| `src/pages/marketplace/MarketplaceHome.tsx` | Ajouter des liens filtres rapides (Populaires, Nouveautes, Promos) sous le hero |

### Details techniques

**Page produit marketplace** : Charge le produit par ID via Supabase, affiche dans le layout marketplace avec couleurs neutres (primary bleu Ventou, pas les couleurs vendeur). Inclut un lien "Voir la boutique" vers `/boutique/:slug`. Reutilise `ProductGallery`, `ProductReviews`, `TipTapRenderer`.

**Couleurs CTA fixes** : "Ajouter au panier" = outline avec bordure `border-primary` et texte `text-primary`. "Commander" = `bg-primary text-white`. Plus de `style={{ backgroundColor: ctaBg }}`.

**Filtre dans header** : Ajouter un bouton `SlidersHorizontal` a droite de la barre de recherche qui ouvre un Sheet avec les filtres, navigant vers `/marketplace/search` avec les params.

