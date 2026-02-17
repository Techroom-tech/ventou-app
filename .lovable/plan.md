

# Centraliser la logique de protection du dashboard

## Probleme

La logique de redirection est dispersee dans plusieurs pages (`Dashboard.tsx`, `CreateShop.tsx`, `ShopCreatedSuccess.tsx`). Au refresh, `useShop()` demarre avec `isLoading=true` et `shop=null`. Les pages qui testent `hasShop` avant la fin du chargement declenchent des redirections prematurees.

## Solution

Creer un composant `DashboardGuard` qui centralise toute la logique de redirection et l'utiliser comme wrapper unique pour toutes les routes `/dashboard/*`.

## Architecture

```text
ProtectedRoute (auth check)
  └── DashboardGuard (shop check + redirect logic)
       └── Page (Dashboard, Products, CreateShop, etc.)
```

## Regles de redirection du Guard

1. Si `authLoading` ou `shopLoading` : afficher spinner, aucune redirection
2. Si pas de session : rediriger vers `/login` (deja gere par `ProtectedRoute`)
3. Si `shopLoading === false` et pas de shop :
   - Si la route actuelle est `/dashboard/create-shop` ou `/dashboard/shop-created` : laisser passer
   - Sinon : rediriger vers `/dashboard/create-shop`
4. Si shop existe : laisser passer normalement

## Fichiers modifies

### 1. Nouveau : `src/components/DashboardGuard.tsx`

Composant qui :
- Utilise `useAuth()` pour `isLoading` (auth)
- Utilise `useShop()` pour `isLoading` (shop) et `hasShop`
- Ajoute des logs : `console.log('[Guard]', { authLoading, shopLoading, hasShop, pathname })`
- Affiche un spinner tant que l'un des deux est en chargement
- Redirige vers `/dashboard/create-shop` si pas de shop (sauf si deja sur create-shop ou shop-created)
- Rend `children` sinon

### 2. Modifier : `src/App.tsx`

Wrapper toutes les routes `/dashboard/*` avec `DashboardGuard` a l'interieur de `ProtectedRoute` :

```text
<ProtectedRoute>
  <DashboardGuard>
    <Dashboard />
  </DashboardGuard>
</ProtectedRoute>
```

Appliquer le meme pattern pour `/dashboard/products`, `/dashboard/products/new`, `/dashboard/create-shop`, `/dashboard/shop-created`.

### 3. Modifier : `src/pages/Dashboard.tsx`

- Supprimer la logique `isLoading` / `hasShop` / `OnboardingScreen` (le guard s'en charge)
- Le composant affiche directement `DashboardContent` car le guard garantit que shop existe
- Supprimer les logs de debug

### 4. Modifier : `src/pages/CreateShop.tsx`

- Supprimer la verification `hasShop` et la redirection au debut du composant (le guard autorise deja l'acces)
- Garder le reste du formulaire intact

### 5. Modifier : `src/pages/ShopCreatedSuccess.tsx`

- Supprimer la logique de redirection si pas de shop (le guard autorise deja l'acces a cette route)
- Garder le fallback sur `shop?.slug` si `location.state` est perdu au refresh

## Details techniques

Le `DashboardGuard` est le seul endroit qui decide de la redirection. Les pages individuelles n'ont plus besoin de verifier `hasShop` ni de gerer le loading auth/shop. Cela elimine toute race condition car le guard attend que les deux sources de donnees soient resolues avant de prendre une decision.

