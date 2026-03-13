
-- RPC function: get_marketplace_products with scoring
CREATE OR REPLACE FUNCTION public.get_marketplace_products(
  _category_id uuid DEFAULT NULL,
  _search text DEFAULT '',
  _country text DEFAULT '',
  _min_price numeric DEFAULT NULL,
  _max_price numeric DEFAULT NULL,
  _has_promo boolean DEFAULT false,
  _sort text DEFAULT 'score',
  _page_size integer DEFAULT 24,
  _page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  price numeric,
  compare_at_price numeric,
  image_url text,
  category text,
  marketplace_category_id uuid,
  created_at timestamp without time zone,
  shop_id uuid,
  shop_name text,
  shop_slug text,
  shop_country text,
  shop_logo_url text,
  shop_is_verified boolean,
  shop_currency text,
  avg_rating numeric,
  review_count bigint,
  order_count bigint,
  is_sponsored boolean,
  score numeric,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH product_stats AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.price,
      p.compare_at_price,
      p.image_url,
      p.category,
      p.marketplace_category_id,
      p.created_at,
      p.shop_id,
      s.name AS shop_name,
      s.slug AS shop_slug,
      s.country AS shop_country,
      s.logo_url AS shop_logo_url,
      COALESCE(s.is_verified, false) AS shop_is_verified,
      COALESCE(s.currency, 'XOF') AS shop_currency,
      COALESCE(r.avg_r, 0) AS avg_rating,
      COALESCE(r.cnt, 0) AS review_count,
      COALESCE(o.order_cnt, 0) AS order_count,
      EXISTS(
        SELECT 1 FROM sponsored_products sp
        WHERE sp.product_id = p.id AND sp.is_active = true
          AND sp.starts_at <= now()
          AND (sp.ends_at IS NULL OR sp.ends_at >= now())
      ) AS is_sponsored,
      -- Score: orders*3 + avg_rating*2 + sponsored*10 + recency bonus (max 5 for last 7 days)
      (COALESCE(o.order_cnt, 0) * 3
       + COALESCE(r.avg_r, 0) * 2
       + CASE WHEN EXISTS(
           SELECT 1 FROM sponsored_products sp
           WHERE sp.product_id = p.id AND sp.is_active = true
             AND sp.starts_at <= now()
             AND (sp.ends_at IS NULL OR sp.ends_at >= now())
         ) THEN 10 ELSE 0 END
       + GREATEST(0, 5 - EXTRACT(DAY FROM now() - p.created_at))
      )::numeric AS score
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN LATERAL (
      SELECT AVG(pr.rating)::numeric AS avg_r, COUNT(*)::bigint AS cnt
      FROM product_reviews pr
      WHERE pr.product_id = p.id AND pr.is_approved = true
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::bigint AS order_cnt
      FROM orders ord
      WHERE ord.shop_id = p.shop_id
        AND ord.status NOT IN ('cancelled')
        AND ord.items::text LIKE '%' || p.id::text || '%'
    ) o ON true
    WHERE p.show_in_marketplace = true
      AND p.is_active = true
      AND p.status = 'published'
      AND s.is_active = true
      AND s.deleted_at IS NULL
      AND s.is_suspended = false
      AND (_category_id IS NULL OR p.marketplace_category_id = _category_id)
      AND (_search = '' OR p.name ILIKE '%' || _search || '%')
      AND (_country = '' OR s.country = _country)
      AND (_min_price IS NULL OR p.price >= _min_price)
      AND (_max_price IS NULL OR p.price <= _max_price)
      AND (NOT _has_promo OR p.compare_at_price IS NOT NULL)
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total FROM product_stats
  )
  SELECT
    ps.id, ps.name, ps.slug, ps.price, ps.compare_at_price,
    ps.image_url, ps.category, ps.marketplace_category_id, ps.created_at,
    ps.shop_id, ps.shop_name, ps.shop_slug, ps.shop_country,
    ps.shop_logo_url, ps.shop_is_verified, ps.shop_currency,
    ps.avg_rating, ps.review_count, ps.order_count, ps.is_sponsored,
    ps.score,
    c.total AS total_count
  FROM product_stats ps
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN _sort = 'score' THEN ps.score END DESC NULLS LAST,
    CASE WHEN _sort = 'newest' THEN ps.created_at END DESC NULLS LAST,
    CASE WHEN _sort = 'price_asc' THEN ps.price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN ps.price END DESC NULLS LAST,
    CASE WHEN _sort = 'rating' THEN ps.avg_rating END DESC NULLS LAST,
    ps.score DESC
  LIMIT _page_size
  OFFSET _page_offset;
$$;
