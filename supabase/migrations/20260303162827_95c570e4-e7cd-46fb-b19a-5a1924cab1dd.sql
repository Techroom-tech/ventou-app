CREATE POLICY "owner_delete_cancelled_orders" ON public.orders
FOR DELETE TO authenticated
USING (
  status = 'cancelled'
  AND shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
);