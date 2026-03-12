

## Plan : Systeme OTP + Lien de confirmation

### Apercu

Remplacer le Magic Link de Supabase par un systeme OTP 5 chiffres + lien de confirmation gere en interne. Les emails sont envoyes via l'infrastructure email existante (send-email edge function + SMTP).

### 1. Table `email_verifications` (migration)

```sql
CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  otp_code text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  type text NOT NULL DEFAULT 'signup',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- RLS: no public access, edge functions use service_role
CREATE POLICY "No public access" ON public.email_verifications
  FOR ALL TO public USING (false);
```

### 2. Edge Function `verify-otp`

Fichier : `supabase/functions/verify-otp/index.ts`

Endpoints (POST body):
- **`action: "generate"`** : Genere OTP 5 chiffres, stocke dans `email_verifications`, envoie email via `send-email`
- **`action: "verify"`** : Verifie OTP ou token, marque `used=true`, confirme email user via admin API
- **`action: "resend"`** : Invalide ancien OTP, genere nouveau (cooldown 60s verifie cote serveur)

Securite :
- 5 tentatives max → `locked_until = now() + 15min`
- OTP expire apres 10 minutes
- Token unique par verification
- `verify_jwt = false` (les users ne sont pas encore confirmes)

### 3. Templates Email

Ajouter 2 templates dans `email_templates` :
- **`otp_signup`** : "Confirmez votre compte Ventou" avec OTP + lien
- **`otp_password_reset`** : "Reinitialisation de votre mot de passe" avec OTP + lien

### 4. Page `/verify-email` (nouveau)

Fichier : `src/pages/VerifyEmail.tsx`

- 5 InputOTP boxes (composant existant `input-otp`)
- Auto-focus, auto-avance, paste du code complet
- Bouton "Renvoyer le code" avec cooldown 60s
- Gere aussi `?token=xxx` dans l'URL pour verification par lien
- Responsive : grandes boxes sur mobile, card centree sur desktop
- Succes → redirect `/dashboard`

### 5. Page `/reset-password` modifiee

Fichier : `src/pages/ResetPassword.tsx`

- Ajouter etape OTP avant le formulaire de nouveau mot de passe
- Step 1 : saisir OTP (ou arriver via `?token=xxx`)
- Step 2 : nouveau mot de passe (une fois OTP valide)

### 6. Modifications Signup

`src/pages/Signup.tsx` :
- Apres `signUp()` reussi → appeler `verify-otp` action=generate
- Rediriger vers `/verify-email?email=xxx&type=signup`

### 7. Modifications ForgotPassword

`src/pages/ForgotPassword.tsx` :
- Remplacer `resetPassword()` par appel a `verify-otp` action=generate type=password_reset
- Rediriger vers `/reset-password?email=xxx`

### 8. Supabase Auth Config

Desactiver la confirmation email automatique de Supabase n'est pas possible via code, mais le systeme OTP contourne le flow natif : apres verification OTP, l'edge function utilise `admin.auth.updateUser({ email_confirm: true })` pour confirmer manuellement.

### 9. Routes

`src/App.tsx` : ajouter `/verify-email` route publique

### Fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer table `email_verifications` |
| `supabase/functions/verify-otp/index.ts` | Nouvelle edge function |
| `supabase/config.toml` | Ajouter `verify_jwt = false` |
| `src/pages/VerifyEmail.tsx` | Nouvelle page OTP |
| `src/pages/Signup.tsx` | Redirect vers verify-email |
| `src/pages/ForgotPassword.tsx` | Utiliser OTP au lieu de magic link |
| `src/pages/ResetPassword.tsx` | Ajouter etape OTP |
| `src/App.tsx` | Ajouter route `/verify-email` |
| `src/i18n/locales/fr.json` | Traductions OTP |
| `src/i18n/locales/en.json` | Traductions OTP |
| Insert SQL | 2 templates email (otp_signup, otp_password_reset) |

