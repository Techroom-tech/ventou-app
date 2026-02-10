

# Reorganisation du flux "Creer Ma Boutique"

## Probleme actuel
"Creer Ma Boutique" est un lien permanent dans la sidebar, comme si c'etait une section reguliere. Or, un vendeur ne cree sa boutique qu'une seule fois -- ce n'est pas une action recurrente.

## Nouvelle logique

### Principe
- **Pas de boutique** : le Dashboard affiche un ecran d'onboarding invitant a creer la boutique (au lieu des stats/orders)
- **Boutique creee** : le Dashboard affiche normalement les stats, et le lien "Creer Ma Boutique" disparait de la sidebar
- **Modifier la boutique** : se fait dans la section Parametres (nouvelle sous-section)

### Flux utilisateur

```text
Utilisateur se connecte
        |
        v
  A-t-il une boutique ?
   /              \
  Non              Oui
   |                |
   v                v
Ecran onboarding   Dashboard normal
dans /dashboard    (stats, commandes)
"Creer Ma Boutique"
   |
   v
Clic sur CTA
   |
   v
/dashboard/create-shop
(formulaire actuel)
   |
   v
Boutique creee -> retour /dashboard (normal)
```

---

## Changements prevus

### 1. Hook `useShop` (nouveau fichier)
Creer `src/hooks/useShop.ts` qui :
- Charge la boutique du user connecte depuis Supabase (`shops` table, `owner_id = user.id`)
- Retourne `{ shop, isLoading, hasShop }`
- Utilise `@tanstack/react-query` pour le cache

### 2. Dashboard (`src/pages/Dashboard.tsx`)
- Si `hasShop === false` : afficher un ecran d'onboarding avec un message engageant et un gros bouton CTA "Creer Ma Boutique" qui redirige vers `/dashboard/create-shop`
- Si `hasShop === true` : afficher le dashboard normal (stats, commandes, actions rapides)

### 3. Sidebar (`src/components/dashboard/DashboardSidebar.tsx`)
- Retirer "Creer Ma Boutique" de la liste `navItems`
- Utiliser `useShop` pour conditionner l'affichage : si pas de boutique, ne montrer que Dashboard et Creer Ma Boutique ; si boutique existe, montrer tous les liens sauf Creer Ma Boutique

### 4. Page Parametres (future, esquisse)
- La route `/dashboard/settings` contiendra une section "Ma Boutique" pour modifier nom, logo, banniere, couleur, WhatsApp, etc.
- Reutilisera les memes composants de formulaire que `CreateShop.tsx`
- A implementer dans un prochain ticket (hors scope de ce plan)

### 5. Navigation mobile (`MobileBottomNav.tsx`)
- Meme logique conditionnelle : masquer les onglets non pertinents si pas de boutique

---

## Section technique

| Action | Fichier |
|--------|---------|
| Creer | `src/hooks/useShop.ts` |
| Modifier | `src/pages/Dashboard.tsx` -- ajouter ecran onboarding conditionnel |
| Modifier | `src/components/dashboard/DashboardSidebar.tsx` -- retirer createShop, conditionner les liens |
| Modifier | `src/components/dashboard/MobileBottomNav.tsx` -- conditionner les liens |
| Conserver | `src/pages/CreateShop.tsx` -- la page reste inchangee, accessible via `/dashboard/create-shop` |

### Hook useShop
```typescript
// Requete Supabase : select * from shops where owner_id = user.id limit 1
// Retourne { shop: Shop | null, isLoading, hasShop: boolean, refetch }
```

### Ecran onboarding dans Dashboard
- Carte centree avec icone Store, titre "Bienvenue sur Ventou", description encourageante
- Bouton CTA orange "Creer Ma Boutique"
- Design coherent avec le reste du dashboard (memes cards, memes couleurs)

