-- Security hardening phase 1

-- 1) Remove public access to tracking_settings (contains secret tokens)
DROP POLICY IF EXISTS "public_read_tracking_settings" ON public.tracking_settings;

-- Public storefront-safe view (no server-side secret tokens)
CREATE OR REPLACE VIEW public.tracking_settings_public AS
SELECT
  shop_id,
  facebook_pixel,
  tiktok_pixel,
  gtm_id,
  custom_scripts
FROM public.tracking_settings;

GRANT SELECT ON public.tracking_settings_public TO anon, authenticated;

-- 2) Persistent distributed rate limit table for edge functions
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_blocked_until ON public.edge_rate_limits (blocked_until);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access edge_rate_limits" ON public.edge_rate_limits;
CREATE POLICY "No public access edge_rate_limits"
ON public.edge_rate_limits
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- 3) Harden SECURITY DEFINER RPC functions against cross-tenant reads
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
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
END;
$$;

CREATE OR REPLACE FUNCTION public.get_repeat_customer_count(_shop_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM (
      SELECT phone
      FROM orders
      WHERE shop_id = _shop_id
        AND phone IS NOT NULL
        AND phone != ''
      GROUP BY phone
      HAVING COUNT(*) > 1
    ) sub
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_customer_stats(uuid, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_stats(uuid, text, int, int) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_repeat_customer_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_repeat_customer_count(uuid) TO authenticated;

-- 4) Eliminate plaintext SMTP passwords once encrypted exists
UPDATE public.email_providers
SET mail_password = NULL
WHERE encrypted_config ? 'mail_password';
