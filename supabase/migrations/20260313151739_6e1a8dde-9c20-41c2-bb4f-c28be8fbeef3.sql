CREATE OR REPLACE FUNCTION public.get_marketplace_products(
  _category_id uuid DEFAULT NULL::uuid,
  _search text DEFAULT ''::text,
  _country text DEFAULT ''::text,
  _min_price numeric DEFAULT NULL::numeric,
  _max_price numeric DEFAULT NULL::numeric,
  _has_promo boolean DEFAULT false,
  _sort text DEFAULT 'score'::text,
  _page_size integer DEFAULT 24,
  _page_offset integer DEFAULT 0,
  _min_rating numeric DEFAULT NULL::numeric,
  _min_orders bigint DEFAULT NULL::bigint
)
RETURNS TABLE(
  id uuid, name text, slug text, price numeric, compare_at_price numeric,
  image_url text, category text, marketplace_category_id uuid,
  created_at timestamp without time zone, shop_id uuid, shop_name text,
  shop_slug text, shop_country text, shop_logo_url text, shop_is_verified boolean,
  shop_currency text, avg_rating numeric, review_count bigint, order_count bigint,
  is_sponsored boolean, score numeric, total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH product_stats AS (
    SELECT
      p.id, p.name, p.slug, p.price, p.compare_at_price, p.image_url,
      p.category, p.marketplace_category_id, p.created_at, p.shop_id,
      s.name AS shop_name, s.slug AS shop_slug, s.country AS shop_country,
      s.logo_url AS shop_logo_url, COALESCE(s.is_verified, false) AS shop_is_verified,
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
  filtered AS (
    SELECT * FROM product_stats ps
    WHERE (_min_rating IS NULL OR ps.avg_rating >= _min_rating)
      AND (_min_orders IS NULL OR ps.order_count >= _min_orders)
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total FROM filtered
  )
  SELECT
    f.id, f.name, f.slug, f.price, f.compare_at_price,
    f.image_url, f.category, f.marketplace_category_id, f.created_at,
    f.shop_id, f.shop_name, f.shop_slug, f.shop_country,
    f.shop_logo_url, f.shop_is_verified, f.shop_currency,
    f.avg_rating, f.review_count, f.order_count, f.is_sponsored,
    f.score,
    c.total AS total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN _sort = 'score' THEN f.score END DESC NULLS LAST,
    CASE WHEN _sort = 'newest' THEN f.created_at END DESC NULLS LAST,
    CASE WHEN _sort = 'price_asc' THEN f.price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN f.price END DESC NULLS LAST,
    CASE WHEN _sort = 'rating' THEN f.avg_rating END DESC NULLS LAST,
    CASE WHEN _sort = 'best_selling' THEN f.order_count END DESC NULLS LAST,
    f.score DESC
  LIMIT _page_size
  OFFSET _page_offset;
$function$;