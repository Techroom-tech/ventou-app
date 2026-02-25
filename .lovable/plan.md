

# Refonte AdminEmailProviders -- Email Configuration SaaS

## Analyse

La page actuelle `AdminEmailProviders.tsx` utilise `AdminLayout` (sidebar + header). L'utilisateur veut la transformer en page avec :
- AdminLayout conserve (sidebar visible)
- Breadcrumb sous le header
- Layout 2 colonnes : "Jump To" a gauche + table a droite
- Table avec 8 providers (Mailchimp, Mailersend, Mailgun, Postmark, Sendgrid, Sendinblue, SES, SMTP)
- Status badges (Active/Inactive) avec couleurs semantiques
- Bouton Edit avec dropdown
- Tout themise via les tokens Tailwind existants

Les variables CSS demandees correspondent aux tokens Tailwind deja en place (`primary`, `background`, `card`, `foreground`, `muted-foreground`, `border`, `destructive` pour danger, `ventou-success` pour success).

## Plan d'implementation

### Fichier 1 : `src/components/admin/EmailJumpToMenu.tsx` (NOUVEAU)

Composant sidebar de navigation "Jump To" :
- Card avec `bg-card border rounded-xl p-5`
- Titre "Jump To" en `font-semibold`
- 3 liens : Email Configuration (actif), Default Templates, Email Templates
- Chaque lien avec icone Lucide (Server, LayoutTemplate, FileText)
- Item actif : `bg-primary/10 text-primary border-l-[3px] border-primary`
- Items inactifs : `text-muted-foreground hover:bg-muted`
- Navigation via `useNavigate`

### Fichier 2 : `src/pages/admin/AdminEmailProviders.tsx` (REECRIT)

Structure :
- `AdminLayout` conserve
- Breadcrumb texte : "Dashboard / Settings / Email Configuration"
- Titre "Email Configuration" en `text-xl font-semibold`
- Grid 2 colonnes : `grid-cols-1 lg:grid-cols-[280px_1fr] gap-6`
- Gauche : `EmailJumpToMenu`
- Droite : Card avec table

Table :
- 4 colonnes : SL | Email Method | Status | Action
- 8 lignes exactes : Mailchimp, Mailersend, Mailgun, Postmark, Sendgrid, Sendinblue, SES, SMTP
- Status badges :
  - Active : `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400` (arrondi pill)
  - Inactive : `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400` (arrondi pill)
- Bouton Edit : `variant="outline"` avec icone Pencil + ChevronDown, navigue vers `/admin/settings/email/providers/{driver}`
- Loading state avec `Loader2` spinner
- Hover sur les lignes : `hover:bg-primary/5`

### Aucune modification de route

La route `/admin/settings/email/providers` pointe deja vers `AdminEmailProviders`. Rien a changer dans `App.tsx`.

### Aucune nouvelle variable CSS

Tous les tokens Tailwind existants couvrent les besoins. Le dark mode est automatique.

