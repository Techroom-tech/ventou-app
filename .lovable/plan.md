

# Ajout d'un bandeau "Complétez votre profil" sur le Dashboard

## Constat

La page Profil (`SettingsProfil.tsx`) contient **déjà** les champs prénom et nom de famille, entièrement fonctionnels. Le vendeur peut déjà modifier son prénom depuis `/dashboard/parametres/profil`.

## Ce qu'il manque

Un **indicateur visuel sur le dashboard** quand le prénom n'est pas renseigné, pour guider le vendeur vers la page profil.

## Plan

### 1. Ajouter un bandeau contextuel sur le Dashboard

Dans `src/pages/Dashboard.tsx`, juste après le hero greeting et avant les action pills :

- Afficher un petit bandeau (Card ou Alert) **uniquement si `!profile?.first_name`**
- Style : fond accent léger, icône User, texte "Complétez votre profil pour personnaliser votre expérience"
- Bouton "Compléter mon profil" → lien vers `/dashboard/parametres/profil`
- Le bandeau disparaît automatiquement une fois le prénom renseigné (car `profile.first_name` sera truthy)

### 2. Traductions i18n

Ajouter les clés `dashboard.completeProfile.title` et `dashboard.completeProfile.cta` dans `fr.json` et `en.json`.

---

Aucune modification de base de données nécessaire. Environ 15 lignes de code ajoutées au Dashboard + 4 clés i18n.

