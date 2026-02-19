
# Paramètres V6 — Système de configuration multi-boutique complet

## État actuel

La page `/dashboard/settings` est une simple page avec 3 toggles (COD, WhatsApp, frais de livraison). Elle utilise uniquement la table `delivery_settings`.

L'objectif est de la remplacer par un **système de paramètres SaaS complet** avec :
- Une page d'index `/dashboard/parametres` avec des cartes de navigation par section
- 14 sous-pages dédiées, chacune avec son propre formulaire Supabase
- Nouvelles tables DB à créer via migration

---

## Architecture globale

```text
/dashboard/parametres              ← Hub de navigation (cartes sectionnées)
├── /identite                      ← Infos boutique (nom, description, logo, pays)
├── /domaine                       ← Sous-domaine & URL publique
├── /apparence                     ← Couleur, logo, bannière
├── /livraison                     ← Frais, zones, délais
├── /paiement                      ← COD, WhatsApp, numéro
├── /codes-promo                   ← Gestion des codes de réduction
├── /seo                           ← Meta titre, description, OG image
├── /pixels                        ← Facebook Pixel, TikTok, GTM
├── /notifications                 ← Email, Telegram
├── /support                       ← Contact, FAQ, email support
├── /profil                        ← Nom, email, avatar vendeur
├── /equipe                        ← (prévu — coming soon)
├── /facturation                   ← (prévu — coming soon)
└── /api                           ← Clé API publique (lecture seule)
```

---

## Migrations SQL requises

4 nouvelles tables à créer + colonnes manquantes sur `shops` :

**1. Colonnes manquantes sur `shops`** (la table existe déjà)
```sql
alter table shops add column if not exists theme_color text;
alter table shops add column if not exists description text;
alter table shops add column if not exists country text default 'BF';
```
Note : `logo_url` et `subdomain` existent déjà dans le type `Shop`.

**2. Table `payment_settings`** (nouvelle — la livraison est dans `delivery_settings`)
```sql
create table if not exists payment_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade unique,
  cod_enabled boolean default true,
  whatsapp_enabled boolean default true,
  whatsapp_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table payment_settings enable row level security;
create policy "owner_all_payment_settings" on payment_settings
  using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
```

**3. Table `discount_codes`** (nouvelle)
```sql
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  code text not null,
  type text not null default 'percentage',
  value numeric not null default 0,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table discount_codes enable row level security;
create policy "owner_all_discount_codes" on discount_codes
  using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
```

**4. Table `tracking_settings`** (nouvelle)
```sql
create table if not exists tracking_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade unique,
  facebook_pixel text,
  tiktok_pixel text,
  gtm_id text,
  custom_scripts text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tracking_settings enable row level security;
create policy "owner_all_tracking" on tracking_settings
  using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
```

**5. Table `notification_settings`** (nouvelle)
```sql
create table if not exists notification_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade unique,
  email_orders boolean default true,
  email_cancel boolean default true,
  telegram_bot text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notification_settings enable row level security;
create policy "owner_all_notif_settings" on notification_settings
  using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
```

---

## Fichiers à créer / modifier

### Pages (toutes nouvelles dans `src/pages/settings/`)

| Fichier | Contenu |
|---|---|
| `src/pages/settings/SettingsHub.tsx` | Page d'index — grille de cartes sectionnées |
| `src/pages/settings/SettingsIdentite.tsx` | Formulaire infos boutique |
| `src/pages/settings/SettingsDomaine.tsx` | Sous-domaine + URL publique |
| `src/pages/settings/SettingsApparence.tsx` | Couleur + logo + bannière |
| `src/pages/settings/SettingsLivraison.tsx` | Frais livraison (migre `delivery_settings`) |
| `src/pages/settings/SettingsPaiement.tsx` | COD/WhatsApp (`payment_settings`) |
| `src/pages/settings/SettingsCodesPromo.tsx` | Liste + création codes promo |
| `src/pages/settings/SettingsSeo.tsx` | Meta tags SEO (colonnes sur `shops`) |
| `src/pages/settings/SettingsPixels.tsx` | Pixels tracking (`tracking_settings`) |
| `src/pages/settings/SettingsNotifications.tsx` | Email/Telegram (`notification_settings`) |
| `src/pages/settings/SettingsSupport.tsx` | Contact email + infos support |
| `src/pages/settings/SettingsProfil.tsx` | Profil vendeur (`profiles`) |
| `src/pages/settings/SettingsEquipe.tsx` | Coming soon |
| `src/pages/settings/SettingsFacturation.tsx` | Coming soon |
| `src/pages/settings/SettingsApi.tsx` | Clé API (lecture seule) |

### Hooks (nouveaux dans `src/hooks/`)

| Fichier | Contenu |
|---|---|
| `src/hooks/usePaymentSettings.ts` | Fetch + upsert `payment_settings` |
| `src/hooks/useDiscountCodes.ts` | Fetch + create + toggle + delete `discount_codes` |
| `src/hooks/useTrackingSettings.ts` | Fetch + upsert `tracking_settings` |
| `src/hooks/useNotificationSettings.ts` | Fetch + upsert `notification_settings` |

### Composant partagé (nouveau)

`src/components/settings/SettingsPageLayout.tsx` — Layout réutilisable pour toutes les sous-pages :
- Bouton retour ← vers `/dashboard/parametres`
- Titre + description
- Contenu (children)

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/App.tsx` | Remplacement route `/dashboard/settings` par 15 routes `/dashboard/parametres/*` |
| `src/components/dashboard/DashboardSidebar.tsx` | Lien Settings → `/dashboard/parametres` |
| `src/pages/Settings.tsx` | Redirect vers `/dashboard/parametres/livraison` (ou suppression) |

---

## Design du Hub (`SettingsHub.tsx`)

Section "Boutique" :
- Identité (Store icon, orange)
- Domaine (Globe icon, blue)
- Apparence (Palette icon, purple)

Section "Vente & Livraison" :
- Livraison (Truck icon, green)
- Paiement (CreditCard icon, blue)
- Codes promo (Tag icon, pink) — badge "Nouveau"

Section "Marketing" :
- SEO (Search icon, indigo)
- Pixels (BarChart icon, orange)

Section "Communication" :
- Notifications (Bell icon, yellow)
- Support (HeadphonesIcon icon, teal)

Section "Compte" :
- Profil (User icon, blue)
- Équipe (Users icon, gray) — badge "Bientôt"
- Facturation (Receipt icon, gray) — badge "Bientôt"

Section "Développeur" :
- API (Code icon, dark)

Chaque carte :
```text
┌─────────────────────────────────┐
│  [Icon bg pastel]  Titre        │
│                    Description  │
│                              →  │
└─────────────────────────────────┘
```
- 2 colonnes desktop, 1 colonne mobile
- `cursor-pointer`, hover shadow, border light
- `ChevronRight` en bout de carte
- Navigate vers la sous-route au clic

---

## Détail de chaque sous-page

### `/identite` — Identité boutique
Formulaire sur la table `shops` (upsert par `id`) :
- Nom de la boutique (`name`)
- Description (`description`)
- Ville (`city`)
- Pays (`country`) — Select
- Catégorie (`category`) — Select
- Devise (`currency`) — Select avec CURRENCIES depuis `client.ts`
- Numéro WhatsApp boutique (`whatsapp`)
- Bouton Sauvegarder

### `/domaine` — Domaine
- Affichage lecture seule : `slug.ventou.shop`
- Champ pour modifier le slug (si la contrainte unique le permet)
- Info : "Votre boutique est accessible à cette URL"
- Bouton copier le lien
- Badge "Domaine personnalisé — Bientôt"

### `/apparence` — Apparence
Formulaire sur `shops` :
- Logo URL (`logo_url`) — champ texte (upload image prévu)
- Bannière URL (`banner_url`) — champ texte
- Couleur principale (`theme_color` ou `primary_color`) — color picker input

### `/livraison` — Livraison
Migration de l'actuel `Settings.tsx` vers `delivery_settings` (la table existe) :
- Toggle frais de livraison (`has_delivery_fee`)
- Montant des frais (`delivery_fee`)
- Livraison gratuite à partir de (`free_from`) — nouveau champ
- Délai estimé (`estimated_days`) — champ texte

### `/paiement` — Paiement
Formulaire sur `payment_settings` (nouvelle table) :
- Toggle COD (`cod_enabled`)
- Toggle WhatsApp orders (`whatsapp_enabled`)
- Numéro WhatsApp (`whatsapp_number`) — visible si toggle ON

### `/codes-promo` — Codes promo
Liste + création :
- Tableau : Code | Type | Valeur | Expiration | Utilisations | Actif | Actions
- Bouton "+ Nouveau code"
- Formulaire inline (pas de modal) ou section expandable
- Toggle activer/désactiver
- Supprimer

### `/seo` — SEO
Colonnes à ajouter sur `shops` (ou table dédiée) :
- Meta titre (`meta_title`)
- Meta description (`meta_description`)
- URL OG image

### `/pixels` — Pixels & Tracking
Formulaire sur `tracking_settings` :
- Facebook Pixel ID
- TikTok Pixel ID
- Google Tag Manager ID
- Scripts personnalisés (textarea)

### `/notifications` — Notifications
Formulaire sur `notification_settings` :
- Toggle email nouvelles commandes
- Toggle email annulations
- Telegram bot token (optionnel)

### `/support` — Support
- Email de contact affiché
- Lien vers documentation
- Bouton "Contacter Ventou"

### `/profil` — Profil
Formulaire sur `profiles` :
- Prénom, Nom
- Email (lecture seule — changement via auth)
- Avatar URL

### `/equipe`, `/facturation` — Coming Soon
Pages simples avec badge "Bientôt disponible" et description

### `/api` — API
- Affichage de la `shop_id` (utilisée comme clé publique)
- Bouton copier
- Documentation link placeholder

---

## Ordre d'implémentation

1. Migration SQL (5 tables/colonnes)
2. `src/hooks/usePaymentSettings.ts`
3. `src/hooks/useDiscountCodes.ts`
4. `src/hooks/useTrackingSettings.ts`
5. `src/hooks/useNotificationSettings.ts`
6. `src/components/settings/SettingsPageLayout.tsx` (composant partagé)
7. `src/pages/settings/SettingsHub.tsx` (page d'index)
8. Toutes les sous-pages (identite, domaine, apparence, livraison, paiement, codes-promo, seo, pixels, notifications, support, profil, equipe, facturation, api)
9. `src/App.tsx` — ajout des 15 routes
10. `src/components/dashboard/DashboardSidebar.tsx` — mise à jour du lien Settings

---

## Ce qui N'EST PAS changé

- Storefront, checkout client — inchangés
- Logique commandes, OrderDetail — inchangés
- Système d'auth, ProtectedRoute, DashboardGuard — inchangés
- `delivery_settings` existant — migré proprement (pas supprimé)
- Toutes les tables existantes — pas de suppression
