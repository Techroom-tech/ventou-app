# Systeme Email Production-Ready pour Ventou

## Apercu

Mise en place d'un systeme email complet et securise pour la plateforme Ventou : base de donnees, edge function d'envoi, moteur de templates, et interface d'administration Super Admin.

---

## Phase 1 -- Base de donnees (3 migrations)

### Migration 1 : Tables email

- **email_providers** : stocke les fournisseurs (smtp, sendgrid, mailersend, resend) avec config JSON chiffree, un seul actif a la fois
- **email_templates** : templates avec slug unique, sujet, corps HTML, toggle actif/inactif
- **platform_settings** : cles/valeurs globales (site_name, logo_url, support_email)

### Migration 2 : RLS stricte

- `email_providers` : lecture/ecriture uniquement pour `super_admin` via `has_role()`
- `email_templates` : lecture pour tous les admins, ecriture pour `super_admin`
- `platform_settings` : lecture pour tous les admins, ecriture pour `super_admin`

### Migration 3 : Seed des templates et settings

Insertion des 7 templates par defaut :

- `welcome_vendor`
- `email_verification`
- `vendor_subscription_expiring_7_days`
- `vendor_subscription_expiring_1_day`
- `vendor_subscription_expired`
- `store_suspended`
- `report_warning`

Insertion des settings par defaut :

- `site_name` = "Ventou"
- `logo_url` = null
- `support_email` = "[support@ventou.shop](mailto:support@ventou.ci)"

---

## Phase 2 -- Edge Function `send-email`

Fichier : `supabase/functions/send-email/index.ts`

### Fonctionnement

1. Recoit en POST : `{ slug, variables, to }`
2. Valide l'authentification (token JWT requis + role admin OU appel interne service_role)
3. Charge le provider actif depuis `email_providers`
4. Charge le template par slug depuis `email_templates`
5. Remplace les variables `{{variable}}` dans le sujet et le corps
6. Enveloppe le corps dans le master layout HTML (style BoosterBF)
7. Envoie selon le driver :
  - **smtp** : via `fetch` vers un serveur SMTP (pas nodemailer car indisponible en Deno -- utilisation de l'API Deno native ou d'un wrapper HTTP)
  - **sendgrid** : API REST SendGrid
  - **mailersend** : API REST MailerSend  
  - **resend** : API REST Resend
8. Retourne `{ success: true }` ou `{ error: "..." }`

### Securite

- Les credentials restent cote serveur uniquement
- Le config JSON du provider n'est jamais expose au frontend
- Validation de l'authentification dans la fonction

---

## Phase 3 -- Moteur de templates

Implemente dans l'edge function :

- Remplacement regex de `{{variable}}` par les valeurs fournies
- Variables manquantes remplacees par chaine vide
- Variables systeme auto-injectees : `{{year}}`, `{{site_name}}`, `{{logo_url}}`

---

## Phase 4 -- Master Layout Email

Template HTML inline (compatible tous clients email) :

- Header sombre avec logo
- Corps blanc avec padding genereux
- Footer gris avec copyright dynamique
- Police Inter/Arial, border-radius 10px
- Style professionnel moderne

---

## Phase 5 -- Interface Admin

### Nouveau fichier : `src/pages/admin/AdminEmailSettings.tsx`

Accessible depuis `/admin/settings/email`, protege par `AdminGuard role="super_admin"`.

**Onglet "Fournisseurs"** :

- Liste des providers configures
- Formulaire d'ajout/edition (driver, nom, config JSON structure)
- Bouton "Activer" (desactive automatiquement les autres)
- Bouton "Tester" (envoie un email de test via l'edge function)
- Badge vert sur le provider actif

**Onglet "Templates"** :

- Liste des templates avec slug, nom, statut actif
- Edition inline du sujet et du corps (textarea HTML ou editeur enrichi)
- Toggle actif/inactif
- Apercu du rendu final avec le master layout

### Hooks associes

- `src/hooks/useEmailProviders.ts` : CRUD providers (sans exposer config en lecture)
- `src/hooks/useEmailTemplates.ts` : CRUD templates
- `src/hooks/usePlatformSettings.ts` : lecture/ecriture settings

### Route

Ajout dans `App.tsx` :

```
/admin/settings/email -> AdminEmailSettings
```

---

## Phase 6 -- Utilitaire Frontend

### Nouveau fichier : `src/lib/sendPlatformEmail.ts`

```text
sendPlatformEmail(slug, variables, recipientEmail)
  -> appelle supabase.functions.invoke('send-email', { slug, variables, to })
```

Utilisable depuis n'importe quel composant authentifie (admin).

---

## Phase 7 -- Nettoyage

- Supprimer la reference `create-admin-user` dans `supabase/config.toml`
- Aucun template lie au solde, wallet, ou KYC
- Aucune logique d'envoi email simulee ou mockee

---

## Details techniques

### Fichiers crees


| Fichier                                  | Role                                     |
| ---------------------------------------- | ---------------------------------------- |
| `supabase/functions/send-email/index.ts` | Edge function d'envoi multi-provider     |
| `src/pages/admin/AdminEmailSettings.tsx` | Page admin email (providers + templates) |
| `src/hooks/useEmailProviders.ts`         | Hook CRUD providers                      |
| `src/hooks/useEmailTemplates.ts`         | Hook CRUD templates                      |
| `src/hooks/usePlatformSettings.ts`       | Hook settings plateforme                 |
| `src/lib/sendPlatformEmail.ts`           | Utilitaire d'envoi                       |


### Fichiers modifies


| Fichier                             | Modification                                             |
| ----------------------------------- | -------------------------------------------------------- |
| `src/App.tsx`                       | Ajout route `/admin/settings/email`                      |
| `supabase/config.toml`              | Ajout `send-email`, suppression `create-admin-user`      |
| `src/pages/admin/AdminSettings.tsx` | Lien vers la sous-page email dans la carte Notifications |


### Migrations Supabase

3 migrations pour : tables + RLS + seed data