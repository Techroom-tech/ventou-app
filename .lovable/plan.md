

# Refonte complète des pages Commandes Ventou

## Résumé

Réécriture totale de `Orders.tsx` (liste) et `OrderDetail.tsx` (détail) pour en faire un outil opérationnel rapide, mobile-first, orienté action pour vendeurs COD traitant 50+ commandes/jour.

---

## 1. Page Liste Commandes (`src/pages/Orders.tsx`) — Réécriture complète

### Header
- Titre "Commandes" + sous-texte dynamique "X commandes aujourd'hui" (requête count `created_at >= today`)
- Boutons : "Nouvelle commande" (primaire), "Exporter CSV" (outline), "Mode traitement rapide" (outline)
- Hook `useOrdersToday` : simple count query filtré sur `created_at::date = current_date`

### Barre recherche
- Recherche par nom, WhatsApp, ID commande (ajouter `id` au filtre `or` dans `useOrders`)
- Placeholder : "Rechercher par nom, téléphone ou ID..."

### Filtres statuts (pills)
- Identiques à l'existant mais sans "archived" visible par défaut
- Compteurs dynamiques réels (déjà en place via `useOrderCounts`)

### Table desktop — Colonnes refaites
- **Checkbox** (sélection multiple via state `selectedIds: Set<string>`)
- **ID commande** (mono, tronqué)
- **Client** (nom + numéro en dessous)
- **Montant** (bold)
- **Ville / Quartier**
- **Statut** (badge)
- **Date** (relative)
- **Actions rapides** : icônes inline — Appeler (`tel:`), WhatsApp (`wa.me`), Confirmer/Livrer (transition directe), Annuler — chaque action ouvre un toast de confirmation léger, pas de modal lourd

### Actions rapides inline
- Boutons icônes dans la dernière colonne selon `ORDER_TRANSITIONS[status]`
- Confirmation via `toast` avec bouton "Annuler" (optimistic update pattern) ou `window.confirm` léger
- Pas de navigation vers la fiche pour les actions courantes

### Barre d'actions multiples (sticky bottom)
- Visible si `selectedIds.size > 0`
- Texte : "X commande(s) sélectionnée(s)"
- Actions : "Confirmer", "Marquer livrées", "Annuler" — mutation batch via `Promise.all`
- Style : fixed bottom, bg-card, shadow-lg, z-40

### Mobile — Cartes compactes refaites
- Structure : Nom (bold) + Montant (bold, grand) + Ville + Badge statut
- En bas : boutons [📞] [WhatsApp] [✔ Confirmer] alignés horizontalement
- Suppression du texte "Clic droit ou appui long" — les actions sont directement visibles
- Pas de swipe (complexité dnd-kit non fiable sur mobile) — boutons d'action directement affichés

### Fichiers modifiés
- `src/pages/Orders.tsx` — réécriture complète
- `src/hooks/useOrders.ts` — ajouter filtre par ID commande dans la recherche, ajouter hook `useOrdersToday`

---

## 2. Page Détail Commande (`src/pages/OrderDetail.tsx`) — Réécriture complète

### Principes
- Moins de scroll, plus d'actions immédiates
- Supprimer la section "Historique d'actions" (timeline events)
- Supprimer la marge estimée (pas pertinent COD)
- Supprimer le badge "NOUVEAU" décoratif
- Masquer toute section vide (notes vides, remise à 0, etc.)

### Header compact (sticky)
- `Commande #ID` + Badge statut + Date
- À droite : [📞] [WhatsApp] [Changer statut dropdown]

### Bloc Contact (priorité absolue, premier bloc)
- Nom client + Numéro WhatsApp
- Deux gros boutons : "Appeler" et "WhatsApp"
- Adresse complète en dessous
- Bouton "Ouvrir dans Google Maps" uniquement si `location_url` existe
- Si pas de Maps → rien (pas de bouton grisé)

### Note client (conditionnelle)
- Si `order.notes` existe → bloc encadré visible
- Si pas de note → section absente du DOM

### Articles commandés
- Table compacte : Produit | Prix unit. | Qté | Total
- Pas d'icônes décoratives (supprimer l'icône Package par ligne)

### Total
- Sous-total
- Remise (uniquement si > 0)
- "Total à encaisser" (pas "Total à payer")
- Texte : "Paiement : À la livraison (COD)"
- Supprimer "Revenu" / "Marge estimée"

### Notes internes vendeur
- Conserver le système existant mais masquer le bloc entier si aucune note et ne montrer que l'input

### Mobile sticky CTA
- Conserver le bouton d'action principal en bas

### Fichiers modifiés
- `src/pages/OrderDetail.tsx` — réécriture complète

---

## 3. Design system aligné

- Couleurs : Primary `#1E3A8A`, Accent `#16A34A`, Danger `#DC2626`, Warning `#F59E0B`
- Note : les couleurs primary actuelles du projet sont proches, on utilisera les CSS variables existantes + ajustements ponctuels
- Typographie : Inter (déjà en place)
- Icônes : Lucide React (déjà en place), style outline

---

## 4. i18n

- Les clés de traduction `orders.status.*` existent déjà
- Ajouter les nouvelles clés : `orders.todayCount`, `orders.bulkActions.*`, `orders.quickProcess`

---

## 5. Performance

- Pagination 20/page (déjà en place)
- Debounce recherche 350ms (déjà en place)
- Real-time via Supabase channel (déjà en place)
- Pas de nouvelles dépendances

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/pages/Orders.tsx` | Réécriture |
| `src/pages/OrderDetail.tsx` | Réécriture |
| `src/hooks/useOrders.ts` | Ajout `useOrdersToday` + filtre ID |
| `src/i18n/locales/fr.json` | Nouvelles clés |
| `src/i18n/locales/en.json` | Nouvelles clés |

Aucune migration DB nécessaire. ~800 lignes de code refactorisé.

