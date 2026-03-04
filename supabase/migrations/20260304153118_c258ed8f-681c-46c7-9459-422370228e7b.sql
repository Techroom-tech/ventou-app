-- Harden public shop visibility: exclude soft-deleted shops
DROP POLICY IF EXISTS "Public can view active shops" ON public.shops;
CREATE POLICY "Public can view active shops"
  ON public.shops
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND deleted_at IS NULL);

-- Also harden public order insertion to exclude deleted shops
DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
CREATE POLICY "public_insert_orders"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (shop_id IN (
    SELECT id FROM public.shops
    WHERE is_active = true AND deleted_at IS NULL
  ));