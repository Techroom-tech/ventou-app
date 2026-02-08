
# Plan d'intégration Supabase - Authentification VENTOU

## Objectif
Intégrer Supabase pour gérer l'authentification complète (inscription, connexion, réinitialisation de mot de passe) avec stockage des profils utilisateurs.

## Credentials Supabase
- **URL**: `https://chpplckgndznakuvcqbx.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHBsY2tnbmR6bmFrdXZjcWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTgxMjEwLCJleHAiOjIwODYxNTcyMTB9.oimHRR-gDoli9w26pif2pcurnrZQlN7mR51rBc_-gek`

---

## Etapes d'implementation

### 1. Configuration Supabase Client
Creer le dossier `src/integrations/supabase/` avec :
- `client.ts` : Client Supabase configure
- `types.ts` : Types TypeScript pour la base de donnees

### 2. Base de donnees - Table Profiles
Creer une table `profiles` dans Supabase :

```text
+-------------------+
|     profiles      |
+-------------------+
| id (uuid, PK, FK) | -> reference auth.users(id)
| first_name (text) |
| last_name (text)  |
| avatar_url (text) |
| created_at        |
| updated_at        |
+-------------------+
```

**Politiques RLS** :
- Les utilisateurs peuvent lire leur propre profil
- Les utilisateurs peuvent mettre a jour leur propre profil
- Creation automatique du profil via trigger lors de l'inscription

### 3. Hook d'authentification
Creer `src/hooks/useAuth.ts` :
- Gestion de l'etat de connexion avec `onAuthStateChange`
- Fonctions : `signUp`, `signIn`, `signOut`, `resetPassword`
- Chargement automatique du profil utilisateur

### 4. Contexte d'authentification
Creer `src/contexts/AuthContext.tsx` :
- Provider global pour l'application
- Expose l'utilisateur, le profil et les fonctions d'auth
- Gestion de l'etat de chargement

### 5. Mise a jour des pages d'authentification
Modifier les pages existantes pour utiliser Supabase :

**Login.tsx** :
- Remplacer le mock par `supabase.auth.signInWithPassword`
- Gestion des erreurs avec messages traduits
- Redirection vers dashboard apres connexion

**Signup.tsx** :
- Remplacer le mock par `supabase.auth.signUp`
- Passer les metadata (first_name, last_name)
- Afficher message de verification email

**ForgotPassword.tsx** :
- Remplacer le mock par `supabase.auth.resetPasswordForEmail`
- Configurer l'URL de redirection

### 6. Nouvelle page - Reset Password
Creer `src/pages/ResetPassword.tsx` :
- Page de creation du nouveau mot de passe
- Accessible via le lien email Supabase
- Utilise `supabase.auth.updateUser`

### 7. Protection des routes
Creer `src/components/ProtectedRoute.tsx` :
- Wrapper pour les routes authentifiees
- Redirection vers login si non connecte

### 8. Dashboard utilisateur
Creer une page `src/pages/Dashboard.tsx` :
- Page d'accueil apres connexion
- Affichage du profil utilisateur
- Bouton de deconnexion

---

## Details techniques

### Structure des fichiers a creer
```text
src/
  integrations/
    supabase/
      client.ts
      types.ts
  contexts/
    AuthContext.tsx
  hooks/
    useAuth.ts
  components/
    ProtectedRoute.tsx
  pages/
    ResetPassword.tsx
    Dashboard.tsx
```

### Fichiers a modifier
```text
src/App.tsx          -> Ajouter AuthProvider + nouvelles routes
src/pages/Login.tsx  -> Integrer Supabase signIn
src/pages/Signup.tsx -> Integrer Supabase signUp
src/pages/ForgotPassword.tsx -> Integrer Supabase resetPassword
src/pages/Index.tsx  -> Afficher bouton conditionnel si connecte
```

### Migration SQL pour Supabase
```sql
-- Table profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politiques
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Trigger pour creation automatique
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Flux utilisateur final

1. **Inscription** : L'utilisateur s'inscrit -> Email de verification envoye -> Profil cree automatiquement
2. **Connexion** : L'utilisateur se connecte -> Redirection vers Dashboard
3. **Mot de passe oublie** : Email avec lien -> Page ResetPassword -> Nouveau mot de passe
4. **Deconnexion** : Bouton dans Dashboard -> Retour a la page d'accueil

---

## Prochaines etapes apres approbation
1. Executer la migration SQL dans Supabase
2. Creer les fichiers de configuration
3. Implementer le contexte et le hook d'auth
4. Mettre a jour les pages existantes
5. Creer les nouvelles pages (ResetPassword, Dashboard)
6. Tester le flux complet
