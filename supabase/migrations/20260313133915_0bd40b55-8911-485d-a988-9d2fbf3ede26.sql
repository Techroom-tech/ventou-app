
-- Marketplace categories (admin-managed global categories)
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'Package',
  image_url text,
  banner_url text,
  banner_title text,
  banner_link text,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_marketplace_categories" ON public.marketplace_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "admin_manage_marketplace_categories" ON public.marketplace_categories
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Marketplace banners (hero slider)
CREATE TABLE public.marketplace_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  description text,
  button_text text DEFAULT 'Découvrir',
  button_link text,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketplace_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_marketplace_banners" ON public.marketplace_banners
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "admin_manage_marketplace_banners" ON public.marketplace_banners
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Sponsored products
CREATE TABLE public.sponsored_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  placement text NOT NULL DEFAULT 'homepage',
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sponsored_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_sponsored_products" ON public.sponsored_products
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "owner_manage_sponsored_products" ON public.sponsored_products
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE POLICY "admin_manage_sponsored_products" ON public.sponsored_products
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add marketplace columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_in_marketplace boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketplace_category_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL;

-- Index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_products_marketplace ON public.products (show_in_marketplace, is_active, status);
CREATE INDEX IF NOT EXISTS idx_products_marketplace_category ON public.products (marketplace_category_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_products_placement ON public.sponsored_products (placement, is_active);
