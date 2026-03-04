DROP POLICY "public_insert_orders" ON public.orders;
CREATE POLICY "public_insert_orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE is_active = true)
  );