

## Plan : Boutons "Continuer avec Google" sur Login et Signup

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/GoogleSignInButton.tsx` | Nouveau composant réutilisable |
| `src/pages/Login.tsx` | Ajout du bouton Google au-dessus du formulaire email |
| `src/pages/Signup.tsx` | Ajout du bouton Google au-dessus du formulaire email |
| `src/i18n/locales/fr.json` | Clé `auth.continueWithGoogle` |
| `src/i18n/locales/en.json` | Clé `auth.continueWithGoogle` |

### Composant GoogleSignInButton

Composant partagé qui :
- Appelle `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`
- Affiche le logo Google SVG inline + texte traduit
- Style : bouton outline pleine largeur, hauteur 48px (CTA standard), border radius 8-10px
- État loading avec spinner pendant la redirection
- Responsive : texte et icône s'adaptent, padding ajusté mobile/desktop

### Placement dans les pages

Sur Login et Signup, le bouton Google apparait **avant** le formulaire email, suivi d'un séparateur "ou" (déjà présent sur Login, à ajouter sur Signup). Cela suit le pattern standard où l'OAuth est proposé en premier pour réduire la friction.

### Détails techniques

- Pas besoin de modifier `AuthContext` : le callback OAuth est géré automatiquement par Supabase via `onAuthStateChange` qui détecte la nouvelle session après redirection
- Le trigger `handle_new_user` existant crée automatiquement le profil pour les nouveaux utilisateurs Google (via `raw_user_meta_data`)
- `redirectTo` pointe vers `window.location.origin` pour supporter les différents domaines (ventou.shop, lovable.app, localhost)

