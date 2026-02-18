
# Corriger l'erreur SQL : CREATE POLICY IF NOT EXISTS

## Cause de l'erreur

PostgreSQL ne supporte pas la syntaxe `IF NOT EXISTS` pour `CREATE POLICY`. C'est une limitation du moteur SQL, contrairement aux tables et index.

## SQL corrige a executer dans Supabase SQL Editor

Remplacez tout le SQL precedent par celui-ci, qui utilise `DROP POLICY IF EXISTS` avant chaque creation :

```sql
-- 1. Ajouter les colonnes manquantes dans products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description_json jsonb,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- 2. Creer la table categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, slug)
);

-- 3. RLS categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_categories" ON public.categories;
CREATE POLICY "owner_manage_categories"
  ON public.categories FOR ALL
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories"
  ON public.categories FOR SELECT USING (true);

-- 4. Storage bucket product-images (public)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Storage policies
DROP POLICY IF EXISTS "auth_upload_product_images" ON storage.objects;
CREATE POLICY "auth_upload_product_images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
```

## Explication de la correction

| Avant (incorrect) | Apres (correct) |
|---|---|
| `CREATE POLICY IF NOT EXISTS "nom"` | `DROP POLICY IF EXISTS "nom" ON table;` puis `CREATE POLICY "nom"` |

La syntaxe correcte en PostgreSQL est de supprimer la politique existante si elle existe (`DROP ... IF EXISTS`) avant de la recreer proprement.

## Apres execution

Une fois ce SQL execute sans erreur, les colonnes `description_json`, `category_id`, `track_stock`, `product_type`, `meta_title`, `meta_description` et `tags` seront disponibles dans `products`, et la publication de produits fonctionnera immediatement sans modification de code.

## Aucune modification de code necessaire

Le code frontend (`AddProduct.tsx`) est deja correct et pret a utiliser ces colonnes. Aucune modification n'est requise cote frontend.
