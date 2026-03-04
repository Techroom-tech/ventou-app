CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  country text,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_approved_reviews" ON public.product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "owner_manage_reviews" ON public.product_reviews
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE INDEX idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_reviews_shop ON public.product_reviews(shop_id);