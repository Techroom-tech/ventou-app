-- 1) Allow multiple shops per owner (remove legacy one-shop-per-user constraint)
ALTER TABLE public.shops
DROP CONSTRAINT IF EXISTS shops_owner_id_unique;

-- 2) Clean duplicate slug index accidentally added
DROP INDEX IF EXISTS public.shops_slug_unique;

-- 3) Add soft-delete support for future-safe subdomain reuse
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 4) Replace global unique slug constraint with active-only unique index
ALTER TABLE public.shops
DROP CONSTRAINT IF EXISTS shops_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS shops_slug_unique_active
ON public.shops (slug)
WHERE deleted_at IS NULL;

-- 5) Ensure active-shop lookup index aligns with soft-delete
DROP INDEX IF EXISTS public.idx_shops_slug_active;
CREATE INDEX IF NOT EXISTS idx_shops_slug_active
ON public.shops (slug, is_active)
WHERE is_active = true AND deleted_at IS NULL;

-- 6) Transactional and validated shop creation API (server-side source of truth)
CREATE OR REPLACE FUNCTION public.create_shop_with_validation(
  _name TEXT,
  _slug TEXT,
  _description TEXT DEFAULT NULL,
  _category TEXT DEFAULT NULL,
  _country TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _whatsapp TEXT DEFAULT NULL,
  _primary_color TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  shop_id UUID,
  normalized_slug TEXT,
  domain TEXT,
  stores_count INTEGER,
  store_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_slug TEXT;
  v_shop_id UUID;
  v_stores_count INTEGER := 0;
  v_store_limit INTEGER := 4;
  v_sub_exists BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'AUTH_REQUIRED', NULL::UUID, NULL::TEXT, NULL::TEXT, 0, 0;
    RETURN;
  END IF;

  v_slug := lower(trim(coalesce(_slug, '')));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');

  IF length(v_slug) < 3 OR length(v_slug) > 40 OR v_slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
    RETURN QUERY SELECT FALSE, 'INVALID_SUBDOMAIN', NULL::UUID, v_slug, NULL::TEXT, 0, 0;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.shops s
    WHERE s.slug = v_slug
      AND s.deleted_at IS NULL
    LIMIT 1
  ) INTO v_sub_exists;

  IF v_sub_exists THEN
    RETURN QUERY SELECT FALSE, 'SUBDOMAIN_TAKEN', NULL::UUID, v_slug, NULL::TEXT, 0, 0;
    RETURN;
  END IF;

  SELECT sp.max_stores
  INTO v_store_limit
  FROM public.vendor_subscriptions vs
  JOIN public.subscription_plans sp ON sp.id = vs.plan_id
  WHERE vs.user_id = v_user_id
  ORDER BY coalesce(vs.updated_at, vs.created_at) DESC
  LIMIT 1;

  v_store_limit := coalesce(v_store_limit, 4);

  SELECT count(*)::INTEGER
  INTO v_stores_count
  FROM public.shops s
  WHERE s.owner_id = v_user_id
    AND s.deleted_at IS NULL;

  IF v_stores_count >= v_store_limit THEN
    RETURN QUERY SELECT FALSE, 'STORE_LIMIT_REACHED', NULL::UUID, v_slug, NULL::TEXT, v_stores_count, v_store_limit;
    RETURN;
  END IF;

  INSERT INTO public.shops (
    owner_id,
    name,
    slug,
    description,
    category,
    country,
    city,
    whatsapp,
    primary_color,
    currency
  )
  VALUES (
    v_user_id,
    _name,
    v_slug,
    _description,
    _category,
    _country,
    _city,
    _whatsapp,
    coalesce(_primary_color, '#1E3A5F'),
    'XOF'
  )
  RETURNING id INTO v_shop_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_shop_id, v_slug, (v_slug || '.ventou.shop')::TEXT, v_stores_count + 1, v_store_limit;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, 'SUBDOMAIN_TAKEN', NULL::UUID, v_slug, NULL::TEXT, v_stores_count, v_store_limit;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'INTERNAL_ERROR', NULL::UUID, v_slug, NULL::TEXT, v_stores_count, v_store_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shop_with_validation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;