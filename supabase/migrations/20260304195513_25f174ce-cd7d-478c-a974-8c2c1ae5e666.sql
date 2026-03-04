-- Allow shop owners to delete reviews on their products
CREATE POLICY "owner_delete_reviews" ON public.product_reviews
  FOR DELETE USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Allow shop owners to update reviews (approve/reject)
CREATE POLICY "owner_update_reviews" ON public.product_reviews
  FOR UPDATE USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));