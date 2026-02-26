
-- Fix: Tighten storage policies to restrict uploads to shop owners only

-- 1. product-images: Replace permissive INSERT policies with owner-scoped ones
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_product_images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete product images" ON storage.objects;

CREATE POLICY "Shop owners can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.shops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.shops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.shops WHERE owner_id = auth.uid()
    )
  );

-- 2. shop-assets: Replace permissive INSERT/UPDATE policies with owner-scoped ones
DROP POLICY IF EXISTS "Owner can upload shop assets" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update shop assets" ON storage.objects;

CREATE POLICY "Shop owners can upload shop assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.shops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can update shop assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.shops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can delete shop assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-assets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.shops WHERE owner_id = auth.uid()
    )
  );
