

# Plan: Marketing Center Ventou

## Analyse de faisabilité

**Ce qui existe déjà** : Coupons (table `discount_codes` + hook + page), Pixels (table `tracking_settings` + hook + page) — actuellement dans Settings.

**Ce qui n'existe PAS en DB** : Analytics de trafic (pas de page views, pas de sources), Flash promotions, Liens trackés. Il n'y a aucune instrumentation storefront pour capturer des events (ViewContent, AddToCart, etc.).

**Décision réaliste** : On crée le Marketing Hub avec 5 sections. Analytics sera basé uniquement sur les données `orders` disponibles (performance produits par commandes, performance horaire par commandes). Les métriques de trafic/visiteurs/sources ne peuvent pas être affichées car aucune donnée n'existe — on affiche un placeholder "Connectez vos pixels pour activer le suivi" au lieu de données fictives. Flash Promotions et Liens Trackés nécessitent de nouvelles tables.

---

## 1. Navigation — Marketing Hub

Remplacer le lien sidebar unique `/dashboard/marketing` par un hub avec sous-routes :

```
/dashboard/marketing           → Hub (grid de cartes)
/dashboard/marketing/analytics → Analytics
/dashboard/marketing/coupons   → Coupons (migré depuis Settings)
/dashboard/marketing/promos    → Promotions Flash
/dashboard/marketing/liens     → Liens Trackés
/dashboard/marketing/pixels    → Pixels (migré depuis Settings)
```

Fichier : `src/pages/marketing/MarketingHub.tsx` — Grid de 5 cartes cliquables (même pattern que SettingsHub).

## 2. Migrations DB — 2 nouvelles tables

### `flash_promotions`
```sql
CREATE TABLE public.flash_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_type text NOT NULL DEFAULT 'percentage', -- percentage | fixed
  discount_value numeric NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  show_badge boolean DEFAULT true,
  show_countdown boolean DEFAULT true,
  featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- RLS: owner via shops.owner_id
```

### `tracked_links`
```sql
CREATE TABLE public.tracked_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_url text NOT NULL,
  source text NOT NULL DEFAULT 'other',
  ref_code text NOT NULL,
  clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
-- RLS: owner via shops.owner_id
```

## 3. Pages à créer

| Fichier | Description |
|---|---|
| `src/pages/marketing/MarketingHub.tsx` | Grid hub 5 cartes |
| `src/pages/marketing/MarketingAnalytics.tsx` | Analytics basé sur orders (performance produits, heatmap horaire) |
| `src/pages/marketing/MarketingCoupons.tsx` | Coupons (réutilise hooks existants, UI améliorée avec stats commandes) |
| `src/pages/marketing/MarketingPromos.tsx` | Flash promotions CRUD |
| `src/pages/marketing/MarketingLinks.tsx` | Liens trackés CRUD |
| `src/pages/marketing/MarketingPixels.tsx` | Pixels (réutilise hooks existants) |

## 4. Hooks à créer

| Hook | Description |
|---|---|
| `useFlashPromotions(shopId)` | CRUD flash_promotions |
| `useTrackedLinks(shopId)` | CRUD tracked_links |
| `useProductAnalytics(shopId, days)` | Agrège orders.items par produit (commandes, livrées, annulées) |
| `useHourlyAnalytics(shopId, days)` | Agrège orders par heure de création |

## 5. Analytics — Données réelles uniquement

**Bloc "Sources de trafic"** : Placeholder informatif → "Activez vos pixels Facebook/TikTok pour suivre vos sources de trafic". Pas de données fictives.

**Bloc "Performance produits"** : Table basée sur `orders.items` JSONB — extraction produit par produit avec count commandes, livrées, annulées. Pas de "vues" ni "ajouts panier" (pas de données).

**Bloc "Performance horaire"** : Heatmap simple basé sur `orders.created_at` — heures 0-23 × jours de la semaine, coloré par nombre de commandes.

**Filtre date** : 7j / 30j / 90j dropdown.

## 6. Coupons — Améliorations

Réutiliser `useDiscountCodes` existant. Ajouter une colonne "Commandes générées" en cross-référençant `orders` qui ont un discount appliqué (si le champ existe — sinon juste `used_count`).

## 7. Routes (App.tsx)

Ajouter 6 routes sous `/dashboard/marketing/*`.

## 8. i18n

Ajouter clés `marketing.hub.*`, `marketing.analytics.*`, `marketing.promos.*`, `marketing.links.*` dans fr.json et en.json.

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | 2 tables + RLS |
| `src/pages/marketing/*.tsx` | 6 nouvelles pages |
| `src/hooks/useFlashPromotions.ts` | Nouveau |
| `src/hooks/useTrackedLinks.ts` | Nouveau |
| `src/hooks/useProductAnalytics.ts` | Nouveau |
| `src/hooks/useHourlyAnalytics.ts` | Nouveau |
| `src/App.tsx` | 6 routes |
| `src/i18n/locales/fr.json` | Clés marketing |
| `src/i18n/locales/en.json` | Clés marketing |

Pas de données fictives. ~1200 lignes de code nouveau.

