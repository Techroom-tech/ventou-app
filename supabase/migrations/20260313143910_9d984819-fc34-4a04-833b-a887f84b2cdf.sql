-- Allow admins to upload files to shop-assets bucket (for marketplace banners etc.)
CREATE POLICY "Admins can upload shop assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-assets'
  AND public.is_admin(auth.uid())
);

-- Allow admins to update files in shop-assets bucket
CREATE POLICY "Admins can update shop assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND public.is_admin(auth.uid())
);

-- Allow admins to delete files in shop-assets bucket
CREATE POLICY "Admins can delete shop assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-assets'
  AND public.is_admin(auth.uid())
);