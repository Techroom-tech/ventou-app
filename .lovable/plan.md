

# Fix: Bouton "Creer Ma Boutique" toujours grise

## Cause du probleme

L'appel a la fonction edge `check-slug` echoue silencieusement (probablement une erreur reseau ou la fonction n'est pas deployee). Quand ca echoue, le `catch` remet `slugStatus` a `'idle'`, ce qui :
1. Garde le bouton desactive (car `slugStatus !== 'available'`)
2. Affiche toujours "Remplissez le nom de votre boutique" meme quand un nom est saisi

## Corrections

### 1. `src/pages/CreateShop.tsx` -- Gerer l'echec de verification du slug

Quand l'appel a `check-slug` echoue, ne pas bloquer l'utilisateur. Ajouter un nouvel etat `'error'` au slug status, et dans ce cas, permettre la soumission (la contrainte UNIQUE en base de donnees est le vrai garde-fou).

**Changements :**
- Ajouter `'error'` comme etat possible de `slugStatus`
- Dans le `catch` de `checkSlug`, mettre `slugStatus` a `'error'` au lieu de `'idle'`
- Modifier la condition du bouton : `disabled={isSubmitting || (slugStatus !== 'available' && slugStatus !== 'error')}`
- Mettre a jour le message d'aide :
  - `idle` (slug vide) : "Remplissez le nom de votre boutique pour continuer"
  - `checking` : "Verification du nom en cours..."
  - `taken` : "Ce nom est deja pris, choisissez-en un autre"
  - `error` : "Verification impossible, vous pouvez continuer" (le bouton sera actif)

### 2. Ajouter des logs pour le debug

Ajouter un `console.log` dans le `catch` de `checkSlug` pour voir l'erreur reelle, ce qui aidera a diagnostiquer si la fonction edge est bien deployee.

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/CreateShop.tsx` | Ajouter etat `error`, modifier condition bouton, mettre a jour messages |

