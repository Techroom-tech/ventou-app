

## Afficher le lien final + colonne "Dernière activité" (vraie date du dernier clic)

### 1. Migration DB : ajouter `last_clicked_at` à `tracked_links`

```sql
ALTER TABLE public.tracked_links
ADD COLUMN last_clicked_at timestamptz DEFAULT NULL;
```

### 2. Mettre à jour la logique de comptage des clics

Le storefront doit déjà incrémenter `clicks` quelque part quand `?ref=XXX` est détecté. Actuellement, je ne vois **aucun** code qui incrémente `clicks` sur `tracked_links` — ni dans le storefront, ni dans une edge function. Il faudra donc aussi ajouter cette logique.

**Approche** : Ajouter dans `ShopStorefront.tsx` (ou `StorefrontContext`) un `useEffect` qui, au chargement, détecte `?ref=XXX` dans l'URL et appelle un RPC ou une edge function pour incrémenter `clicks` et mettre à jour `last_clicked_at`.

Pour rester simple et ne pas créer une edge function dédiée, on fera un appel direct Supabase avec le service anonyme (RLS autorise le public à lire `tracked_links` mais pas à le modifier). Donc on va créer une **petite edge function `track-link-click`** qui :
- Reçoit `{ ref_code: string }`
- Fait `UPDATE tracked_links SET clicks = clicks + 1, last_clicked_at = now() WHERE ref_code = ref_code`
- Retourne 200

### 3. Appeler la fonction depuis le storefront

Dans `ShopStorefront.tsx`, ajouter un `useEffect` qui détecte `?ref=...` au chargement et appelle `track-link-click`.

### 4. Mettre à jour `useTrackedLinks.ts`

- Ajouter `last_clicked_at: string | null` à l'interface `TrackedLink`

### 5. Mettre à jour `MarketingLinks.tsx`

**Desktop (table)** :
- Remplacer la colonne "Ref" par une colonne "Lien" qui affiche l'URL complète (tronquée) avec un bouton copier bien visible
- Ajouter une colonne "Dernière activité" qui affiche `last_clicked_at` formaté avec `date-fns` (`formatDistanceToNow`) ou "Jamais" si null

**Mobile (cards)** :
- Afficher l'URL complète tronquée
- Afficher la dernière activité

### Fichiers modifiés
- `supabase/functions/track-link-click/index.ts` — nouvelle edge function
- `supabase/config.toml` — déclarer la fonction avec `verify_jwt = false`
- `src/pages/ShopStorefront.tsx` — useEffect pour détecter `?ref=` et appeler l'edge function
- `src/hooks/useTrackedLinks.ts` — ajouter `last_clicked_at` au type
- `src/pages/marketing/MarketingLinks.tsx` — refonte de la liste (lien visible, colonne dernière activité)

