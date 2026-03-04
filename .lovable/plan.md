

## Refonte du dialog "Nouveau lien" — Aide contextuelle + Sélection de produit

### Changements

**`src/pages/marketing/MarketingLinks.tsx`** :

1. **Mode de destination** : Ajouter un toggle/tabs "Lien personnalisé" vs "Produit de ma boutique"
   - Mode "Produit" : afficher un Select qui liste les produits du shop (query Supabase `products` filtré par `shop_id`, `is_active = true`)
   - Mode "Lien" : garder l'input URL actuel
   - Quand un produit est sélectionné, construire automatiquement le `target_url` : `https://{shop.slug}.ventou.shop/produit/{product.slug}`

2. **Textes d'aide** : Ajouter des labels et descriptions explicatives pour chaque champ :
   - Nom : label "Nom de la campagne" + placeholder "Ex: Promo été Facebook"  + sous-texte "Donnez un nom pour identifier cette campagne"
   - Destination : sous-texte "Choisissez un produit ou entrez un lien personnalisé"
   - Source : label "Source de trafic" + sous-texte "D'où viendront les visiteurs ?"

3. **Placeholders améliorés** :
   - Input nom : `Ex: Promo été Facebook`
   - Input URL : `Ex: https://monshop.ventou.shop/produit/...`

4. **Logique produit** : Utiliser une query `useQuery` inline pour charger les produits actifs du shop (simple select `id, name, slug` depuis `products` où `shop_id` et `is_active = true`)

5. **Construction URL** : Quand mode produit, le `target_url` est auto-généré à partir du slug du shop + slug du produit

### Fichiers modifiés
- `src/pages/marketing/MarketingLinks.tsx` — refonte du dialog uniquement

### Aucun changement backend
- Les produits sont déjà accessibles via la table `products` avec RLS existant

