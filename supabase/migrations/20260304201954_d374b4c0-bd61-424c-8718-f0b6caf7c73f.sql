
-- Generate slugs for existing products without one
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR r IN SELECT id, name, shop_id FROM products WHERE slug IS NULL OR slug = '' LOOP
    base_slug := lower(trim(r.name));
    base_slug := translate(base_slug, 'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ', 'aaaaaaeeeeiiiioooooouuuuyyncaaaaaaeeeeiiiioooooouuuuyync');
    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    IF base_slug = '' THEN base_slug := 'product'; END IF;
    
    final_slug := base_slug;
    counter := 2;
    WHILE EXISTS(SELECT 1 FROM products WHERE shop_id = r.shop_id AND slug = final_slug AND id != r.id) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    UPDATE products SET slug = final_slug WHERE id = r.id;
  END LOOP;
END;
$$;

-- Auto-generate slugs on insert/update via trigger
CREATE OR REPLACE FUNCTION public.generate_product_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(trim(NEW.name));
    base_slug := translate(base_slug, 'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ', 'aaaaaaeeeeiiiioooooouuuuyyncaaaaaaeeeeiiiioooooouuuuyync');
    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
    IF base_slug = '' THEN base_slug := 'product'; END IF;
    
    final_slug := base_slug;
    counter := 2;
    WHILE EXISTS(SELECT 1 FROM products WHERE shop_id = NEW.shop_id AND slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_slug
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION public.generate_product_slug();

-- Unique index on (shop_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shop_slug ON products(shop_id, slug) WHERE slug IS NOT NULL AND slug != '';
