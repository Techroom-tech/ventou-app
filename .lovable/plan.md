

# Corrections : Slug unique, lien correct, vitrine accessible sans produits

## Problemes identifies

1. **Le slug n'apparait pas** sur la page de succes (affiche ".ventou.shop" au lieu de "tuk.ventou.shop") car `useShop()` ne retrouve pas la boutique (le cache n'est peut-etre pas encore a jour).
2. **Pas de protection contre les doublons** : le bouton "Creer" n'est desactive que si `slugStatus === 'taken'`, pas si le slug n'a pas ete verifie (`idle` ou `checking`).
3. **Pas de lien testable** : en preview, le sous-domaine `slug.ventou.shop` ne fonctionne pas. Il faut un bouton "Voir ma boutique" pointant vers `/shop/:slug`.
4. **La vitrine affiche une page vide** quand il n'y a pas de produits : il faut un etat d'accueil montrant le nom, un avatar genere a partir des initiales si pas de logo, et la description si elle existe.

---

## Modifications prevues

### 1. `src/pages/CreateShop.tsx` -- Renforcer la validation du slug

**Bouton submit (ligne 600)** : remplacer la condition `slugStatus === 'taken'` par `slugStatus !== 'available'` pour bloquer la soumission si le slug n'a pas ete verifie ou est en cours de verification.

**onSubmit (ligne 208)** : meme changement, bloquer si `slugStatus !== 'available'` au lieu de seulement `=== 'taken'`.

**Gestion d'erreur (ligne 260)** : detecter l'erreur PostgreSQL `23505` (unique_violation) et afficher un message specifique "Ce nom de boutique vient d'etre pris".

**Navigation apres succes (ligne 259)** : passer le slug dans le state de navigation pour que la page de succes puisse l'utiliser immediatement sans attendre le cache.

### 2. `src/pages/ShopCreatedSuccess.tsx` -- Corriger le lien + ajouter bouton "Voir"

- Recuperer le slug depuis `useLocation().state` en priorite (transmis par CreateShop), sinon fallback sur `useShop().shop?.slug`.
- Afficher correctement `slug.ventou.shop` dans le lien (le slug ne sera plus vide).
- Ajouter un bouton **"Voir ma boutique"** qui navigue vers `/shop/:slug` pour tester en preview.
- Mettre a jour les traductions i18n avec la cle `shopCreated.viewShop`.

### 3. `src/pages/ShopStorefront.tsx` -- Vitrine sans produits + avatar genere

Quand la boutique n'a aucun produit, au lieu d'un simple texte "Aucun produit", afficher un etat d'accueil attractif :
- Un avatar genere a partir des initiales du nom de la boutique (2 premieres lettres) si aucun logo n'est fourni, avec la couleur primaire comme fond.
- La description de la boutique si elle existe.
- Un message d'encouragement type "Cette boutique arrive bientot avec ses produits !"

Modifier aussi le header et les zones logo : quand `shop.logo_url` est `null`, generer un avatar rond avec les initiales du nom au lieu d'une icone generique `Store`.

### 4. Traductions i18n

Nouvelles cles a ajouter dans `fr.json` et `en.json` :
- `shopCreated.viewShop` : "Voir ma boutique" / "View my shop"
- `createShop.errors.slugNotVerified` : "Veuillez attendre la verification du nom" / "Please wait for name verification"
- `createShop.errors.slugConflict` : "Ce nom vient d'etre pris, veuillez en choisir un autre" / "This name was just taken, please choose another"
- `storefront.comingSoon` : "Cette boutique arrive bientot avec ses produits !" / "This shop is coming soon with its products!"

---

## Recapitulatif des fichiers

| Action | Fichier |
|--------|---------|
| Modifier | `src/pages/CreateShop.tsx` (validation slug + navigation avec state) |
| Modifier | `src/pages/ShopCreatedSuccess.tsx` (recuperer slug du state + bouton "Voir") |
| Modifier | `src/pages/ShopStorefront.tsx` (avatar initiales + etat sans produit) |
| Modifier | `src/i18n/locales/fr.json` (nouvelles cles) |
| Modifier | `src/i18n/locales/en.json` (nouvelles cles) |

## Detail technique : Avatar avec initiales

Quand `shop.logo_url` est null, generer un avatar avec :
- Les 2 premieres lettres du nom de la boutique en majuscules
- Fond = `shop.primary_color` (ou couleur par defaut)
- Texte blanc, police bold
- Utilise dans le header, la section info, et le footer de la vitrine

