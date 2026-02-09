

# Creer Ma Boutique - Page d'onboarding vendeur

## Objectif
Creer une page complete "/dashboard/create-shop" permettant a un vendeur de configurer sa boutique en un seul formulaire avec sections distinctes, connectee au backend Supabase (tables, stockage, RLS).

---

## 1. Backend Supabase - Migrations

### Table `shops`
```sql
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  city TEXT,
  country TEXT DEFAULT 'Ivory Coast',
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#1E3A5F',
  whatsapp TEXT,
  currency TEXT DEFAULT 'XOF',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
```

### Politiques RLS
- SELECT : le proprietaire peut lire sa boutique
- INSERT : un utilisateur authentifie peut creer une boutique avec `owner_id = auth.uid()`
- UPDATE : le proprietaire peut modifier sa boutique

### Bucket de stockage `shop-assets`
- Bucket public pour logos et bannieres
- Politique : upload/update/delete reserves au proprietaire du shop

---

## 2. Edge Function - Verification du slug

Creer une edge function `check-slug` qui verifie la disponibilite d'un slug et suggere des alternatives si pris.

- Input : `{ slug: string }`
- Output : `{ available: boolean, suggestions: string[] }`
- Pas besoin d'authentification pour cette verification

---

## 3. Page `CreateShop.tsx`

### Structure en sections (formulaire unique, pas de stepper multi-page)
Inspiree des screenshots fournis, avec un layout desktop sidebar + formulaire principal :

**Section 1 - Informations de base**
- Nom de la boutique (requis)
- Categorie (dropdown avec options predefinies)
- Pays (auto-detecte, editable)
- Ville

**Section 2 - Branding**
- Upload logo (avec apercu circulaire, bouton "Changer")
- Upload banniere (apercu rectangulaire)
- Selecteur couleur primaire (palette de cercles + input hex)

**Section 3 - Contact**
- Numero WhatsApp (format international avec prefixe pays)
- Note explicative : "Les clients pourront vous contacter via WhatsApp"

**Section 4 - URL de la boutique**
- Slug genere automatiquement depuis le nom
- Verification de disponibilite en temps reel (appel edge function)
- Affichage : `{slug}.ventou.shop`
- Si indisponible : suggestions alternatives cliquables
- Indicateur vert/rouge de disponibilite

**Apercu en direct (sidebar droite sur desktop, bottom sheet sur mobile)**
- Montre logo, banniere, nom, couleur primaire, bouton WhatsApp
- Se met a jour en temps reel au fur et a mesure que l'utilisateur remplit

**Action finale**
- Bouton CTA orange : "Creer Ma Boutique"
- On submit :
  1. Upload logo et banniere vers le bucket `shop-assets`
  2. Insert dans la table `shops`
  3. Redirection vers `/dashboard`

---

## 4. Routing et navigation

- Ajouter route `/dashboard/create-shop` dans `App.tsx`
- Ajouter un lien dans la sidebar du dashboard (ou rediriger automatiquement si l'utilisateur n'a pas encore de shop)

---

## 5. Traductions

Ajouter les cles i18n dans `fr.json` et `en.json` pour :
- Tous les labels du formulaire
- Messages de validation
- Textes d'aide et pro-tips
- Indicateurs de disponibilite du slug

---

## 6. Fichiers concernes

| Action | Fichier |
|--------|---------|
| Creer | Migration SQL (table shops + RLS + bucket) |
| Creer | `supabase/functions/check-slug/index.ts` |
| Creer | `src/pages/CreateShop.tsx` |
| Modifier | `src/App.tsx` (nouvelle route) |
| Modifier | `src/components/dashboard/DashboardSidebar.tsx` (lien navigation) |
| Modifier | `src/i18n/locales/fr.json` (traductions) |
| Modifier | `src/i18n/locales/en.json` (traductions) |
| Modifier | `src/types/shop.ts` (ajouter champs category, city, country, etc.) |

---

## Section technique

- Les images (logo, banniere) sont stockees dans le bucket Supabase `shop-assets` sous le chemin `{shop_id}/logo` et `{shop_id}/banner`
- Le slug est genere cote client avec `name.toLowerCase().normalize('NFD').replace(...)` puis valide cote serveur
- La verification du slug utilise une edge function pour eviter d'exposer un acces SELECT public sur la table shops
- Le formulaire utilise `react-hook-form` + `zod` pour la validation client
- Le layout utilise le `DashboardLayout` existant avec la sidebar

