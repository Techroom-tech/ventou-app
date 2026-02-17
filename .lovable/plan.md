

# Recréer la page "Créer une boutique" - Ventou

## Analyse de l'existant

La page actuelle (`src/pages/CreateShop.tsx`, 649 lignes) est fonctionnelle mais peut etre amelioree sur le plan UX et design. Elle utilise deja la table `shops` dans Supabase (pas `stores`), la verification de slug via l'edge function `check-slug`, et l'upload dans le bucket `shop-assets`.

**Note importante** : La table en base s'appelle `shops` (pas `stores`). Toutes les relations utilisent `shop_id`. Le code existant est coherent avec cette structure, donc je conserve `shops` comme nom de table.

---

## Ce qui change

1. **Design plus moderne et epure** - Layout 2 colonnes avec preview sticky a droite, card-based sections plus aerees
2. **Verification boutique existante** - Bloquer la creation si l'utilisateur a deja une boutique
3. **Avatar texte auto-genere** - Si pas de logo, generer un cercle avec initiale + couleur primaire dans le preview
4. **Meilleure validation UX** - Feedback visuel plus clair sur chaque champ, bouton desactive intelligemment
5. **Animations legeres** - Fade-in sur les sections
6. **Mobile-first ameliore** - Preview en bottom sheet sur mobile, boutons larges

---

## Plan d'implementation

### Etape 1 : Reecrire `src/pages/CreateShop.tsx`

Refonte complete du composant avec :
- Verification au montage si l'utilisateur a deja une boutique (`useShop().hasShop`) avec redirection ou message bloquant
- Layout 2 colonnes : formulaire (gauche), preview sticky (droite)
- Sections en Cards :
  - Informations principales (nom, slug auto, description/slogan)
  - Branding (logo, banniere, couleur primaire avec presets + picker)
  - Contact (WhatsApp format international)
  - Sous-domaine (slug editable, verification temps reel, apercu `{slug}.ventou.shop`)
- Bouton "Creer ma boutique" desactive si slug invalide ou pris
- Toast succes/erreur
- Redirection vers `/dashboard/shop-created` apres creation

### Etape 2 : Ameliorer le composant `ShopPreview` (inline)

- Avatar texte stylise avec initiale si pas de logo (cercle avec `primary_color` en fond, lettre blanche)
- Banniere avec couleur de fond si pas d'image
- Affichage dynamique du sous-domaine
- Bouton WhatsApp si numero renseigne

### Etape 3 : Garder la compatibilite

- Route reste `/dashboard/create-shop` (deja referencee dans le sidebar et la navigation)
- Table reste `shops` (coherent avec toute l'architecture)
- Edge function `check-slug` reste inchangee
- Bucket `shop-assets` reste inchange
- Aucune modification de base de donnees

---

## Details techniques

### Schema Zod (identique, valide deja le format)
- `name`: string, min 2, max 50
- `slug`: string, min 3, max 40, regex kebab-case
- `description`: string, max 200, optionnel
- `category`: string obligatoire
- `country`: string obligatoire
- `city`: string optionnel
- `whatsapp`: regex international optionnel
- `primary_color`: regex hex

### Flux de creation
1. Validation Zod du formulaire
2. Verification `slugStatus === 'available'`
3. Insert dans `shops` avec `owner_id = user.id`
4. Upload logo/banniere dans `shop-assets/{shop_id}/`
5. Update `shops` avec URLs publiques
6. Invalidation cache react-query
7. Redirection `/dashboard/shop-created`

### Fichiers modifies
- `src/pages/CreateShop.tsx` - Refonte complete du composant

### Fichiers NON modifies
- Base de donnees (aucune migration)
- Edge functions
- Routes (`App.tsx`)
- Sidebar / Navigation
- Types (`shop.ts`)

