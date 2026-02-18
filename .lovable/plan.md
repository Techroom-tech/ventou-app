
# Correction complète : store_id → shop_id + Vitrine + Produits réels

## Problèmes identifiés

### 1. Colonne `store_id` vs `shop_id` dans la table `products`
L'erreur SQL `column "shop_id" does not exist — HINT: Perhaps you meant to reference the column "products.store_id"` confirme que la table `products` en base utilise **`store_id`** mais TOUT le code frontend envoie **`shop_id`**. C'est la cause de l'erreur "Impossible de publier le produit".

Deux options :
- **Option A (recommandée)** : Renommer la colonne en base (`ALTER TABLE products RENAME COLUMN store_id TO shop_id;`) — une seule ligne SQL, aucun changement de code.
- **Option B** : Adapter le code pour utiliser `store_id` partout — des dizaines de fichiers à modifier.

**On choisit l'Option A** : une migration SQL simple.

### 2. Vitrine sous-domaine → 404
Le problème vient de deux causes cumulées :
- Les produits ne s'affichent pas (requête `shop_id` échoue car la colonne s'appelle `store_id`)
- La vitrine requête `.eq('is_active', true)` sur `shops` mais si la boutique a `is_active = false` par défaut, elle n'est pas trouvée → page 404

### 3. Page `/dashboard/products` utilise mockData
Le `ProductContext` charge les `mockProducts` hardcodés en mémoire. La page affiche donc des produits fictifs, pas ceux de Supabase. Il faut connecter le contexte à Supabase avec le vrai `shop_id`.

---

## Plan d'implémentation

### Etape 1 — SQL à exécuter dans Supabase (vous le faites, 30 secondes)

```sql
-- Renommer store_id → shop_id dans products
ALTER TABLE public.products RENAME COLUMN store_id TO shop_id;

-- S'assurer que les boutiques créées sont actives
UPDATE public.shops SET is_active = true WHERE is_active IS NULL OR is_active = false;
```

Voilà, après ça la publication fonctionne sans aucune autre modification.

### Etape 2 — Connecter ProductContext à Supabase (code)

Réécrire `src/contexts/ProductContext.tsx` pour :
- Charger les produits via `useQuery` Supabase (`.eq('shop_id', shop.id)`)
- `deleteProduct` → `supabase.from('products').delete()`
- `duplicateProduct` → `supabase.from('products').insert()`
- `toggleVisibility` → `supabase.from('products').update({ is_active })`
- Supprimer la dépendance aux `mockProducts`

### Etape 3 — Vérifier la vitrine (code)

Dans `ShopStorefront.tsx`, la requête produits utilise déjà `shop_id` correctement. Une fois la colonne renommée en base (Etape 1), ça fonctionnera.

Ajouter une vérification de secours : si `is_active` est faux pour la boutique, l'afficher quand même si on accède via le sous-domaine direct (la boutique existe mais n'est pas "active" → on l'affiche en mode preview plutôt que 404).

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| SQL Supabase | `RENAME COLUMN store_id TO shop_id` + `UPDATE shops SET is_active = true` |
| `src/contexts/ProductContext.tsx` | Connecter à Supabase, supprimer mockData |
| `src/pages/ShopStorefront.tsx` | Retirer le filtre `is_active` bloquant sur shops |

## Ce qui ne change pas

- `AddProduct.tsx` — déjà correct, envoie bien `shop_id`
- `ImageUploader.tsx` — déjà correct
- `RichTextEditor.tsx` — déjà correct
- Routing et authentification — inchangés

## Séquence d'actions

```text
1. Vous : Exécutez les 2 lignes SQL dans Supabase
2. Moi : Je modifie ProductContext + ShopStorefront
3. Résultat : Publication produit OK + Vitrine accessible + Dashboard réel
```
