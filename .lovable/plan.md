

## Refonte Command Palette — Style Chariow/Stripe Premium

### Changements

**`src/components/dashboard/CommandPalette.tsx`** — Refonte visuelle complète :

1. **Overlay** : Remplacer le DialogContent par un style avec `backdrop-blur-sm` et fond semi-transparent sombre (`bg-black/35`)
2. **Container** : `max-w-[560px]`, `rounded-2xl`, shadow premium (`shadow-[0_24px_80px_rgba(0,0,0,0.18)]`), `overflow-hidden`
3. **Animation** : Ajouter framer-motion `scale 0.97→1`, `opacity 0→1`, durée 150ms ease-out
4. **Quick Actions** : Icônes dans des carrés `h-8 w-8 bg-gray-100 rounded-lg` avec `strokeWidth 1.8`, chevron `ChevronRight` à droite de chaque item, padding `10px 14px`, hover `bg-gray-50`
5. **Footer** : Style `border-t`, `text-xs`, aligné à droite avec `esc` dans un `kbd`
6. **Pages section** : Même traitement avec chevrons et icônes carrées
7. **Réduire les quick actions visibles par défaut à 3** (Ajouter produit, Créer réduction, Voir commandes) + garder les autres dans la section Pages
8. **Search input** : `h-12`, icône Search `18px gray-400`, placeholder `14px`

**`src/components/ui/dialog.tsx`** — Aucun changement (on override via className)

**Aucun changement backend ou logique** — Seulement du restyling CSS/Tailwind + ajout de `ChevronRight` et framer-motion wrapper.

