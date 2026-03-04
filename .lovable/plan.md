

## Command Palette ⌘K — Style Chariow pour Ventou

### Ce qui sera fait

**1. Barre de recherche header (image 2)**
- Remplacer l'input actuel par un bouton cliquable avec le texte : `Trouvez n'importe quoi : Appuyez sur ⌘K sur votre clavier`
- Le raccourci `⌘K` affiché dans une petite `<kbd>` stylée
- Au clic OU au raccourci ⌘K → ouvre la command palette

**2. Command Palette modale (image 3)**
- Nouveau composant `CommandPalette.tsx` utilisant le composant `cmdk` déjà installé (`Command` de `src/components/ui/command.tsx`)
- Input de recherche : placeholder "Commencez à taper pour rechercher..."
- **Actions rapides ⚡** (groupe par défaut quand le champ est vide) :
  - `Plus` → Ajouter un produit → `/dashboard/products/add`
  - `Percent` → Créer une réduction → `/dashboard/marketing/coupons`
  - `ShoppingBag` → Voir les commandes → `/dashboard/orders`
  - `Users` → Voir les clients → `/dashboard/customers`
  - `BarChart3` → Voir les analytics → `/dashboard/marketing/analytics`
  - `Settings` → Paramètres → `/dashboard/parametres`
- **Recherche dynamique** : quand l'utilisateur tape, filtrer parmi :
  - Toutes les pages de navigation (dashboard, produits, commandes, clients, marketing, paramètres)
  - Les actions rapides
- Bouton "Quitter `esc`" en bas à droite
- Style : `rounded-xl`, `shadow-lg`, overlay sombre

**3. Fichiers modifiés**
- `src/components/dashboard/CommandPalette.tsx` — nouveau composant
- `src/components/dashboard/DashboardHeader.tsx` — remplacer l'input search par le trigger + intégrer le composant
- Aucune dépendance supplémentaire (cmdk déjà installé)

**4. Raccourcis clavier**
- `⌘K` (Mac) / `Ctrl+K` (Windows) pour ouvrir/fermer
- `Escape` pour fermer
- Navigation clavier native via cmdk

