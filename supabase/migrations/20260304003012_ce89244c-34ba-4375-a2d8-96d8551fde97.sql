
-- Function: get_customer_stats
-- Aggregates orders by phone, returns paginated customer stats
CREATE OR REPLACE FUNCTION public.get_customer_stats(
  _shop_id uuid,
  _search text DEFAULT '',
  _page_size int DEFAULT 20,
  _page_offset int DEFAULT 0
)
RETURNS TABLE(
  phone text,
  name text,
  city text,
  quartier text,
  total_orders bigint,
  delivered bigint,
  cancelled bigint,
  total_amount numeric,
  first_order_date timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      o.phone,
      MAX(o.customer_name) AS name,
      MAX(o.city) AS city,
      MAX(o.quartier) AS quartier,
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE o.status = 'delivered') AS delivered,
      COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled,
      SUM(o.total) AS total_amount,
      MIN(o.created_at) AS first_order_date
    FROM orders o
    WHERE o.shop_id = _shop_id
      AND o.phone IS NOT NULL
      AND o.phone != ''
    GROUP BY o.phone
  ),
  filtered AS (
    SELECT *
    FROM stats s
    WHERE _search = '' 
       OR s.name ILIKE '%' || _search || '%'
       OR s.phone ILIKE '%' || _search || '%'
  )
  SELECT 
    f.phone,
    f.name,
    f.city,
    f.quartier,
    f.total_orders,
    f.delivered,
    f.cancelled,
    f.total_amount,
    f.first_order_date,
    (SELECT COUNT(*) FROM filtered) AS total_count
  FROM filtered f
  ORDER BY f.total_orders DESC
  LIMIT _page_size
  OFFSET _page_offset;
$$;

-- Function: get_repeat_customer_count
-- Returns the number of phones with >1 order
CREATE OR REPLACE FUNCTION public.get_repeat_customer_count(_shop_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM (
    SELECT phone
    FROM orders
    WHERE shop_id = _shop_id AND phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  ) sub;
$$;
