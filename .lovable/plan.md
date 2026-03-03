

# Fix: Sidebar collapse layout + Emoji couleur

## Probleme 1 : Le contenu ne suit pas quand la sidebar est reduite

Quand la sidebar passe de 240px a 68px, le `margin-left` du contenu principal reste fixe a `ml-60` (240px). Il faut partager l'etat `collapsed` entre la sidebar et le layout.

### Solution

- Creer un petit contexte `SidebarCollapseContext` dans `DashboardLayout.tsx` (ou un fichier dedie) qui expose `collapsed` et `setCollapsed`
- `DashboardSidebar` consomme ce contexte au lieu d'un `useState` local
- `DashboardLayout` applique conditionnellement `lg:ml-60` ou `lg:ml-[68px]` sur le conteneur principal

### Fichiers modifies

1. **`src/contexts/SidebarCollapseContext.tsx`** (nouveau) : contexte avec `collapsed` + `setCollapsed`
2. **`src/components/dashboard/DashboardLayout.tsx`** : wrapper avec le provider, margin-left dynamique
3. **`src/components/dashboard/DashboardSidebar.tsx`** : utiliser le contexte au lieu du state local

## Probleme 2 : Emoji affiche en noir au lieu de couleur native

Le `<span>` contenant l'emoji herite du style `text-foreground` (couleur sombre). Il faut forcer le rendu emoji couleur.

### Solution

Dans `Dashboard.tsx`, ajouter un style inline `color: transparent` n'est pas la bonne approche. A la place, ajouter une classe CSS utilitaire `.emoji-color` dans `index.css` :

```css
.emoji-color {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif;
  color: initial;
  -webkit-text-fill-color: initial;
}
```

Et appliquer `className="emoji-color text-3xl sm:text-4xl"` sur le `<span role="img">` du greeting.

