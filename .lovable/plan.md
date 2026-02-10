
# Implementation des 4 phases : Panier WhatsApp, Detail produit, Dark mode, Promotions

## Phase 1 : Panier WhatsApp

### Nouveaux fichiers

**`src/components/storefront/CartContext.tsx`**
- Context React avec `CartProvider` gerant un state local (pas de persistence)
- Actions : `addToCart(product, qty)`, `removeFromCart(productId)`, `updateQuantity(productId, qty)`, `clearCart()`, `cartCount`, `cartTotal`
- Chaque item stocke : `product` (Product complet), `quantity`

**`src/components/storefront/CartDrawer.tsx`**
- Drawer (vaul) s'ouvrant depuis le bas sur mobile, sheet laterale sur desktop
- Liste des articles avec image miniature, nom, prix, selecteur de quantite (+/-)
- Sous-total affiche avec `formatCurrency`
- Bouton "Commander via WhatsApp" qui genere un message structure :
  ```
  Bonjour ! Je souhaite commander :
  - 2x T-shirt bleu (5 000 FCFA)
  - 1x Sac cuir (15 000 FCFA)
  Total : 25 000 FCFA
  ```
- Bouton "Vider le panier"

**`src/components/storefront/CartButton.tsx`**
- Bouton flottant (fixed bottom-right) avec icone panier + badge rouge du nombre d'articles
- Ouvre le CartDrawer au clic
- Anime quand un produit est ajoute (petit bounce)

### Modifications

**`src/pages/ShopStorefront.tsx`**
- Wrapper avec `CartProvider`
- Ajouter bouton "Ajouter au panier" sur chaque carte produit
- Inclure `CartButton` en bas de page

## Phase 2 : Detail produit

### Nouveau fichier

**`src/components/storefront/ProductDetailSheet.tsx`**
- Sheet/Drawer responsive (drawer en bas sur mobile, dialog sur desktop)
- Recoit un `Product` et le `Shop` en props
- Affiche : image grande, nom, description complete, prix (avec promo si applicable)
- Selecteur de quantite
- Bouton "Ajouter au panier" et bouton "Acheter maintenant" (WhatsApp direct)

### Modifications

**`src/pages/ShopStorefront.tsx`**
- Clic sur une carte produit ouvre `ProductDetailSheet` au lieu de ne rien faire
- State `selectedProduct` pour gerer l'ouverture

## Phase 3 : Dark mode

### Nouveau fichier

**`src/components/ThemeToggle.tsx`**
- Bouton Sun/Moon qui bascule entre light/dark via `next-themes`
- Compact : juste une icone dans un bouton ghost

### Modifications

**`src/App.tsx`**
- Wrapper global avec `ThemeProvider` de `next-themes` (attribute="class", defaultTheme="light")
- Place autour de tout le contenu

**`src/pages/ShopStorefront.tsx`**
- Ajouter le `ThemeToggle` dans le header de la vitrine

**`index.html`**
- S'assurer que la classe `dark` est supportee (le tailwind.config a deja `darkMode: "class"`)

## Phase 4 : Promotions (prix barre)

### Modifications

**`src/types/shop.ts`**
- Ajouter `compare_at_price: number | null` au type `Product`

**`src/pages/ShopStorefront.tsx`**
- Si `compare_at_price` existe et est superieur au `price`, afficher :
  - L'ancien prix barre en gris
  - Le nouveau prix en couleur primaire
  - Badge "PROMO" en haut de la carte

**`src/pages/AddProduct.tsx`**
- Le champ `discountPrice` existe deja dans le formulaire
- Ajuster la logique : `price` = prix de vente, `discountPrice` = ancien prix (compare_at_price)
- Envoyer `compare_at_price` lors de la sauvegarde en base

**`src/components/storefront/ProductDetailSheet.tsx`**
- Afficher aussi le prix barre dans la vue detail
- Calculer et afficher le pourcentage de reduction

## Traductions i18n (fr.json + en.json)

Nouvelles cles sous `storefront` :
- `search` : "Rechercher un produit..."
- `buyNow` : "Acheter maintenant"
- `addToCart` : "Ajouter au panier"
- `cart` : "Mon panier"
- `cartEmpty` : "Votre panier est vide"
- `orderViaWhatsapp` : "Commander via WhatsApp"
- `clearCart` : "Vider le panier"
- `total` : "Total"
- `quantity` : "Quantite"
- `promo` : "PROMO"
- `discount` : "-{{percent}}%"
- `interestedMessage` : "Bonjour ! Je souhaite commander :\n{{items}}\nTotal : {{total}}\nMerci !"
- `aboutShop` : "A propos"
- `allRights` : "Tous droits reserves."

## Recapitulatif des fichiers

| Action | Fichier |
|--------|---------|
| Creer | `src/components/storefront/CartContext.tsx` |
| Creer | `src/components/storefront/CartDrawer.tsx` |
| Creer | `src/components/storefront/CartButton.tsx` |
| Creer | `src/components/storefront/ProductDetailSheet.tsx` |
| Creer | `src/components/ThemeToggle.tsx` |
| Recrire | `src/pages/ShopStorefront.tsx` |
| Modifier | `src/App.tsx` (ThemeProvider) |
| Modifier | `src/types/shop.ts` (compare_at_price) |
| Modifier | `src/pages/AddProduct.tsx` (logique promo) |
| Modifier | `src/i18n/locales/fr.json` |
| Modifier | `src/i18n/locales/en.json` |

## Ordre d'implementation

1. Types (`shop.ts`) -- ajouter compare_at_price
2. CartContext -- base du panier
3. CartDrawer + CartButton -- UI du panier
4. ProductDetailSheet -- vue detail
5. ThemeToggle + ThemeProvider -- dark mode
6. ShopStorefront -- integration de tout
7. AddProduct -- logique promo
8. Traductions i18n
