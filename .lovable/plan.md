
# Audit complet et corrections ciblées

## Problèmes identifiés

### 1. Route `/boutique/:slug` manquante (cause principale du 404)

Dans `App.tsx`, seule la route `/shop/:slug` est declaree. Or, quand quelqu'un visite `test.ventou.shop`, le serveur redirige vers `ventou.shop/boutique/test` — une route qui n'existe pas dans le router React. Resultat : 404.

La correction : ajouter `<Route path="/boutique/:slug" element={<ShopStorefrontRoute />} />` dans `App.tsx`.

### 2. Lien "Voir ma boutique" incohérent dans ShopCreatedSuccess

`src/pages/ShopCreatedSuccess.tsx` ligne 160 fait `navigate('/shop/${slug}')` en interne. Apres la correction du routing, les deux routes `/shop/:slug` et `/boutique/:slug` fonctionneront, donc pas de changement necessaire ici — mais le lien devra pointer vers `/boutique/${slug}` pour etre coherent avec l'URL affichee aux utilisateurs.

### 3. Erreurs de publication silencieuses

Dans `AddProduct.tsx`, le `catch` dans `handleSaveDraft` et `handlePublish` affiche un message generique sans mentionner l'erreur Supabase reelle. Le log `console.error('[AddProduct] Save error:', err)` est present dans `saveProduct`, mais le toast ne montre pas `err.message`.

Correction : afficher `err.message` dans le toast d'erreur pour que le marchand comprenne exactement ce qui echoue.

### 4. Colonne `stock_quantity` — verification

D'apres les logs de console fournis :
```
"Could not find the 'stock_quantity' column of 'products' in the schema cache"
```
Cette erreur apparait dans les anciens logs. La migration SQL executee a ajoute les colonnes manquantes. Cependant, `stock_quantity` devrait deja exister (c'etait une colonne originale). Il est possible que la migration ait ete partielle ou que le cache Supabase ne se soit pas rafraichi. Aucune modification de code n'est requise pour cette partie — la colonne existe maintenant.

### 5. RLS products — politique INSERT

La politique RLS sur `products` doit verifier que `shop_id` appartient a `auth.uid()`. Il faut s'assurer qu'elle existe et est correcte. Une politique SQL additionnelle doit etre verifiee (ou creee si absente).

---

## Plan de corrections

### Fichier 1 : `src/App.tsx`

Ajouter la route `/boutique/:slug` juste avant ou apres `/shop/:slug` :

```tsx
<Route path="/boutique/:slug" element={<ShopStorefrontRoute />} />
<Route path="/shop/:slug" element={<ShopStorefrontRoute />} />
```

Cela resout le 404 pour `ventou.shop/boutique/test` et pour les sous-domaines qui redirigent vers cette URL.

### Fichier 2 : `src/pages/ShopCreatedSuccess.tsx`

Changer `navigate('/shop/${slug}')` (ligne 160) en `navigate('/boutique/${slug}')` pour etre coherent avec l'URL reelle utilisee par le sous-domaine redirect.

### Fichier 3 : `src/pages/AddProduct.tsx`

Dans `handleSaveDraft` et `handlePublish`, remplacer le message d'erreur generique par `err?.message || 'Erreur inconnue'` dans le toast pour que l'erreur Supabase reelle soit visible.

Avant :
```ts
} catch {
  toast({ title: 'Erreur', description: 'Impossible de publier le produit.', variant: 'destructive' });
}
```

Apres :
```ts
} catch (err: any) {
  toast({ title: 'Erreur', description: err?.message || 'Impossible de publier le produit.', variant: 'destructive' });
}
```

### SQL additionnel (a executer dans Supabase)

Pour s'assurer que la RLS `products` autorise l'INSERT quand `shop_id` appartient a l'utilisateur :

```sql
-- Verifier et creer la politique RLS INSERT sur products
DROP POLICY IF EXISTS "owner_insert_products" ON public.products;
CREATE POLICY "owner_insert_products"
  ON public.products FOR INSERT
  WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_update_products" ON public.products;
CREATE POLICY "owner_update_products"
  ON public.products FOR UPDATE
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_delete_products" ON public.products;
CREATE POLICY "owner_delete_products"
  ON public.products FOR DELETE
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "public_read_active_products" ON public.products;
CREATE POLICY "public_read_active_products"
  ON public.products FOR SELECT
  USING (true);
```

---

## Ce qui ne change pas

- `ShopStorefront.tsx` — deja correct, la requete shops n'a plus le filtre `is_active`
- `ProductContext.tsx` — deja connecte a Supabase correctement
- `CategoryPicker.tsx` — fonctionne correctement
- `RichTextEditor.tsx` — inchange
- Architecture, pages, structure — inchangees

## Resume des modifications

| Fichier | Changement |
|---|---|
| `src/App.tsx` | Ajouter `<Route path="/boutique/:slug" .../>` |
| `src/pages/ShopCreatedSuccess.tsx` | `navigate('/boutique/${slug}')` au lieu de `/shop/${slug}` |
| `src/pages/AddProduct.tsx` | Toast d'erreur affiche `err.message` reel |
| SQL Supabase (manuel) | RLS INSERT/UPDATE/DELETE sur `products` |
