

# Plan : Ameliorer la page SMTP Configuration

## Constat

La page existe deja a `/admin/settings/email/providers/smtp` avec :
- AdminLayout (sidebar dark + header)
- Breadcrumb
- Jump To menu (2 colonnes)
- Formulaire SMTP complet (6 champs + toggles)
- Edge functions `smtp-relay` et `encrypt-config` operationnelles
- Hook `useEmailProviders` fonctionnel

Ce qui manque par rapport a la demande :

1. **Modal Test Mail** : actuellement le test envoie directement a `senderEmail`. Il faut une modal avec un champ email + boutons Close/Send
2. **Message "Password already saved"** : informer l'utilisateur que le mot de passe est deja sauvegarde
3. **Sender Name** manquant dans le formulaire (champ present dans le hook mais pas affiche)
4. **Validation SMTP avant Save** : verifier la connexion SMTP avant de sauvegarder

## Modifications prevues

### Fichier 1 : `src/pages/admin/AdminEmailProviderConfig.tsx`

Modifications :
- Ajouter une **modal Test Mail** (Dialog ShadCN) avec champ email, boutons Close et Send, et feedback toast
- Ajouter le champ **Sender Name** dans le formulaire
- Ajouter le message **"Password already saved. Leave blank to keep existing."** sous le champ password quand un provider existe deja
- Ameliorer le bouton Test Mail pour qu'il ouvre la modal au lieu d'envoyer directement
- Le Test Mail est toujours visible (pas seulement quand isDefault)
- Ajouter validation des champs obligatoires avant Save (host, port, username requis pour SMTP)

### Fichier 2 : aucun autre fichier modifie

Les edge functions, le hook, le layout et le routing sont deja corrects.

## Details techniques

### Modal Test Mail
```text
┌──────────────────────────────────┐
│  Send Test Email                 │
│                                  │
│  Email address                   │
│  ┌─────────────────────────────┐ │
│  │ test@example.com            │ │
│  └─────────────────────────────┘ │
│                                  │
│              [Close]  [Send]     │
└──────────────────────────────────┘
```

- Utilise `Dialog` de ShadCN
- Pre-remplit avec senderEmail
- Bouton Send appelle `smtp-relay` ou `send-email` selon le driver
- Affiche toast succes/erreur avec le vrai message SMTP

### Validation avant Save (SMTP)
- Si nouveau provider : host, port, username, password sont obligatoires
- Si provider existant : host, port, username optionnels (garder les anciens si vides)
- Password vide = garder l'ancien chiffre

### Resume
| Element | Status |
|---------|--------|
| Sidebar dark | Deja present (AdminSidebar) |
| Header admin | Deja present (AdminHeader) |
| Breadcrumb | Deja present |
| Jump To menu | Deja present |
| Formulaire 6 champs | Deja present |
| Badge Default | Deja present |
| Toggles | Deja present |
| Save Changes | Deja present |
| Modal Test Mail | A ajouter |
| Sender Name | A ajouter |
| Message password saved | A ajouter |
| Validation champs | A ameliorer |

