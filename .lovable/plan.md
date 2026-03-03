

# Plan: Refonte Marketing Center — Hub Premium + Pixels Structurés

## Résumé

Réécrire les 6 pages marketing avec un design SaaS premium (cartes 16px radius, hover shadows, icônes 32px, chevrons). La page Pixels passe d'un formulaire basique à un formulaire structuré par bloc (Facebook, TikTok, GTM, Custom) avec toggles d'activation par section. Le tracking_settings DB reste inchangé — les toggles sont dérivés de la présence d'un ID non-vide.

## Fichiers à modifier

### 1. `src/pages/marketing/MarketingHub.tsx` — Refonte complète

- Header : titre 28px SemiBold "Marketing", sous-texte 14px "Boostez vos ventes avec des outils marketing avancés"
- Grid 2 colonnes desktop / 1 mobile, gap 16px
- Cartes : min-height 120px, border-radius 16px, bg white, border #E5E7EB, hover shadow-md
- Icône 32px dans cercle coloré à gauche, titre 16px SemiBold, description 14px, ChevronRight à droite
- Max-width 1200px, padding 32px desktop / 16px mobile

### 2. `src/pages/marketing/MarketingPixels.tsx` — Refonte structurée (style formulaire sérieux)

- Max-width 960px centered
- Header : "Pixels & Tracking" 28px, sous-texte "Configurez vos outils de suivi publicitaire"
- **Bloc Facebook Pixel** : Card avec header (icône FB + titre + toggle ON/OFF). Quand ON : champs Pixel ID + Conversion API Token. Bouton "Tester connexion". Quand OFF : champs disabled/grisés.
- **Bloc TikTok Pixel** : Même structure. Toggle + Pixel ID + Bouton "Tester pixel".
- **Bloc Google Tag Manager** : Toggle + Input GTM ID.
- **Bloc Scripts personnalisés** : Textarea + select injection head/body.
- Bouton "Enregistrer" en bas, style orange #FF6B00.
- Les toggles sont dérivés : ON si le champ correspondant est non-vide. Passer OFF vide le champ.
- Section "Événements auto" : liste informative ViewContent, AddToCart, InitiateCheckout, Purchase — texte informatif, pas de config.
- Note : Le "Tester connexion" et "Tester pixel" valident juste le format de l'ID (regex) côté client, pas d'appel API réel (pas de secret FB/TikTok stocké).

### 3. `src/pages/marketing/MarketingAnalytics.tsx` — Améliorations UI

- Max-width 1200px
- Header 28px "Analytics", sous-texte, filtre date à droite
- Bloc sources trafic : placeholder informatif (pas de données — message clair)
- Bloc performance produits : table desktop, cards mobile, pagination 20
- Bloc heatmap : inchangé mais responsive amélioré

### 4. `src/pages/marketing/MarketingCoupons.tsx` — UI Premium

- Bouton "Créer un coupon" orange #FF6B00
- Table desktop avec colonnes Code, Type, Statut (badge coloré), Usages, Date fin
- Cards mobile compactes
- Modal création 600px desktop / full mobile

### 5. `src/pages/marketing/MarketingPromos.tsx` — UI Premium

- Même traitement : bouton orange, cards/table, badges statut
- Ajout checkboxes : Afficher badge, Afficher countdown

### 6. `src/pages/marketing/MarketingLinks.tsx` — UI Premium

- Table desktop : Nom, Source, Clics, ref_code
- Cards mobile
- Bouton copier lien

### 7. `src/i18n/locales/fr.json` + `en.json`

Ajouter clés manquantes : `marketing.pixels.facebook`, `marketing.pixels.tiktok`, `marketing.pixels.gtm`, `marketing.pixels.testConnection`, `marketing.pixels.autoEvents`, `marketing.pixels.enabled`, `marketing.pixels.disabled`, etc.

## Ce qui ne change PAS

- Tables DB : `tracking_settings`, `discount_codes`, `flash_promotions`, `tracked_links` — inchangées
- Hooks : tous réutilisés tels quels
- Routes App.tsx : inchangées
- Aucune donnée fictive ajoutée

## Performance

- Lazy load déjà en place via App.tsx
- Pagination 20 lignes sur tables produits/coupons/promos/liens

