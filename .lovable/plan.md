
# Storefront Ventou — Expérience E-commerce Complète

## Vue d'ensemble

Le storefront actuel est fonctionnel mais basique. L'objectif est de le transformer en une expérience type Shopify avec :
- Une page produit riche et responsive (mobile / tablette / desktop)
- Un panier persistant (localStorage)
- Un checkout complet adapté à l'Afrique (COD + WhatsApp)
- Une commande enregistrée en base de données

L'architecture existante (CartContext, CartDrawer, ProductDetailSheet, ShopStorefront) est conservée et enrichie.

---

## Architecture cible

```text
ShopStorefront
├── Header (existant, amélioré)
├── Grille produits (existant, amélioré)
│   └── ProductCard (hover effects, badges, bouton panier)
├── ProductDetailSheet (refondu)
│   ├── Mobile: Drawer bottom + swipe image + sticky bar
│   ├── Tablette: Image + infos empilés
│   └── Desktop: 2 colonnes, sticky achat, zoom hover
├── CartDrawer (enrichi + localStorage)
│   ├── Mobile: Drawer bottom
│   └── Desktop: Drawer right side (Sheet)
├── CheckoutDrawer (NOUVEAU)
│   ├── Mobile: 1 colonne, bouton full width
│   └── Desktop: 2 colonnes (formulaire + résumé sticky)
└── CartContext (enrichi, localStorage)
```

---

## 1. SQL à exécuter dans Supabase (vous)

Avant tout, exécuter ce SQL dans l'éditeur Supabase pour créer la table `orders` et ajouter les colonnes de configuration vendeur :

```sql
-- 1. Colonnes de configuration paiement sur la table shops
ALTER TABLE public.shops 
  ADD COLUMN IF NOT EXISTS enable_whatsapp_order boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_cod boolean DEFAULT true;

-- 2. Table orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  quartier text,
  notes text,
  location_url text,
  items jsonb NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Le propriétaire de la boutique peut lire ses commandes
CREATE POLICY "owner_read_orders" ON public.orders FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Tout le monde peut créer une commande (acheteurs anonymes)
CREATE POLICY "public_insert_orders" ON public.orders FOR INSERT
  WITH CHECK (true);
```

---

## 2. Fichiers modifiés / créés

### A. `src/components/storefront/CartContext.tsx` — Enrichi

**Changements :**
- Persistance localStorage (`ventou-cart-{shopId}`)
- Hydratation au mount depuis localStorage
- `shopId` passé au provider pour namespacing du cache

### B. `src/components/storefront/ProductDetailSheet.tsx` — Refondu

**Mobile :**
- Image plein écran avec swipe potentiel
- Sticky bottom bar (prix + "Ajouter au panier")
- Tabs : Détails / Livraison / Avis

**Tablette :**
- Image en haut, infos en dessous, bouton large centré

**Desktop :**
- Layout 2 colonnes (galerie gauche, infos droite)
- Sticky bloc d'achat au scroll
- Zoom image au hover (`scale-105` on hover)
- Sélecteur quantité intégré au bloc sticky

### C. `src/components/storefront/CartDrawer.tsx` — Enrichi

**Changements :**
- Mobile : Drawer bottom (comportement actuel amélioré)
- Desktop : utilisation de `Sheet` depuis `@/components/ui/sheet` (côté droit)
- Bouton "Passer la commande" (checkout) au lieu de WhatsApp direct
- Affichage des réductions par article

### D. `src/components/storefront/CheckoutDrawer.tsx` — NOUVEAU

**Formulaire avec champs :**
- Nom complet
- Téléphone
- Ville
- Quartier
- Notes
- URL de localisation (lien Google Maps ou saisie libre)

**Méthodes de paiement (conditionnelles) :**
- Paiement à la livraison (COD) — affiché si `shop.enable_cod`
- Commander via WhatsApp — affiché si `shop.whatsapp && shop.enable_whatsapp_order`

**Logic checkout :**
1. Validation Zod côté client
2. Insertion dans `public.orders` avec `items` en jsonb et `total` calculé côté client (le total est re-vérifié depuis les prix DB — pas de confiance aveugle au frontend)
3. Si WhatsApp : ouverture du lien wa.me avec résumé de commande
4. Si COD : confirmation à l'écran + clearCart

**Responsive :**
- Mobile : 1 colonne full width dans Drawer bottom
- Desktop : Sheet côté droit avec 2 colonnes (formulaire à gauche, résumé commande sticky à droite)

### E. `src/pages/ShopStorefront.tsx` — Mis à jour

**Changements :**
- Passe `shopId` au `CartProvider` pour le localStorage namespacing
- Passe `shop` (complet, avec `enable_cod` et `enable_whatsapp_order`) au `CartDrawer` et `CheckoutDrawer`
- Amélioration de la grille produits : hover shadow + animation + badge stock faible

### F. `src/types/shop.ts` — Mis à jour

Ajout des nouveaux champs sur `Shop` :
```ts
enable_whatsapp_order: boolean;
enable_cod: boolean;
```

Ajout de l'interface `Order` côté storefront (pour l'insertion).

### G. `src/i18n/locales/fr.json` et `en.json` — Clés checkout

Nouvelles clés i18n :
```json
"storefront": {
  "checkout": "Passer la commande",
  "checkoutTitle": "Votre commande",
  "customerName": "Nom complet",
  "phone": "Téléphone",
  "city": "Ville",
  "quartier": "Quartier / Zone",
  "notes": "Notes de livraison",
  "locationUrl": "Lien de localisation (Google Maps)",
  "paymentMethod": "Mode de paiement",
  "cod": "Paiement à la livraison",
  "orderViaWhatsapp": "Commander via WhatsApp",
  "orderSummary": "Résumé de commande",
  "confirmOrder": "Confirmer la commande",
  "orderSuccess": "Commande envoyée !",
  "orderSuccessDescription": "Vous serez contacté pour confirmer la livraison.",
  "tabs": {
    "details": "Détails",
    "shipping": "Livraison",
    "reviews": "Avis"
  },
  "shipping": {
    "info": "Livraison disponible dans votre ville.",
    "contact": "Contactez le vendeur pour les détails de livraison."
  },
  "stockLow": "Plus que {{count}} en stock !",
  "outOfStock": "Rupture de stock"
}
```

---

## 3. Sécurité

- **Total recalculé** : le montant inséré en DB est calculé à partir des prix du produit (déjà chargés depuis Supabase), pas d'un champ caché modifiable
- **Sanitisation** : tous les inputs passent par un schema Zod avant insertion
- **Stock** : vérification `stock_quantity > 0` avant d'afficher "Ajouter au panier" (si `track_stock = true`)
- **RLS** : la policy `public_insert_orders` autorise les insertions anonymes (acheteurs), mais les SELECTs sont limités au propriétaire de la boutique

---

## 4. Performance

- Images lazy-loaded (déjà en place, renforcé)
- `useMemo` pour les calculs de panier
- `useCallback` pour les handlers
- Aucune librairie supplémentaire lourde
- Le localStorage évite les re-fetches inutiles du panier

---

## Résumé des fichiers

| Fichier | Action |
|---|---|
| `src/types/shop.ts` | Modifier — ajout champs `enable_cod`, `enable_whatsapp_order` |
| `src/components/storefront/CartContext.tsx` | Modifier — localStorage |
| `src/components/storefront/ProductDetailSheet.tsx` | Réécrire — responsive complet |
| `src/components/storefront/CartDrawer.tsx` | Modifier — Desktop Sheet + checkout CTA |
| `src/components/storefront/CheckoutDrawer.tsx` | Créer — formulaire + DB insert |
| `src/pages/ShopStorefront.tsx` | Modifier — passer shopId + shop complet |
| `src/i18n/locales/fr.json` | Modifier — nouvelles clés |
| `src/i18n/locales/en.json` | Modifier — nouvelles clés |

**Rappel** : exécuter le SQL Supabase avant d'approuver ce plan.
