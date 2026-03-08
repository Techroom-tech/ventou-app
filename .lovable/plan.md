

## Plan : Animations d'entrée pro sur les pages Auth

L'`AuthLayout` utilise déjà `animate-fade-in` (Tailwind). Pour un rendu vraiment pro et attrayant, on va passer à **framer-motion** (déjà installé) avec des animations plus sophistiquées.

### Modifications

**`src/components/AuthLayout.tsx`** :
- Wrapper `motion.div` avec animation fade-in + slide-up (translateY 20px → 0, opacity 0 → 1, durée 500ms, ease `[0.16, 1, 0.3, 1]`)
- Les blobs décoratifs en background reçoivent une animation de scale lente (pulse subtil) pour un fond vivant
- Ajout d'un léger blur/glow animé sur les gradients

**`src/pages/Login.tsx`** :
- Wrapper `motion.div` sur le `Card` avec animation staggerée : le header apparaît d'abord, puis le bouton Google, le séparateur, les champs et le bouton CTA en cascade (stagger ~80ms entre chaque groupe)

**`src/pages/Signup.tsx`** :
- Même traitement stagger que Login
- L'écran de succès (isSuccess) reçoit aussi une animation scale-in pour le cercle vert + fade-in texte

### Détails techniques

- `framer-motion` : `motion.div` avec `initial`, `animate`, `transition` props
- Stagger via un parent `motion.div` avec `staggerChildren: 0.08` dans `transition`
- Chaque enfant : `initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}`
- Easing custom `[0.16, 1, 0.3, 1]` (ease-out quart) pour un mouvement premium
- Background blobs : `motion.div` avec animation `scale` entre 1 et 1.05 en boucle infinie, durée 8s

### Fichiers modifiés
| Fichier | Action |
|---------|--------|
| `src/components/AuthLayout.tsx` | Animations framer-motion sur le layout + blobs animés |
| `src/pages/Login.tsx` | Stagger cascade sur les éléments du formulaire |
| `src/pages/Signup.tsx` | Stagger cascade + animation succès |

