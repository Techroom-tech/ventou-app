

# Corrections globales : Auth, bouton grise, et problemes divers

## Problemes identifies

### 1. ProtectedRoute est desactive (CRITIQUE)
Le fichier `ProtectedRoute.tsx` ne fait AUCUNE verification d'authentification. Il affiche simplement les enfants sans verifier si l'utilisateur est connecte. Cela signifie que n'importe qui peut acceder au dashboard et a la page de creation de boutique sans etre connecte. C'est pourquoi "Se connecter" apparait en haut a droite -- l'utilisateur n'est pas authentifie mais il accede quand meme a la page.

### 2. Le bouton "Creer Ma Boutique" est grise
Le bouton de soumission est desactive quand `slugStatus !== 'available'`. Comme le champ slug commence vide, le statut est `idle` et le bouton reste grise. Le comportement est correct MAIS :
- Si l'utilisateur n'est pas connecte (probleme 1), meme en remplissant le formulaire, la creation echouera car `user` sera `null`.
- Il faut ajouter un message d'aide sous le bouton pour expliquer pourquoi il est desactive.

### 3. Apres l'inscription, pas de redirection vers le dashboard
L'inscription montre juste un ecran "Verifiez votre email" mais apres la confirmation par email et la connexion, il n'y a pas de redirection automatique vers le dashboard.

### 4. Le header du dashboard affiche du contenu mock
`DashboardHeader.tsx` utilise `mockShop.name` en dur au lieu du vrai nom de la boutique de l'utilisateur.

---

## Corrections prevues

### 1. Reactiver ProtectedRoute (`src/components/ProtectedRoute.tsx`)

Ajouter la verification d'authentification :
- Si l'auth est en cours de chargement, afficher un spinner
- Si l'utilisateur n'est pas connecte, rediriger vers `/login` en sauvegardant la page d'origine
- Si l'utilisateur est connecte, afficher le contenu

### 2. Ameliorer le bouton "Creer Ma Boutique" (`src/pages/CreateShop.tsx`)

- Ajouter un texte d'aide sous le bouton expliquant les conditions requises (slug doit etre verifie)
- Afficher un message different selon l'etat du slug : "Entrez un nom pour votre boutique", "Verification en cours...", "Ce nom est deja pris"

### 3. Corriger le header du dashboard (`src/components/dashboard/DashboardHeader.tsx`)

- Remplacer `mockShop.name` par le vrai nom de la boutique (via `useShop()`)
- Si pas de boutique, afficher "Ventou" ou ne pas afficher de nom

### 4. Ajouter un bouton de deconnexion visible

- Ajouter un menu utilisateur dans le header du dashboard avec l'option de deconnexion
- L'avatar dans le header devrait ouvrir un dropdown avec "Mon compte" et "Se deconnecter"

---

## Fichiers a modifier

| Action | Fichier | Modification |
|--------|---------|-------------|
| Modifier | `src/components/ProtectedRoute.tsx` | Ajouter la verification auth avec redirection vers /login |
| Modifier | `src/pages/CreateShop.tsx` | Ajouter un message d'aide sous le bouton submit |
| Modifier | `src/components/dashboard/DashboardHeader.tsx` | Remplacer mockShop par le vrai shop + ajouter menu de deconnexion |

---

## Detail technique

### ProtectedRoute.tsx

```text
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

- Si isLoading: afficher un spinner centre
- Si !user: Navigate vers /login avec state { from: location }
- Sinon: afficher children
```

### DashboardHeader.tsx

```text
- Importer useShop
- Remplacer mockShop.name par shop?.name || 'Ventou'
- Ajouter un DropdownMenu sur l'avatar avec :
  - "Mon compte" (lien vers /dashboard/settings)
  - "Se deconnecter" (appel signOut + redirection /login)
```

### CreateShop.tsx - Message sous le bouton

```text
Sous le bouton submit, ajouter un texte conditionnel :
- Si slug est vide : "Remplissez le nom de votre boutique pour continuer"
- Si slugStatus === 'checking' : "Verification du nom en cours..."
- Si slugStatus === 'taken' : "Ce nom est deja pris, choisissez-en un autre"
- Si slugStatus === 'available' : (rien, le bouton est actif)
```

