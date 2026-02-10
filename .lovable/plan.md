

# Sous-domaines dynamiques : afficher les boutiques sur tuk.ventou.shop

## Statut DNS

Ton Cloudflare est parfaitement configure :
- `ventou.shop` affiche l'app Ventou
- `tuk.ventou.shop` charge bien l'app (SSL OK, plus d'erreur) mais affiche une 404 car le code ne gere pas encore les sous-domaines

Il ne reste que le code a ajouter.

## Comment ca va marcher

Quand quelqu'un visite `tuk.ventou.shop`, l'app React se charge normalement. Au demarrage, elle lit `window.location.hostname`, detecte que c'est un sous-domaine (`tuk`), et affiche la page vitrine de cette boutique au lieu du site principal.

```text
tuk.ventou.shop
      |
Cloudflare (wildcard DNS, deja OK)
      |
Lovable sert l'app React
      |
App detecte "tuk" dans hostname
      |
Affiche la vitrine de la boutique "tuk"
```

## Changements

### 1. Nouveau fichier : `src/lib/subdomain.ts`

Fonction utilitaire qui extrait le slug du hostname :
- `tuk.ventou.shop` retourne `"tuk"`
- `ventou.shop`, `www.ventou.shop`, `localhost`, `*.lovable.app` retournent `null`

### 2. Nouveau fichier : `src/pages/ShopStorefront.tsx`

Page vitrine publique de la boutique :
- Recoit le `slug` en prop
- Charge la boutique depuis Supabase (`shops` table, filtre par slug)
- Charge les produits associes (`products` table, filtre par shop_id)
- Affiche banniere, logo, nom, description, couleur primaire
- Grille de produits avec prix et images
- Bouton WhatsApp pour contacter le vendeur
- Page "Boutique introuvable" si le slug n'existe pas en base

### 3. Modification de `src/App.tsx`

Au debut du composant App, appeler `getSubdomain()`. Si un sous-domaine est detecte, afficher directement `ShopStorefront` avec le slug, sans charger les routes principales.

### 4. Modification de `src/pages/CreateShop.tsx`

Mettre a jour l'apercu URL affiche au vendeur pour montrer le format `slug.ventou.shop`.

### 5. Traductions i18n (`fr.json` + `en.json`)

Ajouter les cles pour la page vitrine :
- `storefront.notFound` : Boutique introuvable
- `storefront.noProducts` : Aucun produit pour le moment
- `storefront.contact` : Contacter via WhatsApp
- `storefront.products` : Nos produits

## Fichiers concernes

| Action | Fichier |
|--------|---------|
| Creer | `src/lib/subdomain.ts` |
| Creer | `src/pages/ShopStorefront.tsx` |
| Modifier | `src/App.tsx` |
| Modifier | `src/pages/CreateShop.tsx` |
| Modifier | `src/i18n/locales/fr.json` |
| Modifier | `src/i18n/locales/en.json` |

