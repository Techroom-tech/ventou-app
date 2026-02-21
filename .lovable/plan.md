

# Module Email Enterprise Ventou -- Refonte Complete

## Resume

Refonte totale du systeme email existant pour atteindre un niveau enterprise (BoosterBF/Shopify). Le systeme actuel a une base fonctionnelle (providers, templates, edge function) mais manque : logs, rate limiting, preferences utilisateur, domain authentication, providers additionnels (Mailgun, Postmark, SES, Sendinblue, Mailchimp), traductions multi-langues, et une interface admin complete avec sous-pages.

---

## Ce qui existe deja

- 3 tables : `email_providers`, `email_templates`, `platform_settings` (a migrer par SQL)
- Edge function `send-email` avec 4 drivers (SendGrid, Resend, MailerSend, SMTP)
- Page admin basique avec onglets Fournisseurs/Templates
- Hooks : `useEmailProviders`, `useEmailTemplates`, `usePlatformSettings`
- Utilitaire `sendPlatformEmail`

## Ce qui doit etre ajoute/modifie

---

## Phase 1 -- SQL a executer dans Supabase SQL Editor

Un seul script SQL qui :

### 1.1 Modifie `email_providers`
- Etend le CHECK sur `driver` pour inclure : `mailchimp`, `mailgun`, `postmark`, `sendinblue`, `ses`
- Ajoute colonnes `sender_email text NOT NULL DEFAULT ''` et `sender_name text`
- Renomme `config` en `encrypted_config` (ou ajoute un alias)

### 1.2 Modifie `email_templates`
- Ajoute colonne `multi_lang_enabled boolean DEFAULT false`

### 1.3 Cree `email_template_translations`
- `id`, `template_id` (FK -> email_templates ON DELETE CASCADE), `locale text`, `subject`, `body`
- RLS : lecture admins, ecriture super_admin

### 1.4 Cree `email_logs`
- `id`, `recipient`, `template_slug`, `provider`, `status` (CHECK: success/failed/blocked/user_disabled), `error_message`, `user_id`, `ip_address`, `created_at`
- RLS : lecture/insert admins, lecture super_admin pour tout

### 1.5 Cree `email_rate_limits`
- `id`, `user_id uuid`, `count integer DEFAULT 0`, `window_start timestamptz DEFAULT now()`
- RLS : accessible uniquement via service_role (pas de politique publique)

### 1.6 Cree `user_notification_settings`
- `user_id uuid PRIMARY KEY`, `order_emails boolean DEFAULT true`, `subscription_alerts boolean DEFAULT true`, `marketing_updates boolean DEFAULT false`, `admin_alerts boolean DEFAULT true`, `created_at timestamptz DEFAULT now()`
- RLS : chaque user peut lire/ecrire ses propres settings, admins lisent tout

### 1.7 Cree `email_domain_authentication`
- `id`, `domain text UNIQUE`, `spf_record text`, `dkim_record text`, `verification_status text DEFAULT 'pending'`, `created_at`
- RLS : super_admin uniquement

### 1.8 Seed des 28 templates
Remplace les 7 templates existants et ajoute les manquants :
- AUTH : `email_verification`, `password_reset`, `two_factor_code`, `account_approved`, `account_suspended`
- STORE : `welcome_vendor`, `store_created`, `store_approved`, `store_rejected`, `store_suspended`, `store_reactivated`
- ORDERS : `new_order_vendor`, `order_confirmation_customer`, `order_cancelled`, `order_refunded`, `order_shipped`, `order_delivered`
- SUBSCRIPTIONS : `subscription_activated`, `subscription_expiring_7_days`, `subscription_expiring_1_day`, `subscription_expired`, `plan_upgraded`, `plan_downgraded`
- ADMIN : `vendor_report_warning`, `manual_admin_action`, `payment_failed`, `payment_success`

---

## Phase 2 -- Edge Function `send-email` (refonte)

Fichier : `supabase/functions/send-email/index.ts`

### Modifications majeures :

1. **4 nouveaux drivers** :
   - `mailgun` : API REST `api.mailgun.net/v3/{domain}/messages`
   - `postmark` : API REST `api.postmarkapp.com/email`
   - `sendinblue` : API REST `api.brevo.com/v3/smtp/email`
   - `ses` : AWS SES via fetch (SigV4 signature)
   - `mailchimp` : API Transactional Mandrill `mandrillapp.com/api/1.0/messages/send`

2. **Rate limiting** :
   - Avant envoi, verifier `email_rate_limits` pour l'utilisateur
   - 5 emails/min par user, 200 emails/h global
   - Si depasse : retourner erreur + logger comme `blocked`

3. **User notification preferences** :
   - Charger `user_notification_settings` pour le destinataire (si `user_id` fourni)
   - Si le type d'email est desactive, ne pas envoyer + logger comme `user_disabled`

4. **Logging** :
   - Apres chaque tentative, INSERT dans `email_logs` avec : recipient, template_slug, provider, status, error_message, user_id, ip_address

5. **Multi-langue** :
   - Si template a `multi_lang_enabled = true` et `locale` fourni dans les variables
   - Charger la traduction depuis `email_template_translations`
   - Fallback sur le template par defaut si aucune traduction

6. **Sender email/name depuis provider** :
   - Utiliser `sender_email` et `sender_name` du provider au lieu du config JSON

7. **Mapping template slug -> notification type** :
   - Pour savoir quel toggle verifier dans `user_notification_settings`

---

## Phase 3 -- Interface Admin (refonte complete)

### 3.1 Page principale `/admin/settings/email`

Landing page avec 3 cartes cliquables :
- **Configuration Email** -> `/admin/settings/email/providers`
- **Templates par defaut** -> `/admin/settings/email/default-template`
- **Templates Email** -> `/admin/settings/email/templates`
- **Logs Email** -> `/admin/settings/email/logs`
- **Authentification Domaine** -> `/admin/settings/email/domains`

Breadcrumb : Dashboard / Settings / Email

### 3.2 Page Providers `/admin/settings/email/providers`

Table avec colonnes : SL, Methode Email, Statut, Action
- Tous les 8 providers pre-listes
- Clic sur "Configurer" ouvre la page de config du provider
- "Set as Default" desactive les autres automatiquement

### 3.3 Page Config Provider `/admin/settings/email/providers/:driver`

Formulaire specifique par driver :
- **SMTP** : Host, Port, Encryption (TLS/SSL), Username, Password
- **SendGrid** : API Key
- **Resend** : API Key
- **MailerSend** : API Key
- **Mailgun** : API Key, Domain
- **Postmark** : Server Token
- **Sendinblue/Brevo** : API Key
- **SES** : Access Key, Secret Key, Region
- **Mailchimp/Mandrill** : API Key

Champs communs : Sender Email, Sender Name
Boutons : Save, Test Mail (envoi reel)
Toggles : Email Notification, Email Verification

### 3.4 Page Default Template `/admin/settings/email/default-template`

Formulaire :
- From Email, From Name
- Header HTML (textarea)
- Footer HTML (textarea)
- Shortcodes disponibles affiches
- Bouton Save

### 3.5 Page Templates `/admin/settings/email/templates`

Liste groupee par categorie (Auth, Store, Orders, Subscriptions, Admin)
Chaque template :
- Toggle actif/inactif
- Subject, From Email, From Name
- Multi-lang toggle
- Corps HTML (WYSIWYG ou textarea)
- Apercu avec master layout
- Bouton Save

### 3.6 Page Logs `/admin/settings/email/logs`

Table avec colonnes : Date, Recipient, Template, Provider, Status, Error, IP
- Filtres par statut et date
- Pagination
- Badge couleur par statut (vert=success, rouge=failed, jaune=blocked, gris=user_disabled)

### 3.7 Page Domains `/admin/settings/email/domains`

- Input domaine
- Boutons : Generer SPF, Generer DKIM, Verifier
- Affichage des records DNS a copier
- Badge statut (pending/verified/failed)

---

## Phase 4 -- Hooks nouveaux/modifies

| Hook | Role |
|------|------|
| `useEmailProviders.ts` | Refonte : support 8 drivers, sender_email/name |
| `useEmailTemplates.ts` | Ajouter multi_lang, traductions |
| `useEmailLogs.ts` | NOUVEAU : lecture paginee des logs |
| `useEmailRateLimits.ts` | NOUVEAU : lecture stats rate limits |
| `useUserNotificationSettings.ts` | NOUVEAU : CRUD preferences user |
| `useEmailDomains.ts` | NOUVEAU : CRUD domain authentication |

---

## Phase 5 -- Routes

Nouvelles routes dans `App.tsx` :

```text
/admin/settings/email                -> AdminEmailHub (landing)
/admin/settings/email/providers      -> AdminEmailProviders (table)
/admin/settings/email/providers/:driver -> AdminEmailProviderConfig
/admin/settings/email/default-template -> AdminEmailDefaultTemplate
/admin/settings/email/templates      -> AdminEmailTemplates
/admin/settings/email/logs           -> AdminEmailLogs
/admin/settings/email/domains        -> AdminEmailDomains
```

Toutes protegees par `ProtectedRoute fallback="notfound" > AdminGuard role="super_admin"`.

---

## Phase 6 -- Securite

- `encrypted_config` jamais dans les SELECT frontend (deja en place)
- RLS stricte super_admin sur providers, domains
- RLS user-scoped sur `user_notification_settings`
- Rate limiting cote serveur dans l'edge function
- Anti-SSRF avec allowlist de domaines API (deja en place, etendu)
- Anti-XSS : sanitisation des variables (deja en place)
- JWT verification via `getClaims()` (deja en place)
- Audit log sur : changement provider, update credentials, modification template
- Aucun envoi email cote frontend (tout via edge function)

---

## Phase 7 -- Nettoyage

- Supprimer toute logique mock
- Supprimer les placeholders SMTP HTTP relay
- S'assurer qu'aucun credential n'est hardcode

---

## Fichiers crees

| Fichier | Role |
|---------|------|
| `src/pages/admin/AdminEmailHub.tsx` | Landing page email avec cartes |
| `src/pages/admin/AdminEmailProviders.tsx` | Table des providers |
| `src/pages/admin/AdminEmailProviderConfig.tsx` | Config par driver |
| `src/pages/admin/AdminEmailDefaultTemplate.tsx` | Wrapper/layout template |
| `src/pages/admin/AdminEmailTemplates.tsx` | Liste templates groupees |
| `src/pages/admin/AdminEmailLogs.tsx` | Table logs email |
| `src/pages/admin/AdminEmailDomains.tsx` | Domain DKIM/SPF |
| `src/hooks/useEmailLogs.ts` | Hook logs |
| `src/hooks/useUserNotificationSettings.ts` | Hook preferences user |
| `src/hooks/useEmailDomains.ts` | Hook domains |

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/send-email/index.ts` | Refonte : 8 drivers, rate limit, logs, preferences, multi-lang |
| `src/hooks/useEmailProviders.ts` | Support 8 drivers, sender_email/name |
| `src/hooks/useEmailTemplates.ts` | Multi-lang, traductions |
| `src/pages/admin/AdminEmailSettings.tsx` | Renomme/remplace par AdminEmailHub |
| `src/App.tsx` | Ajout 6 nouvelles routes |
| `src/lib/sendPlatformEmail.ts` | Ajout support user_id et locale |

## SQL a executer

1 seul script SQL fourni pour creer les nouvelles tables, modifier les existantes, et seeder les 28 templates.

