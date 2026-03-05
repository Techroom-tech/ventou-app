
-- Store pages table
CREATE TABLE public.store_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'FileText',
  content jsonb,
  status text NOT NULL DEFAULT 'draft',
  page_type text NOT NULL DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, slug)
);

-- Indexes
CREATE INDEX idx_store_pages_shop_id ON public.store_pages(shop_id);
CREATE INDEX idx_store_pages_slug ON public.store_pages(shop_id, slug);

-- RLS
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Owner can manage their pages
CREATE POLICY "owner_manage_store_pages" ON public.store_pages
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Public can read published pages
CREATE POLICY "public_read_published_pages" ON public.store_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');
