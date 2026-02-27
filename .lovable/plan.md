

# Refonte Dashboard Vendeur Premium — Plan Final

## Contexte

Le dashboard vendeur doit être refondu en style premium Shopify-like avec : greeting dynamique, nouveau header, sidebar avec sélecteur boutique, stats cards, section produits populaires, chat flottant intégré, et mise à jour de la limite boutiques à 4 pour tous les plans.

## Résumé des décisions utilisateur

- **Section vide "Produits les plus vendus"** : Garder la section, afficher illustration + CTA "Ajouter un produit" quand pas de données
- **Section Communauté** : Retirée
- **Actions rapides** : Ajouter un produit + Créer une réduction + Partager la boutique (existant déjà)
- **Bouton chat flottant** : Chat intégré (widget type Crisp/Tawk — pour v1, lien vers support ou placeholder)
- **Limite boutiques** : 4 pour tous les vendeurs (modifier `max_stores` dans `subscription_plans`)

---

## Tâches d'implémentation

### 1. Mise à jour `subscription_plans.max_stores` → 4 pour tous
- UPDATE les 3 plans (free, pro, business) pour `max_stores = 4`

### 2. Helper `getTimeGreeting()`
- Créer `src/lib/greeting.ts`
- Retourne `{ text: string, emoji: string }` basé sur `new Date().getHours()`
- 5-12h: "Bonjour" 🌅 / 12-14h: "Bon midi" ☀️ / 14-18h: "Bon après-midi" 🌤 / 18-22h: "Bonsoir" 🌙 / 22-5h: "Bonne nuit" 🌜

### 3. Refonte DashboardHeader (Top Bar)
- Logo VENTOU à gauche
- Barre de recherche centrale (placeholder "Trouvez n'importe quoi : ⌘K") — UI only pour v1
- À droite : bouton "Visiter ma boutique" (ouvre storefront), icône copier lien, toggle masquer données (œil barré), notifications, avatar
- State `dataMasked` propagé via context ou prop

### 4. Refonte DashboardSidebar
- Bloc profil boutique en haut : logo boutique + nom + chevron → ouvre modal "Changer de boutique"
- Navigation : Dashboard, Produits, Commandes, Clients, Marketing, Paramètres
- Bas : Centre d'aide + bouton réduire sidebar (toggle collapsed 60px ↔ 250px)
- Style : icônes outline, item actif fond gris clair, border-radius 8px

### 5. Modal "Changer de boutique"
- Composant `ShopSwitcherModal` avec Radix Dialog
- Liste des boutiques (`useShop().shops`) avec logo, nom, flèche
- Boutique active = indicateur visuel
- Bouton "Créer une boutique +" (max 4, désactivé si atteint) → `/dashboard/create-shop`
- `selectShop(id)` au clic + refresh page

### 6. Refonte page Dashboard principale
- **Hero** : Greeting dynamique + prénom (police serif via `font-serif` class) + emoji
- **Sous-titre** : message contextuel motivant
- **3 boutons action pill** : Ajouter un produit (accent), Créer une réduction, Partager boutique
- **3 cards stats** : Revenu total, 7 derniers jours, Nombre total de clients — border-radius 16px, icône info
- **Support `dataMasked`** : remplacer valeurs par `••••` quand activé
- **Section "Produits les plus vendus"** : garder existante, améliorer état vide avec illustration + CTA
- **Retirer section Communauté**
- Conserver graphique revenus + commandes récentes

### 7. Refonte MobileBottomNav
- 5 items : Dashboard, Produits, Commandes, Clients, Menu
- Style iOS-like : fond blanc, shadow top, coins arrondis haut
- "Menu" → drawer slide droite avec nav complète + "Visiter ma boutique" en bas

### 8. Bouton chat flottant
- Composant `FloatingChatButton` : bouton rond 56px, fond accent, icône MessageCircle, position fixed bottom-right
- V1 : ouvre lien vers page support (`/support`) ou WhatsApp
- Future : intégration Crisp/Tawk

### 9. Context `DataMaskContext`
- Provider autour du dashboard layout
- State `isMasked` + toggle
- Utilisé dans les cards stats et hero pour remplacer les valeurs par `••••`

### 10. Traductions i18n
- Ajouter clés greeting, nouveaux labels header, modal boutique, masquage données dans `en.json` et `fr.json`

---

## Détails techniques

- `max_stores` passe à 4 via UPDATE SQL sur `subscription_plans`
- La sidebar collapsed utilise un state local + CSS transition `w-[60px]` ↔ `w-[250px]`
- Le search bar est cosmétique v1 (pas de logique de recherche backend)
- Police serif : utiliser `font-serif` Tailwind (Georgia fallback) — Playfair Display ajouté si demandé
- Le modal boutique affiche un spinner pendant le chargement puis la liste
- Le bouton "Créer une boutique" vérifie `shops.length < 4` avant de permettre la navigation

