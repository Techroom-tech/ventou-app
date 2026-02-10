
# Page de succes apres creation de boutique

## Contexte
Actuellement, apres la creation d'une boutique, l'utilisateur est redirige vers `/dashboard` avec un simple toast. L'objectif est de creer une page de succes intermediaire celebrant la creation, comme dans le screenshot de reference.

## Design de la page

La page affichera :
- Un header avec bouton fermer (X) et label "SUCCES" en orange
- Une grande icone de validation (cercle orange avec check blanc) avec des points decoratifs
- Le titre "Felicitations, votre boutique est en ligne !"
- Le sous-titre avec le lien de la boutique en gras (slug.ventou.shop)
- Un encadre "Lien de la boutique" avec le lien copiable (bouton copier)
- Le texte "Partagez ce lien pour commencer a vendre"
- Un bouton principal orange "Ajouter mon premier produit" (lien vers /dashboard/products/new)
- Une rangee avec bouton "Partager" + icones WhatsApp et Facebook
- Un lien "Aller au tableau de bord" en bas

La page sera responsive : centree et compacte sur mobile, avec plus d'espace sur desktop/tablette.

## Changements

### 1. Nouveau fichier : `src/pages/ShopCreatedSuccess.tsx`

Page autonome qui recoit le slug via les parametres d'URL ou via `useShop()`. Elements :
- Cercle de succes anime (check blanc sur fond orange)
- Lien copiable avec `navigator.clipboard.writeText()`
- Bouton "Ajouter mon premier produit" vers `/dashboard/products/new`
- Bouton "Partager" utilisant `navigator.share()` si disponible (fallback: copie du lien)
- Boutons WhatsApp et Facebook pour partage direct
- Lien vers `/dashboard` en bas
- Responsive : padding et tailles adaptees mobile/tablette/desktop

### 2. Modification de `src/App.tsx`

Ajouter la route protegee `/dashboard/shop-created` pointant vers `ShopCreatedSuccess`.

### 3. Modification de `src/pages/CreateShop.tsx`

Changer la redirection apres succes : `navigate('/dashboard')` devient `navigate('/dashboard/shop-created')` pour afficher la page de celebration.

### 4. Traductions i18n (`fr.json` + `en.json`)

Ajouter les cles sous `shopCreated` :
- `title` : "Felicitations, votre boutique est en ligne !"
- `subtitle` : "Votre boutique **{{slug}}.ventou.shop** est prete a accueillir vos premiers clients."
- `linkLabel` : "Lien de la boutique"
- `copied` : "Lien copie !"
- `shareHint` : "Partagez ce lien pour commencer a vendre"
- `addProduct` : "Ajouter mon premier produit"
- `share` : "Partager"
- `goToDashboard` : "Aller au tableau de bord"

## Fichiers concernes

| Action | Fichier |
|--------|---------|
| Creer | `src/pages/ShopCreatedSuccess.tsx` |
| Modifier | `src/App.tsx` -- ajouter route |
| Modifier | `src/pages/CreateShop.tsx` -- changer navigate |
| Modifier | `src/i18n/locales/fr.json` -- cles shopCreated |
| Modifier | `src/i18n/locales/en.json` -- cles shopCreated |
