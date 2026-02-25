

# Refonte AdminEmailProviderConfig -- Layouts fidèles aux maquettes

## Analyse des maquettes

**Image 1 (SMTP)** : Layout 2 colonnes avec Jump To a gauche. A droite, une carte "SMTP Configuration" avec badge "Default" vert + bouton "Test Mail" en haut a droite. Champs en grille 2 colonnes : Sender Email / Email Method (readonly), Mail Host / Mail Port, Mail Username / Mail Password (avec eye toggle). Puis 2 toggles (Email Notification, Email Verification) avec descriptions. Bouton "Save changes" bleu en bas.

**Image 2 (API providers)** : Carte similaire mais avec le nom du provider (ex: "Mailchimp Configuration") + bouton "Set As Default" vert en haut a droite. Champs : Sender Email / Email Method (readonly), API Key (avec eye toggle). Memes toggles. Bouton "Save changes" bleu.

## Ecart avec le code actuel

Le fichier `AdminEmailProviderConfig.tsx` actuel :
- N'utilise PAS le layout 2 colonnes avec Jump To
- N'a pas de breadcrumb
- SMTP a les mauvais champs (http_relay_url au lieu de host/port/username/password)
- Pas de badge "Default" ni bouton "Set As Default"
- Pas de toggles Email Notification / Email Verification
- Pas de grille 2 colonnes pour les champs

Le backend (`send-email/index.ts`) traite SMTP via un `http_relay_url` relay, pas en connexion SMTP directe. Deno edge functions ne supportent pas de connexion TCP brute (pas de Nodemailer). Pour un vrai SMTP fonctionnel, il faut une edge function dediee qui utilise un relay HTTP SMTP.

## Plan d'implementation

### Fichier 1 : `src/pages/admin/AdminEmailProviderConfig.tsx` (reecrit)

Structure identique aux maquettes :
- `AdminLayout` + breadcrumb "Dashboard / Settings / Email Configuration"
- Grid 2 colonnes : `EmailJumpToMenu` a gauche, carte config a droite
- Active path detection dans le Jump To : highlight "Email Configuration"

**Carte header** :
- Titre : `{Driver} Configuration` (ex: "SMTP Configuration", "Mailchimp Configuration")
- Si provider actif/default : badge vert "Default" a cote du titre
- Si PAS actif : bouton "Set As Default" (vert, `bg-emerald-500`) en haut a droite
- Si actif : bouton "Test Mail" en haut a droite a la place

**Formulaire SMTP** (quand `driver === 'smtp'`) -- comme Image 1 :
- Grille 2 colonnes :
  - Sender Email (input) | Email Method (input readonly = "SMTP")
  - Mail Host (input) | Mail Port (input number)
  - Mail Username (input) | Mail Password (input password avec toggle eye)
- Separator
- Toggle "Email Notification" avec description
- Toggle "Email Verification" avec description
- Bouton "Save changes" (primary)

**Formulaire API providers** (tous les autres) -- comme Image 2 :
- Grille 2 colonnes :
  - Sender Email (input) | Email Method (input readonly = driver name)
- Section API Key :
  - Label colore en primary (ex: "Mailchimp Api Key")
  - Input password avec toggle eye
- Pour Mailgun : champ "Domain" supplementaire
- Pour SES : champs Access Key, Secret Key, Region
- Pour Postmark : "Server Token" au lieu de "API Key"
- Separator
- Memes toggles
- Bouton "Save changes"

**Logique** :
- `handleSave` : sauvegarde config + sender_email + toggles (email_notification_enabled, email_verification_enabled) en base via `useEmailProviders.updateProvider/createProvider`
- `handleSetDefault` : appelle `activateProvider` pour rendre ce provider actif
- `handleTest` : appelle `sendPlatformEmail` pour envoyer un email test
- Eye toggle pour les champs password : state local `showPassword` par champ

### Fichier 2 : `src/hooks/useEmailProviders.ts` (mise a jour)

Ajouter les champs `email_notification_enabled` et `email_verification_enabled` a l'interface `EmailProvider` et au select query. Mettre a jour `createProvider` et `updateProvider` pour supporter ces champs.

### Fichier 3 : `supabase/functions/send-email/index.ts` (SMTP config)

Mise a jour du `DRIVER_CONFIG` pour SMTP : les champs backend restent `http_relay_url` (car Deno ne supporte pas TCP/Nodemailer), mais le frontend stocke `host`, `port`, `username`, `password` dans `encrypted_config`. L'edge function construira l'URL relay ou utilisera ces champs si un relay SMTP-to-HTTP est configure.

> Note technique : Deno edge functions ne peuvent pas ouvrir de connexions TCP brutes. Le vrai envoi SMTP necessite un service intermediaire (relay HTTP-to-SMTP). Le formulaire collecte les vrais parametres SMTP (host, port, username, password) et les stocke. L'edge function les transmet a un relay configurable.

### Pas de modification de routes

La route `/admin/settings/email/providers/:driver` existe deja dans `App.tsx`.

## Details techniques

### Structure du formulaire SMTP (Image 1)
```text
+--------------------------------------------------+
| SMTP Configuration  ● Default     [Test Mail]    |
+--------------------------------------------------+
| Sender Email          | Email Method             |
| [input]               | [SMTP] (readonly)        |
|                       |                          |
| Mail Host             | Mail Port                |
| [input]               | [input number]           |
|                       |                          |
| Mail Username         | Mail Password            |
| [input]               | [input password] 👁      |
+--------------------------------------------------+
| Email Notification                        [toggle]|
| description text                                  |
+--------------------------------------------------+
| Email Verification                        [toggle]|
| description text                                  |
+--------------------------------------------------+
| [Save changes]                                    |
+--------------------------------------------------+
```

### Structure des providers API (Image 2)
```text
+--------------------------------------------------+
| Mailchimp Configuration       [Set As Default]   |
+--------------------------------------------------+
| Sender Email          | Email Method             |
| [input]               | [mailchimp] (readonly)   |
|                       |                          |
| Mailchimp Api Key                                |
| [input password] 👁                               |
+--------------------------------------------------+
| Email Notification                        [toggle]|
| description text                                  |
+--------------------------------------------------+
| Email Verification                        [toggle]|
| description text                                  |
+--------------------------------------------------+
| [Save changes]                                    |
+--------------------------------------------------+
```

