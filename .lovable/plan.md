

## Plan : Auto-détection du pays par IP pour pré-remplissage intelligent

### Problème actuel
- Le `CountryProvider` existe mais n'est utilisé que dans le **storefront** (ShopStorefront). Il n'est pas disponible dans les pages dashboard/auth/CreateShop.
- La page `CreateShop` a un pays par défaut hardcodé `'Ivory Coast'` et un champ WhatsApp sans préfixe automatique.
- La liste `COUNTRIES` dans CreateShop ne correspond pas aux `COUNTRY_CONFIGS` du CountryContext (noms différents : "Ivory Coast" vs "Côte d'Ivoire").

### Ce qu'on va faire

**1. Remonter le `CountryProvider` au niveau global (App.tsx)**
- Wraper toute l'app dans `<CountryProvider>` pour que la détection IP soit disponible partout (dashboard, CreateShop, checkout, etc.)

**2. Utiliser `useCountry()` dans CreateShop pour pré-remplir automatiquement :**
- **Pays** : sélectionné selon le pays détecté
- **WhatsApp** : pré-rempli avec le préfixe téléphonique du pays (ex: `+225` pour CI)
- Harmoniser la liste `COUNTRIES` avec `COUNTRY_CONFIGS` pour utiliser les mêmes codes/noms

**3. Harmoniser les noms de pays**
- Remplacer la constante `COUNTRIES` dans CreateShop par `COUNTRY_CONFIGS` du CountryContext
- Mapper le code pays détecté → nom affiché dans le select
- Stocker le code ISO dans le formulaire (plus fiable que le nom)

### Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/App.tsx` | Wrapper `<CountryProvider>` au niveau global |
| `src/pages/CreateShop.tsx` | Importer `useCountry`, remplacer `COUNTRIES` par `COUNTRY_CONFIGS`, pré-remplir pays + WhatsApp prefix |
| `src/pages/ShopStorefront.tsx` | Retirer le `<CountryProvider>` local (désormais global) |

### Détails techniques
- `useCountry()` dans CreateShop → `country.name` pour `defaultValues.country`, `country.phonePrefix` pour `defaultValues.whatsapp`
- La détection IP existante via le header `X-User-Country` (Cloudflare Worker) reste le mécanisme principal — aucun service externe nécessaire
- Le `useEffect` dans CountryContext gère déjà la cascade : localStorage → header HTTP → navigator.language → défaut BF

