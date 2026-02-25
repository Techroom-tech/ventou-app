

# Refonte AdminEmailHub -- Fidèle à la maquette

## Analyse de la maquette

La capture montre une page **avec le sidebar AdminLayout** (pas standalone), contenant :

1. **Header** : titre "Système Email" avec icône Mail, breadcrumb "Dashboard / Settings / Email" en dessous
2. **5 cartes** (pas 3) en grille 3+2 :
   - Configuration Email -- "Fournisseurs et providers actifs"
   - Template par défaut -- "Header, footer et wrapper global"
   - Templates Email -- "28 templates transactionnels"
   - Logs Email -- "Historique des envois et erreurs"
   - Authentification Domaine -- "DKIM, SPF et vérification DNS"
3. **Design des cartes** : minimaliste, icône carrée grise à gauche, titre + description courte, pas de "Change Setting →", bordure fine, hover subtil

## Changements

### Fichier 1 : `src/pages/admin/AdminEmailHub.tsx` (réécriture)

- Réintégrer `AdminLayout` (sidebar visible comme dans la maquette)
- Supprimer `EmailSettingsTopbar` (la topbar est celle de AdminLayout)
- Titre "Système Email" avec icône `Mail` (lucide)
- Breadcrumb texte simple en dessous du titre
- 5 cartes avec descriptions courtes en français
- Grille : `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`

### Fichier 2 : `src/components/admin/EmailSettingsCard.tsx` (simplification)

- Retirer le lien "Change Setting →"
- Icône dans un carré `bg-muted` (gris neutre comme la maquette, pas bleu)
- Titre en font-medium, description en text-muted-foreground text-sm
- Hover : bordure primary subtile, léger shadow
- Toute la carte est cliquable

### Fichiers supprimés

- `src/components/admin/EmailSettingsTopbar.tsx` -- plus nécessaire (AdminLayout fournit la topbar)

### Aucune modification de route

Les routes dans `App.tsx` restent inchangées.

