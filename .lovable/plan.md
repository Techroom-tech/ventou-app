

# Refonte Sidebar Dashboard — Style Chariow adapté Ventou

## Analyse de l'existant

La sidebar actuelle fonctionne bien structurellement (collapse, store switcher modal, nav items, help center). Les changements sont principalement **visuels et UX** : nouveau mapping d'icônes, meilleur store switcher inline (dropdown au lieu de modal), tooltips en mode collapsed, styles nav modernisés, et mobile drawer au lieu du bottom nav actuel.

## Plan d'implémentation

### 1. Mettre à jour les icônes navigation (`src/config/navigation.ts`)

Nouveau mapping selon le brief :
- `LayoutDashboard` → `Home`
- `ShoppingCart` → `ShoppingBag`
- `Package` → reste `Package`
- `Users` → reste `Users`
- `Megaphone` → reste `Megaphone`
- `Settings` → reste `Settings`

### 2. Refondre `DashboardSidebar.tsx`

Changements majeurs :
- **Store Switcher** : remplacer le bouton qui ouvre un modal par un `Popover` inline avec la liste des boutiques + slug affiché (`nike.ventou.shop`) + bouton "Créer une boutique"
- **StoreAvatar** : composant dédié 32px, `rounded-[6px]`, fallback avec initiale sur fond coloré déterministe
- **NavItem styling** : `gap-2.5`, `py-2.5 px-3`, `rounded-lg`, hover `bg-sidebar-accent/50` avec `scale(1.03)` subtle, active state avec fond opaque sans la barre latérale gauche (style Chariow = fond uni)
- **Tooltips** en mode collapsed via `Tooltip` de Radix
- **Icônes** : `size={20}`, `strokeWidth={1.8}`, `icon-interactive` class
- **Footer** : `LifeBuoy` pour Centre d'aide, `PanelLeftClose`/`PanelLeftOpen` pour collapse
- **Accessibility** : `aria-current="page"` sur le lien actif, `aria-label` sur les boutons

### 3. Créer `StoreAvatar.tsx` (nouveau composant)

```text
Props: name, logoUrl, size (default 32px)
- Image carrée, rounded-[6px], overflow-hidden
- Fallback: initiale sur fond déterministe (hash du nom → palette de 6 couleurs)
```

### 4. Créer `StoreSwitcherPopover.tsx` (remplace le modal)

- Popover ancré au bouton store dans la sidebar
- Liste des boutiques avec StoreAvatar + nom + slug (`slug.ventou.shop`)
- Check icon sur la boutique active
- Séparateur + bouton "Créer une boutique" (désactivé si >= 4)
- `window.location.reload()` au changement (comme actuellement)

### 5. Mobile : Drawer sidebar (`MobileBottomNav.tsx`)

Adapter le drawer existant pour inclure :
- Store Switcher en haut du drawer
- Toute la navigation (primary + secondary)
- Help center + Mon compte + Déconnexion
- Spacing augmenté (`min-h-[48px]` par item) pour touch targets

### 6. CSS — sidebar tokens ajustement (`src/index.css`)

- Sidebar background passe à un gris très clair (`--sidebar-background: 220 14% 96%`) au lieu du bleu foncé actuel, pour un look Chariow (sidebar claire)
- `--sidebar-foreground` : texte sombre
- `--sidebar-accent` : gris-100 subtil
- Conserver les variables dark mode existantes

### 7. Layout margin (`DashboardLayout.tsx`)

Ajuster la largeur collapsed de `68px` à `64px` comme spécifié dans le brief.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/config/navigation.ts` | Changer `LayoutDashboard` → `Home`, `ShoppingCart` → `ShoppingBag` |
| `src/components/dashboard/StoreAvatar.tsx` | **Nouveau** — composant avatar boutique 32px |
| `src/components/dashboard/StoreSwitcherPopover.tsx` | **Nouveau** — remplace `ShopSwitcherModal` dans la sidebar |
| `src/components/dashboard/DashboardSidebar.tsx` | Refonte complète — popover store, tooltips, nouveau style nav |
| `src/components/dashboard/MobileBottomNav.tsx` | Ajouter store switcher dans le drawer, spacing touch |
| `src/components/dashboard/DashboardLayout.tsx` | Margin collapsed `64px` |
| `src/contexts/SidebarCollapseContext.tsx` | Inchangé |
| `src/index.css` | Sidebar tokens → palette claire (gris) |
| `src/components/dashboard/ShopSwitcherModal.tsx` | Conservé (utilisé par mobile), mais retiré de la sidebar desktop |

## Ce qui ne change PAS

- `DashboardShell.tsx` — structure identique
- `DashboardHeader.tsx` — inchangé
- Toutes les pages dashboard — aucune modification
- Dark mode sidebar — reste sombre (seul le light mode passe en sidebar claire)

