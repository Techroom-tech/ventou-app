

# Plan : Configuration SMTP reelle avec base de donnees

## Constat actuel

Le projet utilise Supabase avec des credentials hardcodes dans `src/integrations/supabase/client.ts` (projet `chpplckgndznakuvcqbx`). Il n'y a pas d'integration Supabase native connectee via Lovable, donc je ne peux pas executer de migrations SQL automatiquement.

La page `AdminEmailProviderConfig.tsx` existe deja avec le bon layout (breadcrumb, Jump To, formulaire SMTP avec les 6 champs, toggles, boutons). Le hook `useEmailProviders.ts` et l'edge function `send-email/index.ts` sont aussi en place.

## Ce qui manque

1. **Schema de base de donnees** : La table `email_providers` doit avoir les bonnes colonnes (dont `email_notification_enabled`, `email_verification_enabled`, `encrypted_config` pour stocker les credentials chiffres)
2. **Edge function SMTP fonctionnelle** : L'envoi SMTP reel depuis Deno edge functions (pas de TCP brut disponible, donc on utilise une edge function dediee `smtp-relay` avec le module `npm:nodemailer` qui fonctionne dans Deno)
3. **Chiffrement AES-256** des credentials sensibles cote edge function
4. **Edge function test-email** dediee pour le bouton Test Mail

## Plan d'implementation

### Etape 1 : SQL a executer dans Supabase Dashboard

Vous devrez executer ce SQL dans votre Supabase SQL Editor (`https://supabase.com/dashboard/project/chpplckgndznakuvcqbx/sql`) :

```sql
-- Table email_providers (si elle n'existe pas deja)
CREATE TABLE IF NOT EXISTS email_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    encrypted_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT FALSE,
    email_notification_enabled BOOLEAN DEFAULT TRUE,
    email_verification_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajout des colonnes si la table existe deja
ALTER TABLE email_providers
  ADD COLUMN IF NOT EXISTS email_notification_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_verification_enabled BOOLEAN DEFAULT FALSE;

-- RLS
ALTER TABLE email_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admin full access on email_providers"
  ON email_providers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Table rate limits (si pas deja creee)
CREATE TABLE IF NOT EXISTS email_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW()
);
```

### Etape 2 : Secret ENCRYPTION_KEY dans Supabase

Pour le chiffrement AES-256 des mots de passe et API keys, il faut un secret `ENCRYPTION_KEY` (32 bytes hex = 64 caracteres).

Generer avec : `openssl rand -hex 32`

Puis l'ajouter dans Supabase Dashboard > Project Settings > Edge Functions > Secrets.

### Etape 3 : Nouvelle edge function `smtp-relay`

Creer `supabase/functions/smtp-relay/index.ts` - une edge function dediee qui :
- Recoit les parametres SMTP (host, port, username, password) + email details
- Utilise `npm:nodemailer` (compatible Deno) pour envoyer le mail via SMTP reel
- Authentifie l'appelant (JWT admin uniquement)
- Dechiffre le mot de passe avec AES-256
- Retourne succes/erreur

### Etape 4 : Mise a jour `send-email/index.ts`

Modifier `sendViaSMTP` pour appeler la nouvelle edge function `smtp-relay` au lieu d'un relay HTTP externe, en lui passant les credentials SMTP dechiffres.

### Etape 5 : Mise a jour `useEmailProviders.ts`

Le hook doit chiffrer les credentials sensibles AVANT de les envoyer a Supabase. Cependant, le chiffrement AES cote client n'est pas securise (la cle serait exposee). A la place, on cree une edge function `encrypt-config` qui recoit les credentials en clair et les chiffre cote serveur avant insertion en base.

### Etape 6 : Edge function `encrypt-config`

`supabase/functions/encrypt-config/index.ts` :
- Recoit `{ provider_id, config }` avec les credentials en clair
- Chiffre chaque valeur sensible avec AES-256 (password, api_key, etc.)
- Met a jour `encrypted_config` dans la table `email_providers`
- Admin only (JWT)

### Etape 7 : Mise a jour `AdminEmailProviderConfig.tsx`

Modifier `handleSave` pour :
1. D'abord sauvegarder les champs non-sensibles (sender_email, toggles) via Supabase direct
2. Puis appeler l'edge function `encrypt-config` pour les credentials sensibles
3. Le bouton Test Mail appelle `smtp-relay` directement pour tester

### Etape 8 : Mise a jour `sendPlatformEmail.ts`

Ajouter un mode "test direct" qui appelle `smtp-relay` avec les credentials SMTP pour le bouton Test Mail.

## Resume des fichiers modifies/crees

| Fichier | Action |
|---------|--------|
| `supabase/functions/smtp-relay/index.ts` | Nouveau - envoi SMTP reel via Nodemailer |
| `supabase/functions/encrypt-config/index.ts` | Nouveau - chiffrement AES cote serveur |
| `supabase/functions/send-email/index.ts` | Modifie - `sendViaSMTP` appelle `smtp-relay` |
| `supabase/config.toml` | Modifie - ajout des 2 nouvelles functions |
| `src/hooks/useEmailProviders.ts` | Modifie - sauvegarde via edge function pour les secrets |
| `src/pages/admin/AdminEmailProviderConfig.tsx` | Modifie - handleSave et handleTest utilisent les edge functions |
| `src/lib/sendPlatformEmail.ts` | Modifie - ajout mode test SMTP |

## Action requise de votre part

Avant que je puisse implementer, vous devez executer le SQL ci-dessus dans votre Supabase Dashboard et ajouter le secret `ENCRYPTION_KEY`. Confirmez quand c'est fait et je procede a l'implementation.

