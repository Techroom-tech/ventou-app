

## Plan : Correction SMTP Test Mail + Protection Hostinger

### Problemes identifies

1. **Colonne `encrypted_config` manquante** : La table `email_providers` n'a pas de colonne `encrypted_config`. Le `smtp-relay` et `send-email` essaient de la selectionner, ce qui cause l'erreur `"column email_providers.encrypted_config does not exist"`. C'est LA cause du "Edge Function returned a non-2xx status code".

2. **Table `email_logs` manquante** : La fonction `send-email` tente d'ecrire dans `email_logs` qui n'existe pas en base. Ca bloque tout envoi via templates.

3. **Rate limiting a ajuster** : Hostinger Business Starter = 1000 messages/jour max. Le rate limit actuel (200/heure global) est correct mais le per-user (5/min) est trop bas pour les tests. Mode equilibre : 10/min par user, 500/heure global, + nouveau seuil journalier de 800 (marge de securite par rapport aux 1000 de Hostinger).

4. **Message de test** : Remplacer le contenu HTML generique anglais par "Test mail reussi avec succes" en francais.

### Modifications

**Migration SQL** :
- Ajouter la colonne `encrypted_config jsonb DEFAULT '{}'` a `email_providers`
- Creer la table `email_logs` (id, recipient, template_slug, provider, status, error_message, user_id, ip_address, created_at) avec RLS (admins read, deny public write — service_role bypasse RLS)

**`supabase/functions/smtp-relay/index.ts`** :
- Changer le HTML du test mail par defaut : `<h2>✅ Test mail réussi avec succès !</h2><p>Votre configuration SMTP fonctionne correctement.</p><p>Envoyé le : ${date}</p>`

**`supabase/functions/send-email/index.ts`** :
- Ajuster les seuils rate limit : `RATE_LIMIT_PER_USER = 10` (par minute), `RATE_LIMIT_GLOBAL = 500` (par heure)
- Ajouter un seuil journalier `RATE_LIMIT_DAILY = 800` pour proteger la mailbox Hostinger

**`src/pages/admin/AdminEmailProviderConfig.tsx`** :
- Mettre a jour les messages toast de succes en francais coherent

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `encrypted_config` + creer `email_logs` |
| `supabase/functions/smtp-relay/index.ts` | Message test mail en francais |
| `supabase/functions/send-email/index.ts` | Rate limits equilibres + seuil journalier |
| `src/pages/admin/AdminEmailProviderConfig.tsx` | Toast messages coherents |

